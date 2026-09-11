/**
 * events.ts — the event deck (spec §10).
 *
 * `conditionVars(state)` exposes every ConditionKey an author may test.
 * `drawEvent(state)` picks at most one eligible event with a fixed number of
 * RNG draws (two when anything is eligible, one when nothing is) so the
 * sequence stays replayable. `applyEffects(state, effects)` implements every
 * Effect in types.ts, mutating the state in place and returning the PC moved
 * and machine notes for the briefing.
 *
 * Events are read from the content registry (content.ts); if events.json is
 * missing or empty the deck is simply empty and nothing ever fires.
 */
import type { ConditionKey, Effect, GameEvent, GameState, PoolKey } from '../types.js';
import { P } from './params.js';
import { getEvents } from './content.js';
import { next, pickWeighted } from './rng.js';
import { computeForce } from './effectiveness.js';
import { recomputeEligible } from './legislation.js';
import { COHORT_BACKED_POOLS, conscriptsTrained, syncDerivedPools } from './pools.js';
import { equipmentArrived } from './pipeline.js';
import { effectiveWillingness } from './politics.js';

/**
 * Chance that an event fires on a turn when at least one is eligible. One a
 * month: every turn that has something eligible shows it. Not a modelling
 * parameter (it tunes pacing, not the world), so it lives here rather than in
 * parameters.json. The fire roll is still drawn even at 1 so that lowering
 * this constant does not shift the RNG sequence for a given seed.
 */
export const EVENT_FIRE_PROBABILITY = 1;

const MEDICAL_INDEX = { peacetime: 0, relaxed: 1, wartime: 2 } as const;
const EXEMPTION_INDEX = { strict: 0, broad: 1, minimal: 2 } as const;
const BILL_INDEX = { none: 0, in_progress: 1, passed: 2 } as const;

export function conditionVars(s: GameState): Record<ConditionKey, number> {
  const force = computeForce(s);
  return {
    turn: s.turn,
    turns_remaining: s.deadlineMonths - s.turn,
    reserve_called_out: s.reserveCalledOut ? 1 : 0,
    reserve_notice: s.reserveCalledOut ? s.reserveNotice : 0,
    reserve_mobilised: s.pools.reserveVolunteerMobilised,
    ex_regular_recall_active: s.exRegularRecallActive ? 1 : 0,
    ex_regular_reported: s.pools.exRegularReported,
    strategic_traced: s.strategicTraceDone || s.strategicTraceMonth != null ? 1 : 0,
    stop_loss: s.stopLoss ? 1 : 0,
    bill_status: BILL_INDEX[s.billStatus],
    conscription_active: s.conscriptionEverActive ? 1 : 0,
    medical_standard: MEDICAL_INDEX[s.clauses.medical],
    exemptions: EXEMPTION_INDEX[s.clauses.exemptions],
    include_women: s.clauses.includeWomen ? 1 : 0,
    willingness: effectiveWillingness(s),
    capacity_purchases: s.capacityPurchases,
    civilian_instructors: s.civilianInstructors ? 1 : 0,
    syllabus_compressed: s.syllabus === 'compressed' ? 1 : 0,
    equipment_buy_active: s.equipmentOrdered ? 1 : 0,
    equipment_arrived: equipmentArrived(s) ? 1 : 0,
    holding_pool: s.pools.holdingPool,
    conscripts_in_training: s.pools.conscriptInTraining,
    conscripts_trained: conscriptsTrained(s.pools),
    cumulative_cost: s.ledger.cumulativeCost,
    cumulative_gdp_loss: s.ledger.cumulativeGdpLoss,
    political_capital: s.politicalCapital,
    force_ready: force.forceReady,
    force_ready_pct: s.target > 0 ? (force.forceReady / s.target) * 100 : 0,
    force_quality: force.forceQuality,
    leadership_factor: force.leadershipFactor,
    address_count: s.addressCount,
    blame_count: s.blameCount,
    spending_raised: s.spendingRaised ? 1 : 0,
    callup_cap: s.callupCapPerMonth ?? -1,
    vetting_priority_months: s.vettingPriorityMonth == null ? -1 : s.turn - s.vettingPriorityMonth,
    vetting_relaxed_months: s.vettingRelaxedMonth == null ? -1 : s.turn - s.vettingRelaxedMonth,
  };
}

