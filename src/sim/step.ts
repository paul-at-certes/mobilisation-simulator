/**
 * step.ts — the turn function (spec §2) plus `newGame` and `derive`.
 *
 * `step(state, input)` is pure: it clones the state, resolves the pending
 * event, applies the turn's actions, advances one month through the
 * pipeline, settles money and politics, derives the gauges and draws the
 * next event. No DOM, no Math.random, no Date.
 */
import { FREE_ACTIONS } from '../types.js';
import type { Difficulty, GameState, Ledger, TrainingCohort, TurnInput } from '../types.js';
import { P } from './params.js';
import { seedFromString, next, uniform } from './rng.js';
import { emptyPools, syncDerivedPools } from './pools.js';
import { computeForce } from './effectiveness.js';
import { incrementalCost, monthlyCostBreakdown, monthlyGdpLoss } from './money.js';
import { expireWillingnessBoosts, idleMonths, monthlyPcChanges, type PcReason } from './politics.js';
import { applyAction, isActionAvailable, ACTION_LABELS } from './actions.js';
import { advanceBillClock } from './legislation.js';
import { cohortAttrition, courseMonths, equipmentArrived, spareIntake } from './pipeline.js';
import { applyEffects, drawEvent, findEvent } from './events.js';

const DIFFICULTIES: readonly Difficulty[] = ['brigade', 'division', 'corps'];

function difficultyTarget(d: Difficulty): number {
  return d === 'brigade' ? P.target_brigade : d === 'division' ? P.target_division : P.target_corps;
}

function difficultyDeadline(d: Difficulty): number {
  return d === 'brigade' ? P.deadline_brigade : d === 'division' ? P.deadline_division : P.deadline_corps;
}

function emptyLedger(): Ledger {
  return {
    cumulativeCost: 0,
    cumulativeGdpLoss: 0,
    monthlyCost: 0,
    monthlyGdpLoss: 0,
    costBreakdown: {
      regularPay: 0,
      conscriptPay: 0,
      conscriptTraining: 0,
      reservistPay: 0,
      equipment: 0,
      capacity: 0,
      civilianInstructors: 0,
      other: 0,
    },
    regularOutflowToDate: 0,
    juniorLeadersLostToOutflow: 0,
    juniorLeadersDiverted: 0,
  };
}

export function newGame(seed: number | string, difficulty: Difficulty): GameState {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`Unknown difficulty: ${difficulty}`);
  const seedValue = seedFromString(seed);
  const pools = emptyPools();
  pools.regularTrained = P.regular_trained_start;
  pools.regularUntrained = P.regular_untrained_start;
  pools.reserveVolunteerAvailable = P.reserve_volunteer_trained;
  pools.exRegularTracked = P.ex_regular_tracked;
  pools.strategicUntracked = P.strategic_reserve_untracked;

  const s: GameState = {
    version: 1,
    seed: seedValue,
    rngState: seedValue,
    difficulty,
    target: difficultyTarget(difficulty),
    deadlineMonths: difficultyDeadline(difficulty),
    turn: 0,
    over: false,
    pools,
    trainingCohorts: [],
    trainedCohorts: [],
    reserveArrivals: [],
    reserveCalledOut: false,
    reserveNotice: 0,
    reserveDeployableFraction: P.reserve_volunteer_deployable_fraction,
    exRegularRecallActive: false,
    exRegularRecallMonth: 0,
    exRegularCeiling: P.ex_regular_report_ceiling,
    strategicTraceMonth: null,
    strategicTraceDone: false,
    stopLoss: false,
    billStatus: 'none',
    billPassesMonth: null,
    clauses: { ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' },
    callupPerMonth: 0,
    conscriptionEverActive: false,
    conscriptsCalledTotal: 0,
    eligiblePoolMultiplier: 1,
    capacityPurchases: 0,
    capacityPurchaseMonths: [],
    capacityMultiplier: 1,
    capacityMultiplierUntil: null,
    civilianInstructors: false,
    civilianInstructorsMonth: null,
    syllabus: 'normal',
    equipmentOrdered: false,
    equipmentArrivalMonth: null,
    juniorEntryTaken: false,
    leadersSpareableAdjust: 0,
    politicalCapital: P.pc_start,
    willingness: P.willingness_start_pct,
    willingnessBoosts: [],
    addressCount: 0,
    idleMonths: 0,
    blameCount: 0,
    spendingRaised: false,
    scoringPcIfMissed: 0,
    flags: {},
    firedEvents: [],
    pendingEvent: null,
    eventLog: [],
    ledger: emptyLedger(),
    gauges: { forceReady: 0, forceReadyPct: 0, forceQuality: 0, politicalCapital: P.pc_start, leadershipFactor: 1, headcountCounted: 0 },
    composition: {
      regulars: { headcount: 0, ese: 0 },
      reservists: { headcount: 0, ese: 0 },
      exRegulars: { headcount: 0, ese: 0 },
      strategic: { headcount: 0, ese: 0 },
      conscripts: { headcount: 0, ese: 0 },
    },
    briefing: emptyBriefing(0, 1),
    history: [],
  };
  deriveInto(s);
  s.briefing.leadershipFactor = s.gauges.leadershipFactor;
  s.history.push(historyEntry(s));
  drawPendingEvent(s);
  return s;
}

