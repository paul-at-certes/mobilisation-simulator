/**
 * strategies.ts — the scripted strategies used by the CLI runner and the
 * tests (spec §13). Each is a pure function `(state) => TurnInput`.
 *
 * Event choices: every strategy picks choice 0 (or null for informational
 * events) — see `defaultEventChoice`.
 */
import type { Action, BillClauses, GameState, TurnInput } from '../types.js';
import { P } from './params.js';
import { findEvent } from './events.js';
import { spareIntake } from './pipeline.js';
import { costPenaltySteps, costPenaltyThreshold, effectiveWillingness, idleMonths } from './politics.js';
import { refusalRate } from './legislation.js';

export type Strategy = (state: GameState) => TurnInput;
export type StrategyId = 'do_nothing' | 'reserves_only' | 'reserves_plus_light' | 'conscription_max_capacity' | 'conscription_over_capacity' | 'capacity_heavy' | 'max_effort';

export const STRATEGY_IDS: readonly StrategyId[] = [
  'do_nothing',
  'reserves_only',
  'reserves_plus_light',
  'conscription_max_capacity',
  'conscription_over_capacity',
  'capacity_heavy',
  'max_effort',
];

/** Choice 0 when the pending event offers choices, otherwise null. */
export function defaultEventChoice(s: GameState): number | null {
  const ev = findEvent(s.pendingEvent);
  return ev && ev.choices && ev.choices.length > 0 ? 0 : null;
}

const STANDARD_CLAUSES: BillClauses = { ageBand: '18-30', includeWomen: true, medical: 'relaxed', exemptions: 'broad' };

/** Over-capacity scripted call-up (a strategy constant, not a modelling parameter). */
export const OVER_CAPACITY_CALLUP = 20_000;

/** Address-the-nation trigger for reserves_only (a strategy constant). */
export const LOW_PC_ADDRESS_THRESHOLD = 30;

function input(s: GameState, actions: Action[]): TurnInput {
  return { actions, eventChoice: defaultEventChoice(s) };
}

/** The free call-up control: set to spare training intake once the Bill has passed. */
function callupAtCapacity(s: GameState): Action[] {
  if (s.billStatus !== 'passed') return [];
  const perMonth = spareIntake(s);
  // Re-entering the figure already in force is not a decision, and the
  // simulation does not count it as one (spec §9). No minister would spend a
  // month on it, so neither does a strategy.
  return perMonth === s.callupPerMonth ? [] : [{ id: 'set_callup', perMonth }];
}

function boostActive(s: GameState): boolean {
  return s.willingnessBoosts.some((b) => b.until >= s.turn + 1);
}

/**
 * Raising spending costs political capital now to halve a monthly charge
 * later, so a strategy only takes it with enough months left to pay it back.
 */
export const RAISE_SPENDING_PAYBACK_MONTHS = 4;

/**
 * Political capital a strategy keeps in hand for discretionary levers.
 * Resignation is at zero and an event can take six in a month, so a minister
 * who can count does not spend the last of it on something optional.
 */
export const PC_SAFETY_FLOOR = 12;

function monthsLeft(s: GameState): number {
  return s.deadlineMonths - s.turn;
}

function affordable(s: GameState, pcDelta: number): boolean {
  return s.politicalCapital + pcDelta >= PC_SAFETY_FLOOR;
}

/**
 * Is spending the Equipment Plan's contingency the better buy?
 *
 * It takes `equipment_plan_contingency` off the bill the Treasury counts and
 * costs no political capital now, but every later step then costs
 * `contingency_drawn_penalty_add` more — so it wins on a small programme and
 * loses on a large one. A strategy compares the two against the spend it is
 * heading for rather than the spend it has, because the penalty it is buying
 * is paid at the end, not now.
 */