function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '==': return a === b;
    case '>': return a > b;
    case '<': return a < b;
    case '!=': return a !== b;
    default: return false;
  }
}

/** Does this event's trigger pass against the state (turn = the turn it would show on)? */
export function eventEligible(ev: GameEvent, s: GameState, vars: Record<ConditionKey, number>): boolean {
  const t = ev.trigger ?? {};
  if (t.minTurn != null && s.turn < t.minTurn) return false;
  if (t.maxTurn != null && s.turn > t.maxTurn) return false;
  if (t.turnsRemaining != null && s.deadlineMonths - s.turn !== t.turnsRemaining) return false;
  if (!t.repeatable) {
    if (s.firedEvents.includes(ev.id)) return false;
  } else {
    const fires = s.firedEvents.filter((id) => id === ev.id).length;
    if (t.maxFires != null && fires >= t.maxFires) return false;
    if (t.cooldownMonths != null && fires > 0 && s.turn - lastFiredTurn(s, ev.id) < t.cooldownMonths) return false;
  }
  for (const c of t.conditions ?? []) {
    const v = vars[c.key];
    if (v === undefined || !compare(v, c.op, c.value)) return false;
  }
  return true;
}

/**
 * The turn a repeatable event last appeared on. Events are logged when the
 * player resolves them, on the turn they were shown, so the log is complete
 * for everything except the draw now being made.
 */
function lastFiredTurn(s: GameState, id: string): number {
  let last = -Infinity;
  for (const e of s.eventLog) if (e.eventId === id && e.turn > last) last = e.turn;
  return last;
}

export function eligibleEvents(s: GameState): GameEvent[] {
  const deck = getEvents();
  if (deck.length === 0) return [];
  const vars = conditionVars(s);
  return deck.filter((ev) => eventEligible(ev, s, vars));
}

/**
 * Draw the event to show on the state's current turn. Pure: returns the id
 * (or null) and the RNG state after the draw(s).
 */
export function drawEvent(s: GameState): { eventId: string | null; rngState: number } {
  const eligible = eligibleEvents(s);
  if (eligible.length === 0) {
    return { eventId: null, rngState: next(s.rngState).state };
  }
  const fire = next(s.rngState);
  const pick = pickWeighted(fire.state, eligible.map((e) => (typeof e.weight === 'number' ? e.weight : 1)));
  if (fire.value >= EVENT_FIRE_PROBABILITY || pick.index < 0) return { eventId: null, rngState: pick.state };
  return { eventId: eligible[pick.index].id, rngState: pick.state };
}

export function findEvent(id: string | null): GameEvent | undefined {
  if (id == null) return undefined;
  return getEvents().find((e) => e.id === id);
}

export interface EffectOutcome {
  pcDelta: number;
  notes: string[];
}

/**
 * Add `delta` people to a pool, keeping cohort-backed pools consistent by
 * scaling their cohorts pro rata. Never takes a pool below zero.
 */
export function adjustPool(s: GameState, pool: PoolKey, delta: number): number {
  const current = s.pools[pool];
  const applied = Math.max(-current, delta);
  if (applied === 0) return 0;
  if (COHORT_BACKED_POOLS.has(pool)) {
    const factor = current > 0 ? (current + applied) / current : 0;
    if (pool === 'conscriptInTraining') {
      for (const c of s.trainingCohorts) c.size *= factor;
      s.trainingCohorts = s.trainingCohorts.filter((c) => c.size > 0);
    } else if (pool === 'conscriptTrainedUnequipped' || pool === 'conscriptTrainedEquipped') {
      const equipped = pool === 'conscriptTrainedEquipped';
      for (const c of s.trainedCohorts) if (c.equipped === equipped) c.size *= factor;
      s.trainedCohorts = s.trainedCohorts.filter((c) => c.size > 0);
    } else if (pool === 'reserveVolunteerPending') {
      for (const r of s.reserveArrivals) r.size *= factor;
      s.reserveArrivals = s.reserveArrivals.filter((r) => r.size > 0);
    }
    syncDerivedPools(s);
  } else {
    s.pools[pool] = current + applied;
  }
  return applied;
}