function emptyBriefing(turn: number, leadershipFactor: number): GameState['briefing'] {
  return {
    turn,
    forceReadyDelta: 0,
    forceQualityDelta: 0,
    pcDelta: 0,
    pcReasons: [],
    arrivals: [],
    graduations: 0,
    outflow: 0,
    holdingPoolDelta: 0,
    leadershipFactor,
    notes: [],
  };
}

function historyEntry(s: GameState): GameState['history'][number] {
  return {
    turn: s.turn,
    gauges: { ...s.gauges },
    ledger: { cumulativeCost: s.ledger.cumulativeCost, cumulativeGdpLoss: s.ledger.cumulativeGdpLoss },
  };
}

/** Recompute gauges and composition in place from the pools and cohorts. */
function deriveInto(s: GameState): void {
  syncDerivedPools(s);
  const f = computeForce(s);
  s.gauges = {
    forceReady: f.forceReady,
    forceReadyPct: s.target > 0 ? (f.forceReady / s.target) * 100 : 0,
    forceQuality: f.forceQuality,
    politicalCapital: s.politicalCapital,
    leadershipFactor: f.leadershipFactor,
    headcountCounted: f.headcountCounted,
  };
  s.composition = f.composition;
}

/** Pure: returns a copy of the state with gauges and composition recomputed. */
export function derive(state: GameState): GameState {
  const s = structuredClone(state);
  deriveInto(s);
  return s;
}

function drawPendingEvent(s: GameState): void {
  const d = drawEvent(s);
  s.rngState = d.rngState;
  s.pendingEvent = d.eventId;
  if (d.eventId != null) s.firedEvents.push(d.eventId);
}

// ---------------------------------------------------------------------------
// The turn
// ---------------------------------------------------------------------------