function contingencyPaysOff(s: GameState): boolean {
  if (s.contingencyDrawn) return false;
  // An order in flight would slip; wait for it to land, which costs nothing.
  if (s.equipmentArrivalMonth != null && s.equipmentArrivalMonth > s.turn) return false;
  const threshold = costPenaltyThreshold(s);
  const projected = s.ledger.cumulativeCost + s.ledger.monthlyCost * monthsLeft(s);
  const asIs = P.cost_pc_penalty_per_step * Math.floor(projected / threshold);
  const drawn =
    (P.cost_pc_penalty_per_step + P.contingency_drawn_penalty_add)
    * Math.floor(Math.max(0, projected - P.equipment_plan_contingency) / threshold);
  return drawn < asIs;
}

/**
 * Does one more address pay for itself in refusals avoided?
 *
 * An address lifts willingness for `address_willingness_months`, which lowers
 * the refusal rate and so the monthly charge (§9). Before F15 this was a
 * threshold question — would the boost cross the line at which a flat penalty
 * switched off — and the bot could answer it by comparing two numbers. Now the
 * charge is proportional, so the bot is given the arithmetic instead: what the
 * boost saves over its life, against what the address costs. A minister
 * calling up nobody saves nothing.
 */
function addressPaysForItself(s: GameState): boolean {
  const called = Math.min(
    Math.max(0, s.callupPerMonth),
    s.callupCapPerMonth ?? Infinity,
    s.pools.conscriptEligible,
  );
  if (!(called > 0)) return false;
  const lifted: GameState = {
    ...s,
    willingnessBoosts: [
      ...s.willingnessBoosts,
      { delta: P.address_willingness_boost_pct, until: s.turn + P.address_willingness_months },
    ],
  };
  // In expectation, not in whole points: the caseload carries its remainder
  // forward, so a tenth fewer refusals really is a tenth fewer points charged,
  // and rounding the comparison would hide exactly the effect being bought.
  const saved = (called * refusalRate(s) - called * refusalRate(lifted)) / P.pc_refusal_per_charge;
  const months = Math.min(P.address_willingness_months, monthsLeft(s));
  return saved * months > -P.pc_address_subsequent;
}

/**
 * The political levers, used the way a minister who can count would use them.
 * At most one a month, in the order the arithmetic favours: the first two
 * addresses pay (+8, +4); blaming the previous government pays once; spending
 * is raised only once the Treasury has actually started charging; and a third
 * address, which costs `pc_address_subsequent`, is taken when the refusal
 * charge it avoids over the boost's life is worth more than it costs, or when
 * it stops the charge for a government seen to be doing nothing. An address
 * that saves neither is not worth the money.
 */
function politicalUpkeep(s: GameState): Action[] {
  if (!boostActive(s) && s.addressCount < 2) return [{ id: 'address_nation' }];
  if (s.blameCount === 0) return [{ id: 'blame_predecessors' }];
  // Free money before expensive money: the contingency clears Treasury pressure
  // at no cost in capital, where raising spending costs six.
  if (costPenaltySteps(s) > 0 && contingencyPaysOff(s)) return [{ id: 'draw_contingency' }];
  if (
    !s.spendingRaised
    && costPenaltySteps(s) > 0
    && monthsLeft(s) >= RAISE_SPENDING_PAYBACK_MONTHS
    && affordable(s, P.pc_cost_raise_spending)
  ) {
    return [{ id: 'raise_spending' }];
  }
  // A third address is bought when the refusals it avoids are worth more than
  // it costs, or when the government is one month away from being charged for
  // doing nothing — an address is the only repeatable action, so it is the only
  // way to stop that clock. Before F15 the first test carried the second by
  // accident: the address that cleared the willingness threshold also reset the
  // idle count, and dropping the threshold cost the bot four idle months a run
  // at Corps until this was made explicit. The safety floor does not apply to
  // either — only not resigning over it does.
  // Both tests are gated on a conscription programme existing, which is the
  // scope the threshold rule had. Widening it would make every strategy play
  // better — `reserves_only` at Corps goes from 38% resignations to 15% on the
  // idle test alone — and that is a change to the instrument, not to the game.
  // It belongs in its own pass, measured on its own (design review F16).
  const stopsIdleCharge = idleMonths(s) >= P.pc_idle_grace_months;
  if (
    !boostActive(s)
    && s.conscriptionEverActive
    && (stopsIdleCharge || addressPaysForItself(s))
    && s.politicalCapital + P.pc_address_subsequent > 0
  ) {
    return [{ id: 'address_nation' }];
  }
  return [];
}

