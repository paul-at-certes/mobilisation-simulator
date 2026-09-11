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
import { costPenaltySteps, effectiveWillingness } from './politics.js';

export type Strategy = (state: GameState) => TurnInput;
export type StrategyId = 'do_nothing' | 'reserves_only' | 'conscription_max_capacity' | 'conscription_over_capacity' | 'mixed' | 'max_effort';

export const STRATEGY_IDS: readonly StrategyId[] = [
  'do_nothing',
  'reserves_only',
  'conscription_max_capacity',
  'conscription_over_capacity',
  'mixed',
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

/** Would one more address lift willingness back over the refusal threshold? */
function addressClearsRefusals(s: GameState): boolean {
  const w = effectiveWillingness(s);
  return w < P.willingness_low_threshold_pct && w + P.address_willingness_boost_pct >= P.willingness_low_threshold_pct;
}

/**
 * The political levers, used the way a minister who can count would use them.
 * At most one a month, in the order the arithmetic favours: the first two
 * addresses pay (+8, +4); blaming the previous government pays once; spending
 * is raised only once the Treasury has actually started charging; and a third
 * address, which costs `pc_address_subsequent`, is taken only when it would
 * lift willingness back over the refusal threshold and so stop a standing
 * monthly penalty. An address that clears nothing is not worth the money.
 */
function politicalUpkeep(s: GameState): Action[] {
  if (!boostActive(s) && s.addressCount < 2) return [{ id: 'address_nation' }];
  if (s.blameCount === 0) return [{ id: 'blame_predecessors' }];
  if (
    !s.spendingRaised
    && costPenaltySteps(s) > 0
    && monthsLeft(s) >= RAISE_SPENDING_PAYBACK_MONTHS
    && affordable(s, P.pc_cost_raise_spending)
  ) {
    return [{ id: 'raise_spending' }];
  }
  // A clearing address pays for itself: it costs 5 once and buys three months
  // free of the refusal-cases charge, and a month free of the idle charge. The
  // safety floor does not apply to it — only not resigning over it does.
  if (
    !boostActive(s)
    && s.conscriptionEverActive
    && addressClearsRefusals(s)
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

/** A sensible mixed strategy: legislate and buy capacity first, because the pipeline is slow; reserves in parallel. */
export const mixed: Strategy = (s) => {
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
  conscription_max_capacity: conscriptionMaxCapacity,
  conscription_over_capacity: conscriptionOverCapacity,
  mixed,
  max_effort: maxEffort,
};