export function step(state: GameState, input: TurnInput): GameState {
  const s = structuredClone(state);
  if (s.over) {
    s.briefing = { ...emptyBriefing(s.turn, s.gauges.leadershipFactor), notes: ['game_over'] };
    return s;
  }
  const pcAtStart = s.politicalCapital;
  const previousForceReady = s.gauges.forceReady;
  const previousQuality = s.gauges.forceQuality;
  const holdingAtStart = s.pools.holdingPool;
  const notes: string[] = [];
  const pcReasons: PcReason[] = [];
  const arrivals: { label: string; count: number }[] = [];

  // One-off £ accumulators for this turn (folded into the month's cost at 3i).
  s.ledger.costBreakdown.capacity = 0;
  s.ledger.costBreakdown.other = 0;

  // 1. Resolve the pending event.
  resolvePendingEvent(s, input?.eventChoice ?? null, pcReasons, notes);
  if (s.over) {
    finishStep(s, pcAtStart, previousForceReady, previousQuality, holdingAtStart, pcReasons, arrivals, 0, 0, notes);
    return s;
  }

  // 2. Actions. A month in which the minister pulls no lever at all is counted:
  // a government seen to be doing nothing loses political capital for it (§9).
  const applied = applyTurnActions(s, input?.actions ?? [], pcReasons, notes);
  s.idleMonths = applied > 0 ? 0 : idleMonths(s) + 1;
  if (s.idleMonths > P.pc_idle_grace_months) notes.push(`idle_months:${s.idleMonths}`);

  // 3. Advance one month.
  s.turn += 1;
  const month = advanceMonth(s, arrivals, notes);

  // 4. Politics.
  expireWillingnessBoosts(s);
  const forceNow = computeForce(s).forceReady;
  for (const r of monthlyPcChanges(s, forceNow, previousForceReady)) {
    s.politicalCapital += r.delta;
    pcReasons.push(r);
  }

  // 5–7. Derive, game-over checks, next event.
  finishStep(s, pcAtStart, previousForceReady, previousQuality, holdingAtStart, pcReasons, arrivals, month.graduations, month.outflow, notes);
  return s;
}

function finishStep(
  s: GameState,
  pcAtStart: number,
  previousForceReady: number,
  previousQuality: number,
  holdingAtStart: number,
  pcReasons: PcReason[],
  arrivals: { label: string; count: number }[],
  graduations: number,
  outflow: number,
  notes: string[],
): void {
  deriveInto(s);
  s.briefing = {
    turn: s.turn,
    forceReadyDelta: s.gauges.forceReady - previousForceReady,
    forceQualityDelta: s.gauges.forceQuality - previousQuality,
    pcDelta: s.politicalCapital - pcAtStart,
    pcReasons,
    arrivals,
    graduations,
    outflow,
    holdingPoolDelta: s.pools.holdingPool - holdingAtStart,
    leadershipFactor: s.gauges.leadershipFactor,
    notes,
  };
  s.history.push(historyEntry(s));
  if (!s.over) {
    if (s.politicalCapital < 0) {
      s.over = true;
      s.overReason = 'resigned';
    } else if (s.turn >= s.deadlineMonths) {
      s.over = true;
      s.overReason = 'deadline';
    }
  }
  if (s.over) s.pendingEvent = null;
  else drawPendingEvent(s);
}

function resolvePendingEvent(s: GameState, choice: number | null, pcReasons: PcReason[], notes: string[]): void {
  const id = s.pendingEvent;
  s.pendingEvent = null;
  if (id == null) return;
  const ev = findEvent(id);
  if (!ev) {
    notes.push(`event_missing:${id}`);
    s.eventLog.push({ turn: s.turn, eventId: id, choice: null });
    return;
  }
  let chosen: number | null = null;
  if (ev.choices && ev.choices.length > 0) {
    chosen = choice == null || !Number.isInteger(choice) ? 0 : Math.min(Math.max(0, choice), ev.choices.length - 1);
    if (chosen !== choice) notes.push(`event_choice_defaulted:${id}`);
    const out = applyEffects(s, ev.choices[chosen].effects ?? []);
    if (out.pcDelta !== 0) pcReasons.push({ label: `Event: ${ev.title} (${ev.choices[chosen].label})`, delta: out.pcDelta });
    notes.push(...out.notes.map((n) => `event:${id}:${n}`));
  }
  s.eventLog.push({ turn: s.turn, eventId: id, choice: chosen });
  syncDerivedPools(s);
}

