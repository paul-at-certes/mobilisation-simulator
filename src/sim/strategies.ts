/**
 * strategies.ts — the scripted strategies used by the CLI runner and the
 * tests (spec §13). Each is a pure function `(state) => TurnInput`.
 *
 * Event choices: every strategy picks choice 0 (or null for informational
 * events) — see `defaultEventChoice`.
 */
import type { Action, BillClauses, GameState, TurnInput } from '../types.js';
import { findEvent } from './events.js';
import { spareIntake } from './pipeline.js';

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
  return [{ id: 'set_callup', perMonth: spareIntake(s) }];
}

export const doNothing: Strategy = (s) => input(s, []);

export const reservesOnly: Strategy = (s) => {
  const actions: Action[] = [];
  if (s.turn === 0) actions.push({ id: 'call_out_reserve', notice: 90 }, { id: 'recall_ex_regular' });
  else if (s.turn === 1) actions.push({ id: 'trace_strategic_reserve' }, { id: 'stop_loss' });
  else if (s.politicalCapital < LOW_PC_ADDRESS_THRESHOLD && s.addressCount < 2) actions.push({ id: 'address_nation' });
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
  if (s.billStatus === 'passed') actions.push({ id: 'set_callup', perMonth: OVER_CAPACITY_CALLUP });
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
  else if (s.conscriptionEverActive && !boostActive(s)) actions.push({ id: 'address_nation' });
  actions.push(...callupAtCapacity(s));
  return input(s, actions);
};

function boostActive(s: GameState): boolean {
  return s.willingnessBoosts.some((b) => b.until >= s.turn + 1);
}

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
  else if (s.turn === 8) actions.push({ id: 'raise_spending' });
  else {
    if (s.conscriptionEverActive && !boostActive(s)) actions.push({ id: 'address_nation' });
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