export const doNothing: Strategy = (s) => input(s, []);

export const reservesOnly: Strategy = (s) => {
  const actions: Action[] = [];
  if (s.turn === 0) actions.push({ id: 'call_out_reserve', notice: 90 }, { id: 'recall_ex_regular' });
  else if (s.turn === 1) actions.push({ id: 'trace_strategic_reserve' }, { id: 'stop_loss' });
  else if (s.politicalCapital < LOW_PC_ADDRESS_THRESHOLD) actions.push(...politicalUpkeep(s));
  return input(s, actions);
};

/**
 * **The sensible strategy** — the brief's criterion (d) is measured against
 * this one.
 *
 * The reserves in full, then the smallest conscript programme that can
 * graduate before the deadline: one capacity purchase, the civilian
 * instructors who cost no junior leaders, a compressed syllabus and the
 * equipment to make the graduates count.
 *
 * It holds that title because of what the derived leadership ratio did to the
 * balance (DECISIONS.md, 11 September 2026). Every leader teaching is a leader
 * not leading, and the discount falls on the ex-regulars and Strategic
 * Reservists already fielded as well as on the conscripts the purchase
 * produces — so a little conscription pays and a lot of it does not. This is
 * the best-performing strategy at Division and the one that meets the target;
 * `capacity_heavy` and `max_effort` are now the two worst.
 */
export const reservesPlusLight: Strategy = (s) => {
  const actions: Action[] = [];
  if (s.turn === 0) actions.push({ id: 'call_out_reserve', notice: 90 }, { id: 'recall_ex_regular' });
  else if (s.turn === 1) actions.push({ id: 'introduce_bill', procedure: 'emergency', clauses: STANDARD_CLAUSES }, { id: 'trace_strategic_reserve' });
  else if (s.turn === 2) actions.push({ id: 'compress_syllabus' }, { id: 'contract_civilian_instructors' });
  else if (s.turn === 3) actions.push({ id: 'expand_capacity' }, { id: 'equipment_buy' });
  else if (s.turn === 4) actions.push({ id: 'stop_loss' });
  else actions.push(...politicalUpkeep(s));
  actions.push(...callupAtCapacity(s));
  return input(s, actions);
};

/**
 * Two slots a turn means the spec's "expand ×2 on turns 1–3 and compress at
 * turn 1" cannot all fit; compression takes one of turn 1's slots and the
 * fourth purchase lands on turn 3 alongside the civilian contract.
 */
export const conscriptionMaxCapacity: Strategy = (s) => {
  const actions: Action[] = [];
  if (s.turn === 0) {
    actions.push({ id: 'introduce_bill', procedure: 'emergency', clauses: STANDARD_CLAUSES }, { id: 'equipment_buy' });
  } else if (s.turn === 1) {
    actions.push({ id: 'compress_syllabus' }, { id: 'expand_capacity' });
  } else if (s.turn === 2) {
    actions.push({ id: 'expand_capacity' }, { id: 'expand_capacity' });
  } else if (s.turn === 3) {
    actions.push({ id: 'expand_capacity' }, { id: 'contract_civilian_instructors' });
  }
  actions.push(...callupAtCapacity(s));
  return input(s, actions);
};