/** Applies the turn's actions and returns how many of them actually landed. */
function applyTurnActions(s: GameState, actions: readonly unknown[], pcReasons: PcReason[], notes: string[]): number {
  let slotsUsed = 0;
  let applied = 0;
  for (const raw of actions) {
    const action = raw as { id?: string } & Record<string, unknown>;
    const id = action?.id;
    if (typeof id !== 'string' || !isKnownAction(id)) {
      notes.push(`action_unknown:${String(id)}`);
      continue;
    }
    const free = FREE_ACTIONS.has(id);
    if (!free && slotsUsed >= P.actions_per_turn) {
      notes.push(`action_no_slot:${id}`);
      continue;
    }
    if (!isActionAvailable(s, id)) {
      notes.push(`action_unavailable:${id}`);
      continue;
    }
    const pcBefore = s.politicalCapital;
    const callupBefore = s.callupPerMonth;
    const result = applyAction(s, raw as Parameters<typeof applyAction>[1]);
    if (!result.ok) {
      notes.push(`action_rejected:${id}:${result.reason ?? ''}`);
      continue;
    }
    if (!free) slotsUsed += 1;
    // A free action counts as pulling a lever only when it changes something:
    // re-entering the same call-up figure is not a month's work.
    if (!free || s.callupPerMonth !== callupBefore) applied += 1;
    const delta = s.politicalCapital - pcBefore;
    if (delta !== 0) pcReasons.push({ label: ACTION_LABELS[id] ?? `Action: ${id}`, delta });
    notes.push(`action:${id}`);
  }
  return applied;
}

function isKnownAction(id: string): id is Parameters<typeof isActionAvailable>[1] {
  return (
    [
      'call_out_reserve', 'recall_ex_regular', 'trace_strategic_reserve', 'stop_loss', 'introduce_bill', 'amend_bill',
      'set_callup', 'expand_capacity', 'compress_syllabus', 'contract_civilian_instructors', 'junior_entry',
      'equipment_buy', 'address_nation', 'raise_spending', 'blame_predecessors',
    ] as string[]
  ).includes(id);
}

interface MonthOutcome {
  graduations: number;
  outflow: number;
}