export function applyEffects(s: GameState, effects: readonly Effect[]): EffectOutcome {
  const out: EffectOutcome = { pcDelta: 0, notes: [] };
  for (const e of effects ?? []) applyEffect(s, e, out);
  return out;
}

function applyEffect(s: GameState, e: Effect, out: EffectOutcome): void {
  switch (e.type) {
    case 'pc':
      s.politicalCapital += e.delta;
      out.pcDelta += e.delta;
      break;
    case 'willingness':
      if (e.durationMonths != null && e.durationMonths > 0) {
        s.willingnessBoosts.push({ delta: e.delta, until: s.turn + e.durationMonths });
      } else {
        s.willingness += e.delta;
      }
      out.notes.push(`willingness:${e.delta}`);
      break;
    case 'pool': {
      const applied = adjustPool(s, e.pool, e.delta);
      out.notes.push(`pool:${e.pool}:${applied}`);
      break;
    }
    case 'pool_pct': {
      const applied = adjustPool(s, e.pool, (s.pools[e.pool] * e.pct) / 100);
      out.notes.push(`pool:${e.pool}:${applied}`);
      break;
    }
    case 'reserve_arrival_shift':
      for (const r of s.reserveArrivals) r.arrivalMonth = Math.max(s.turn + 1, r.arrivalMonth + e.months);
      out.notes.push(`reserve_arrival_shift:${e.months}`);
      break;
    case 'reserve_deployable_fraction_add': {
      const before = s.reserveDeployableFraction;
      const after = Math.min(1, Math.max(0, before + e.delta));
      s.reserveDeployableFraction = after;
      if (s.reserveCalledOut && before > 0) {
        // Rescale what is still pending so Available + Pending + Mobilised is conserved.
        const pendingBefore = s.pools.reserveVolunteerPending;
        const pendingAfter = pendingBefore * (after / before);
        const move = Math.min(pendingAfter - pendingBefore, s.pools.reserveVolunteerAvailable);
        const factor = pendingBefore > 0 ? (pendingBefore + move) / pendingBefore : 0;
        for (const r of s.reserveArrivals) r.size *= factor;
        s.pools.reserveVolunteerAvailable -= move;
        syncDerivedPools(s);
      }
      out.notes.push(`reserve_deployable_fraction:${after}`);
      break;
    }
    case 'ex_regular_ceiling_add':
      s.exRegularCeiling = Math.min(1, Math.max(0, s.exRegularCeiling + e.delta));
      out.notes.push(`ex_regular_ceiling:${s.exRegularCeiling}`);
      break;
    case 'trace_strategic':
      if (!s.strategicTraceDone && s.strategicTraceMonth == null) {
        s.strategicTraceMonth = s.turn + P.strategic_trace_delay_months;
        out.notes.push(`trace_strategic:${s.strategicTraceMonth}`);
      }
      break;
    case 'capacity_purchases': {
      const n = Math.trunc(e.delta);
      if (n > 0) {
        // Gifted capacity: active at once, no £ and no leaders diverted.
        for (let i = 0; i < n; i++) s.capacityPurchaseMonths.push(s.turn);
        s.capacityPurchases += n;
      } else if (n < 0) {
        // Stand down the most recent purchases and return their instructors.
        const remove = Math.min(-n, s.capacityPurchaseMonths.length);
        s.capacityPurchaseMonths.sort((a, b) => a - b);
        s.capacityPurchaseMonths.splice(s.capacityPurchaseMonths.length - remove, remove);
        s.capacityPurchases = Math.max(0, s.capacityPurchases - remove);
        const returned = Math.min(remove * P.leaders_per_capacity_purchase, s.ledger.juniorLeadersDiverted);
        s.ledger.juniorLeadersDiverted -= returned;
        s.pools.regularTrained += returned;
      }
      out.notes.push(`capacity_purchases:${n}`);
      break;
    }
    case 'capacity_multiplier':
      s.capacityMultiplier = e.factor;
      s.capacityMultiplierUntil = e.durationMonths != null && e.durationMonths > 0 ? s.turn + e.durationMonths : null;
      out.notes.push(`capacity_multiplier:${e.factor}`);
      break;
    case 'leaders_spareable_add':
      s.leadersSpareableAdjust += e.delta;
      out.notes.push(`leaders_spareable_add:${e.delta}`);
      break;
    case 'medical_standard':
      s.clauses.medical = e.standard;
      if (s.billStatus === 'passed') recomputeEligible(s);
      out.notes.push(`medical_standard:${e.standard}`);
      break;
    case 'exemptions':
      s.clauses.exemptions = e.regime;
      if (s.billStatus === 'passed') recomputeEligible(s);
      out.notes.push(`exemptions:${e.regime}`);
      break;
    case 'eligible_pool_pct':
      s.eligiblePoolMultiplier = Math.max(0, s.eligiblePoolMultiplier * (1 + e.pct / 100));
      if (s.billStatus === 'passed') recomputeEligible(s);
      out.notes.push(`eligible_pool_pct:${e.pct}`);
      break;
    case 'callup_cap': {
      const cap = Math.max(0, e.perMonth);
      const until = e.durationMonths != null && e.durationMonths > 0 ? s.turn + e.durationMonths : null;
      // A second congestion does not undo the first: keep the tighter ceiling,
      // and the later expiry of the two.
      if (s.callupCapPerMonth == null || cap < s.callupCapPerMonth) s.callupCapPerMonth = cap;
      if (s.callupCapUntil != null && until != null) s.callupCapUntil = Math.max(s.callupCapUntil, until);
      else s.callupCapUntil = until;
      out.notes.push(`callup_cap:${s.callupCapPerMonth}:${s.callupCapUntil ?? 'indefinite'}`);
      break;
    }
    case 'vetting_priority':
      s.vettingPriorityMonth = e.military ? s.turn : null;
      out.notes.push(`vetting_priority:${e.military ? 'military' : 'shared'}`);
      break;
    case 'vetting_relax':
      s.vettingRelaxedMonth = e.relaxed ? s.turn : null;
      out.notes.push(`vetting_relax:${e.relaxed ? 'relaxed' : 'restored'}`);
      break;
    case 'equipment_delay':
      if (s.equipmentArrivalMonth != null && s.equipmentArrivalMonth > s.turn) {
        s.equipmentArrivalMonth = Math.max(s.turn + 1, s.equipmentArrivalMonth + e.months);
        out.notes.push(`equipment_delay:${e.months}`);
      }
      break;
    case 'cost':
      s.ledger.costBreakdown.other += Math.max(0, e.gbp);
      out.notes.push(`cost:${e.gbp}`);
      break;
    case 'flag':
      s.flags[e.flag] = e.value;
      break;
    case 'scoring_pc_if_missed':
      s.scoringPcIfMissed += e.delta;
      out.notes.push(`scoring_pc_if_missed:${e.delta}`);
      break;
    case 'end_game':
      s.over = true;
      s.overReason = 'event';
      out.notes.push(`end_game:${e.reason}`);
      break;
    case 'random': {
      const r = next(s.rngState);
      s.rngState = r.state;
      const branch = r.value < e.chance ? e.then : e.else;
      for (const sub of branch ?? []) applyEffect(s, sub, out);
      break;
    }
    default:
      out.notes.push(`unknown_effect:${(e as { type?: string }).type ?? '?'}`);
  }
}