export const conscriptionOverCapacity: Strategy = (s) => {
  const actions: Action[] = [];
  if (s.turn === 0) {
    actions.push({ id: 'introduce_bill', procedure: 'emergency', clauses: STANDARD_CLAUSES }, { id: 'equipment_buy' });
  } else if (s.turn === 1) {
    actions.push({ id: 'compress_syllabus' }, { id: 'expand_capacity' });
  } else if (s.turn === 2) {
    actions.push({ id: 'contract_civilian_instructors' });
  }
  if (s.billStatus === 'passed' && s.callupPerMonth !== OVER_CAPACITY_CALLUP) {
    actions.push({ id: 'set_callup', perMonth: OVER_CAPACITY_CALLUP });
  }
  return input(s, actions);
};

/**
 * Reserves in parallel with a substantial training-capacity programme: three
 * purchases, the bill, equipment.
 *
 * Named `mixed` until 11 September 2026, when it was the intended sensible
 * play. Under the derived leadership ratio it is not: the three purchases take
 * 1,875 junior leaders out of the field force and the resulting factor of
 * about 0.6 is charged against everything raised. It is kept as the control
 * for a plausible-looking programme that over-buys capacity — the failure mode
 * a minister is most likely to walk into, because every individual purchase
 * reads as progress.
 */
export const capacityHeavy: Strategy = (s) => {
  const actions: Action[] = [];
  if (s.turn === 0) actions.push({ id: 'introduce_bill', procedure: 'emergency', clauses: STANDARD_CLAUSES }, { id: 'call_out_reserve', notice: 90 });
  else if (s.turn === 1) actions.push({ id: 'expand_capacity' }, { id: 'recall_ex_regular' });
  else if (s.turn === 2) actions.push({ id: 'expand_capacity' }, { id: 'compress_syllabus' });
  else if (s.turn === 3) actions.push({ id: 'equipment_buy' }, { id: 'address_nation' });
  else if (s.turn === 4) actions.push({ id: 'stop_loss' }, { id: 'expand_capacity' });
  else if (s.turn === 5) actions.push({ id: 'trace_strategic_reserve' }, { id: 'blame_predecessors' });
  else actions.push(...politicalUpkeep(s));
  actions.push(...callupAtCapacity(s));
  return input(s, actions);
};

/** Everything, paced: the ceiling of what the levers can deliver. */
export const MAX_EFFORT_PURCHASES = 8;
export const maxEffort: Strategy = (s) => {
  const actions: Action[] = [];
  const pc = s.politicalCapital;
  if (s.turn === 0) actions.push({ id: 'introduce_bill', procedure: 'emergency', clauses: STANDARD_CLAUSES }, { id: 'call_out_reserve', notice: 90 });
  else if (s.turn === 1) actions.push({ id: 'expand_capacity' }, { id: 'expand_capacity' });
  else if (s.turn === 2) actions.push({ id: 'compress_syllabus' }, { id: 'recall_ex_regular' });
  else if (s.turn === 3) actions.push({ id: 'equipment_buy' }, { id: 'address_nation' });
  else if (s.turn === 4) actions.push({ id: 'expand_capacity' }, { id: 'expand_capacity' });
  else if (s.turn === 5) actions.push({ id: 'stop_loss' }, { id: 'blame_predecessors' });
  else if (s.turn === 6) actions.push({ id: 'contract_civilian_instructors' }, { id: 'address_nation' });
  else if (s.turn === 7) actions.push({ id: 'trace_strategic_reserve' }, { id: 'expand_capacity' });
  else {
    actions.push(...politicalUpkeep(s));
    if (s.capacityPurchases < MAX_EFFORT_PURCHASES && s.gauges.leadershipFactor > 0.85 && pc > 20 && s.turn % 3 === 0) actions.push({ id: 'expand_capacity' });
  }
  actions.push(...callupAtCapacity(s));
  return input(s, actions);
};

export const STRATEGIES: Record<StrategyId, Strategy> = {
  do_nothing: doNothing,
  reserves_only: reservesOnly,
  reserves_plus_light: reservesPlusLight,
  conscription_max_capacity: conscriptionMaxCapacity,
  conscription_over_capacity: conscriptionOverCapacity,
  capacity_heavy: capacityHeavy,
  max_effort: maxEffort,
};