/** 3a–3j: one calendar month of the pipeline, money and GDP. `s.turn` is already incremented. */
function advanceMonth(s: GameState, arrivals: { label: string; count: number }[], notes: string[]): MonthOutcome {
  // a. Legislation.
  if (advanceBillClock(s)) notes.push(`bill_passed:${s.turn}`);

  // b. Capacity multiplier expiry (purchases/instructors come online by month comparison).
  if (s.capacityMultiplierUntil != null && s.capacityMultiplierUntil < s.turn) {
    s.capacityMultiplier = 1;
    s.capacityMultiplierUntil = null;
  }

  // c. Equipment arrival: flip every trained cohort.
  let newlyEquipped = 0;
  const equipped = equipmentArrived(s);
  if (equipped) {
    for (const c of s.trainedCohorts) {
      if (!c.equipped) {
        c.equipped = true;
        newlyEquipped += c.size;
      }
    }
    if (newlyEquipped > 0) notes.push(`equipment_arrived:${newlyEquipped}`);
  }

  // d. Regular pipeline.
  const regularIntake = P.regular_untrained_intake_annual / 12;
  s.pools.regularUntrained += regularIntake;
  const regularGains = Math.min(s.pools.regularUntrained, P.regular_gains_annual / 12);
  s.pools.regularUntrained -= regularGains;
  s.pools.regularTrained += regularGains;

  // e. Conscription: call-up and allocation.
  const spare = spareIntake(s);
  if (s.billStatus === 'passed') {
    const called = Math.min(Math.max(0, s.callupPerMonth), s.pools.conscriptEligible);
    if (called > 0) {
      s.pools.conscriptEligible -= called;
      s.conscriptsCalledTotal += called;
      s.conscriptionEverActive = true;
      s.pools.conscriptCalled += called;
    }
  }
  const candidates = s.pools.holdingPool + s.pools.conscriptCalled;
  if (candidates > 0) {
    const toTrain = Math.min(candidates, spare);
    if (toTrain > 0) {
      const cohort: TrainingCohort = {
        size: toTrain,
        startMonth: s.turn,
        graduationMonth: s.turn + courseMonths(s.syllabus),
        syllabus: s.syllabus,
        medical: s.clauses.medical,
      };
      s.trainingCohorts.push(cohort);
    }
    s.pools.holdingPool = candidates - toTrain;
    s.pools.conscriptCalled = 0;
  }

  // f. Graduation.
  let graduations = 0;
  const remaining: TrainingCohort[] = [];
  for (const c of s.trainingCohorts) {
    if (c.graduationMonth <= s.turn) {
      const grads = c.size * (1 - cohortAttrition(c.syllabus, c.medical));
      graduations += grads;
      if (grads > 0) {
        s.trainedCohorts.push({ size: grads, graduationMonth: s.turn, syllabus: c.syllabus, equipped });
        if (equipped) newlyEquipped += grads;
      }
    } else {
      remaining.push(c);
    }
  }
  s.trainingCohorts = remaining;
  if (graduations > 0) notes.push(`graduated:${graduations}`);

  // g. Reserves.
  let arrivedNow = 0;
  const stillPending = [];
  for (const r of s.reserveArrivals) {
    if (r.arrivalMonth <= s.turn) arrivedNow += r.size;
    else stillPending.push(r);
  }
  s.reserveArrivals = stillPending;
  if (arrivedNow > 0) {
    s.pools.reserveVolunteerMobilised += arrivedNow;
    arrivals.push({ label: 'Army Reserve volunteers mobilised', count: arrivedNow });
  }
  if (s.exRegularRecallActive && s.turn >= s.exRegularRecallMonth + P.ex_regular_delay_months) {
    const reportable = P.ex_regular_tracked * s.exRegularCeiling - s.pools.exRegularReported;
    const reporting = Math.min(Math.max(0, reportable) * P.ex_regular_report_rate_monthly, s.pools.exRegularTracked);
    if (reporting > 0) {
      s.pools.exRegularTracked -= reporting;
      s.pools.exRegularReported += reporting;
      arrivals.push({ label: 'Ex-regulars reported', count: reporting });
    }
  }
  if (!s.strategicTraceDone && s.strategicTraceMonth != null && s.strategicTraceMonth <= s.turn) {
    const draw = uniform(s.rngState, P.strategic_trace_yield_min, P.strategic_trace_yield_max);
    s.rngState = draw.state;
    const located = s.pools.strategicUntracked * draw.value;
    const traced = located * P.strategic_report_fraction;
    s.pools.strategicUntracked -= located;
    s.pools.strategicTraced += traced;
    s.strategicTraceDone = true;
    arrivals.push({ label: 'Strategic Reserve traced and reporting', count: traced });
    notes.push(`strategic_trace_yield:${draw.value}`);
  }

  // h. Outflow.
  let outflow = 0;
  if (!s.stopLoss) {
    outflow = Math.min(s.pools.regularTrained, P.regular_voluntary_outflow_annual / 12);
    s.pools.regularTrained -= outflow;
    s.ledger.regularOutflowToDate += outflow;
    s.ledger.juniorLeadersLostToOutflow += outflow * (P.junior_leaders / P.regular_trained_start);
  }

  syncDerivedPools(s);

  // i. Money.
  const breakdown = monthlyCostBreakdown(s, {
    newlyEquipped,
    capacityCost: s.ledger.costBreakdown.capacity,
    eventCost: s.ledger.costBreakdown.other,
  });
  s.ledger.costBreakdown = breakdown;
  s.ledger.monthlyCost = incrementalCost(breakdown);
  s.ledger.cumulativeCost += s.ledger.monthlyCost;

  // j. GDP.
  s.ledger.monthlyGdpLoss = monthlyGdpLoss(s);
  s.ledger.cumulativeGdpLoss += s.ledger.monthlyGdpLoss;

  return { graduations, outflow };
}

/** Exposed for tests and the CLI: one RNG draw on a state (does not mutate). */
export function peekRng(s: GameState): number {
  return next(s.rngState).value;
}
