/**
 * Deterministic scenario tests for the simulation core (docs/sim-spec.md).
 * The event deck is emptied for the hand-calculation scenarios so the numbers
 * are exact; the determinism test runs with whatever deck is on disk.
 */
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameEvent, GameState, TurnInput } from '../src/types.js';
import { P, param, ageBandClauseCost } from '../src/sim/params.js';
import { getEvents, setEvents } from '../src/sim/content.js';
import { newGame, step, derive } from '../src/sim/step.js';
import { availableActions, applyAction } from '../src/sim/actions.js';
import { eligiblePoolSize, refusalRate, strongOpposition } from '../src/sim/legislation.js';
import { spareIntake, courseMonths, cohortAttrition } from '../src/sim/pipeline.js';
import { leadershipFactor, ledPersonnel, leadersNeeded, leadersRecalled, leadersAvailable, leadersSpareable } from '../src/sim/effectiveness.js';
import { next, seedFromString, pickWeighted, uniform } from '../src/sim/rng.js';
import { score } from '../src/sim/score.js';
import { STRATEGIES } from '../src/sim/strategies.js';
import { applyEffects, conditionVars, eligibleEvents, eventEligible } from '../src/sim/events.js';
import { effectiveWillingness } from '../src/sim/politics.js';
import { chargeableCost, costPenaltyPerStep, costPenaltySteps, costPenaltyThreshold } from '../src/sim/politics.js';

const NOTHING: TurnInput = { actions: [], eventChoice: null };

/**
 * The deck on disk. Vitest does not run the `import.meta.glob` auto-load in
 * content.ts, so tests that want the real events inject them the way the CLI
 * runner does.
 */
const DECK = JSON.parse(readFileSync(resolve(__dirname, '../src/data/events.json'), 'utf8')) as GameEvent[];
function useRealDeck(): void {
  beforeAll(() => setEvents(DECK));
  afterAll(() => setEvents([]));
}

function run(s: GameState, inputs: TurnInput[]): GameState {
  for (const i of inputs) s = step(s, i);
  return s;
}

function idle(s: GameState, months: number): GameState {
  for (let i = 0; i < months; i++) s = step(s, NOTHING);
  return s;
}

describe('rng', () => {
  it('is deterministic and in [0,1)', () => {
    const a = next(42);
    const b = next(42);
    expect(a).toEqual(b);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(1);
    expect(next(a.state).value).not.toBe(a.value);
  });
  it('normalises seeds', () => {
    expect(seedFromString('42')).toBe(42);
    expect(seedFromString(42)).toBe(42);
    expect(seedFromString('churchill')).toBe(seedFromString('churchill'));
    expect(seedFromString('churchill')).not.toBe(seedFromString('attlee'));
  });
  it('picks weighted indices and uniform ranges', () => {
    const u = uniform(7, 0.2, 0.5);
    expect(u.value).toBeGreaterThanOrEqual(0.2);
    expect(u.value).toBeLessThan(0.5);
    expect(pickWeighted(7, [0, 0, 5]).index).toBe(2);
    expect(pickWeighted(7, []).index).toBe(-1);
  });
});

describe('scenarios without events', () => {
  let deck: readonly unknown[] = [];
  beforeAll(() => {
    deck = getEvents();
    setEvents([]);
  });
  afterAll(() => setEvents(deck));

  it('newGame invariants', () => {
    const s = newGame(42, 'division');
    expect(s.turn).toBe(0);
    expect(s.over).toBe(false);
    expect(s.target).toBe(P.target_division);
    expect(s.deadlineMonths).toBe(P.deadline_division);
    expect(s.pools.regularTrained).toBe(P.regular_trained_start);
    expect(s.pools.regularUntrained).toBe(P.regular_untrained_start);
    expect(s.pools.reserveVolunteerAvailable).toBe(P.reserve_volunteer_trained);
    expect(s.pools.exRegularTracked).toBe(P.ex_regular_tracked);
    expect(s.pools.strategicUntracked).toBe(P.strategic_reserve_untracked);
    expect(s.pools.conscriptEligible).toBe(0);
    expect(s.politicalCapital).toBe(P.pc_start);
    expect(s.willingness).toBe(P.willingness_start_pct);
    expect(s.clauses).toEqual({ ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' });
    expect(s.gauges.forceReady).toBeCloseTo(P.regular_trained_start * P.regular_deployable_fraction * P.eff_regular, 6);
    expect(s.gauges.forceQuality).toBeCloseTo(1, 9);
    expect(s.gauges.leadershipFactor).toBe(1);
    expect(s.history).toHaveLength(1);
    expect(s.pendingEvent).toBeNull();
    expect(newGame('42', 'brigade').seed).toBe(42);
    expect(newGame(42, 'corps').deadlineMonths).toBe(P.deadline_corps);
  });

  it('do_nothing for 12 months ends at the deadline with the bathtub draining', () => {
    let s = newGame(1, 'division');
    for (let i = 0; i < 12; i++) {
      expect(s.over).toBe(false);
      s = step(s, STRATEGIES.do_nothing(s));
    }
    expect(s.turn).toBe(12);
    expect(s.over).toBe(true);
    expect(s.overReason).toBe('deadline');
    // Twelve months of drain, plus the idle penalty for every month after the
    // grace: a minister who never pulls a lever is seen not to be governing.
    const idlePenalised = 12 - P.pc_idle_grace_months;
    expect(s.idleMonths).toBe(12);
    expect(s.politicalCapital).toBe(P.pc_start - 12 * P.pc_baseline_drain - idlePenalised * P.pc_idle_penalty);
    expect(s.ledger.cumulativeCost).toBe(0);
    expect(s.ledger.cumulativeGdpLoss).toBe(0);
    // Outflow is proportional to the strength held, not a flat draw (§6a), so a
    // year of it is no longer exactly regular_voluntary_outflow_annual: the
    // regular pipeline puts in more than voluntary outflow takes out, the
    // strength rises, and the drain rises with it. It should land just above
    // the published annual figure, and nowhere near a tenth away from it.
    const publishedYear = P.regular_voluntary_outflow_annual;
    expect(s.ledger.regularOutflowToDate).toBeGreaterThan(publishedYear);
    expect(s.ledger.regularOutflowToDate).toBeLessThan(publishedYear * 1.1);
    const expectedTrained = P.regular_trained_start + P.regular_gains_annual - s.ledger.regularOutflowToDate;
    expect(s.pools.regularTrained).toBeCloseTo(expectedTrained, 6);
    expect(s.history).toHaveLength(13);
    // Stepping an over game is a no-op.
    const again = step(s, NOTHING);
    expect(again.turn).toBe(12);
    expect(again.pools).toEqual(s.pools);
  });

  it('calling out the reserve lands reservists on the right month at 0.8 effectiveness', () => {
    let s = newGame(3, 'corps');
    s = step(s, { actions: [{ id: 'call_out_reserve', notice: 180 }], eventChoice: null });
    const expected = P.reserve_volunteer_trained * P.reserve_volunteer_deployable_fraction;
    expect(s.reserveCalledOut).toBe(true);
    expect(s.politicalCapital).toBe(P.pc_start + P.pc_cost_call_out_reserve - P.pc_baseline_drain);
    expect(s.pools.reserveVolunteerPending).toBeCloseTo(expected, 6);
    expect(s.reserveArrivals[0].arrivalMonth).toBe(P.reserve_arrival_months_default);
    s = idle(s, P.reserve_arrival_months_default - 2);
    expect(s.turn).toBe(P.reserve_arrival_months_default - 1);
    expect(s.pools.reserveVolunteerMobilised).toBe(0);
    s = step(s, NOTHING);
    expect(s.turn).toBe(P.reserve_arrival_months_default);
    expect(s.pools.reserveVolunteerMobilised).toBeCloseTo(expected, 6);
    expect(s.pools.reserveVolunteerPending).toBe(0);
    expect(s.composition.reservists.headcount).toBeCloseTo(expected, 6);
    expect(s.composition.reservists.ese).toBeCloseTo(expected * P.eff_reserve_volunteer, 6);
    expect(s.briefing.arrivals[0].count).toBeCloseTo(expected, 6);
    // 90-day notice is quicker and costs more.
    let q = newGame(3, 'corps');
    q = step(q, { actions: [{ id: 'call_out_reserve', notice: 90 }], eventChoice: null });
    expect(q.reserveArrivals[0].arrivalMonth).toBe(P.reserve_arrival_months_amended);
    expect(q.politicalCapital).toBe(P.pc_start + P.pc_cost_call_out_reserve + P.pc_cost_ninety_day_notice - P.pc_baseline_drain);
    expect(availableActions(q).find((a) => a.id === 'call_out_reserve')?.available).toBe(false);
  });

  it('the bill passes on the right month with the hand-calculated eligible pool', () => {
    let s = newGame(5, 'corps');
    const clauses = { ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' } as const;
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses }], eventChoice: null });
    expect(s.billStatus).toBe('in_progress');
    expect(s.billPassesMonth).toBe(P.bill_months_emergency);
    expect(s.politicalCapital).toBe(P.pc_start + P.pc_cost_bill_emergency - P.pc_baseline_drain);
    s = idle(s, P.bill_months_emergency - 2);
    expect(s.billStatus).toBe('in_progress');
    expect(s.pools.conscriptEligible).toBe(0);
    s = step(s, NOTHING);
    expect(s.turn).toBe(P.bill_months_emergency);
    expect(s.billStatus).toBe('passed');
    const hand = P.ew_pop_18_30 * P.uk_population_scaling * (1 - P.exemption_broad) * P.medical_pass_peacetime;
    expect(s.pools.conscriptEligible).toBeCloseTo(hand, 3);
    expect(eligiblePoolSize(clauses)).toBeCloseTo(hand, 3);
    // Women excluded, wartime medical, minimal exemptions: clause costs and pool.
    const harsh = { ageBand: '26-40', includeWomen: false, medical: 'wartime', exemptions: 'minimal' } as const;
    const pcBefore = s.politicalCapital;
    s = step(s, { actions: [{ id: 'amend_bill', clauses: harsh }], eventChoice: null });
    const handHarsh = (P.ew_pop_26_40 - P.ew_pop_f_26_40) * P.uk_population_scaling * (1 - P.exemption_minimal) * P.medical_pass_wartime;
    expect(s.pools.conscriptEligible).toBeCloseTo(handHarsh, 3);
    expect(s.politicalCapital).toBe(
      pcBefore
        + P.pc_cost_exclude_women
        + P.pc_cost_medical_wartime
        + P.pc_cost_exemptions_minimal
        + (P.pc_cost_band_26_40 - P.pc_cost_band_18_30)
        - P.pc_baseline_drain,
    );
    // Normal procedure takes longer and costs less.
    let n = newGame(5, 'corps');
    n = step(n, { actions: [{ id: 'introduce_bill', procedure: 'normal', clauses }], eventChoice: null });
    expect(n.billPassesMonth).toBe(P.bill_months_normal);
    expect(n.politicalCapital).toBe(P.pc_start + P.pc_cost_bill_normal - P.pc_baseline_drain);
  });

  it('conscripts over capacity land in the holding pool; set_callup is free and needs the bill', () => {
    let s = newGame(7, 'corps');
    const clauses = { ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' } as const;
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses }], eventChoice: null });
    // Not yet passed: set_callup is ignored with a note.
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 1000 }], eventChoice: null });
    expect(s.callupPerMonth).toBe(0);
    expect(s.briefing.notes).toContain('action_unavailable:set_callup');
    s = idle(s, P.bill_months_emergency - 2);
    expect(s.billStatus).toBe('passed');
    const spare = spareIntake(s);
    expect(spare).toBeGreaterThan(0);
    const callup = 20_000;
    const eligibleBefore = s.pools.conscriptEligible;
    s = step(s, { actions: [{ id: 'set_callup', perMonth: callup }, { id: 'stop_loss' }, { id: 'raise_spending' }], eventChoice: null });
    // set_callup did not take a slot: both paid actions went through.
    expect(s.stopLoss).toBe(true);
    expect(s.spendingRaised).toBe(true);
    expect(s.conscriptsCalledTotal).toBe(callup);
    expect(s.conscriptionEverActive).toBe(true);
    expect(s.pools.conscriptEligible).toBeCloseTo(eligibleBefore - callup, 6);
    expect(s.pools.conscriptCalled).toBe(0);
    // Calling over capacity is insurance against refusal (§10a): the refusers
    // come out of the surplus that was going to sit in the holding pool, so
    // the training places still fill completely.
    const reporting = callup * (1 - refusalRate(s));
    expect(s.conscriptsRefusedTotal).toBeCloseTo(callup - reporting, 6);
    expect(s.pools.conscriptInTraining).toBeCloseTo(spare, 6);
    expect(s.pools.holdingPool).toBeCloseTo(reporting - spare, 6);
    expect(s.trainingCohorts).toHaveLength(1);
    expect(s.briefing.holdingPoolDelta).toBeCloseTo(reporting - spare, 6);
    // Holding pool costs money and GDP but produces nothing. Refusers cost
    // neither: they never turned up.
    expect(s.ledger.costBreakdown.conscriptPay).toBeGreaterThan(0);
    expect(s.ledger.monthlyGdpLoss).toBeCloseTo((reporting * P.output_per_worker_labour_share * P.gdp_age_multiplier_18_30) / 12, 3);
    expect(s.composition.conscripts.headcount).toBe(0);
    // Next month the holding pool has priority over new call-ups.
    const holding = s.pools.holdingPool;
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 0 }], eventChoice: null });
    expect(s.pools.holdingPool).toBeCloseTo(holding - spareIntake(s), 6);
    expect(s.trainingCohorts).toHaveLength(2);
  });

  it('cohorts graduate on the right month with the right attrition', () => {
    let s = newGame(11, 'corps');
    const clauses = { ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' } as const;
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses }], eventChoice: null });
    s = idle(s, P.bill_months_emergency - 1);
    expect(s.billStatus).toBe('passed');
    // Baseline spare intake is tiny (~20/month); call up fewer than that so nobody spills into the holding pool.
    const callup = Math.floor(spareIntake(s) / 2);
    expect(callup).toBeGreaterThan(0);
    s = step(s, { actions: [{ id: 'set_callup', perMonth: callup }], eventChoice: null });
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 0 }], eventChoice: null });
    expect(s.trainingCohorts).toHaveLength(1);
    expect(s.pools.holdingPool).toBe(0);
    const cohort = s.trainingCohorts[0];
    // Not everyone called reports (§10a): the cohort is what turned up.
    const reporting = callup * (1 - refusalRate(s));
    expect(cohort.size).toBeCloseTo(reporting, 6);
    expect(s.conscriptsRefusedTotal).toBeCloseTo(callup - reporting, 6);
    expect(cohort.size).toBeLessThan(callup);
    const months = courseMonths('normal');
    expect(months).toBe(Math.round(((P.phase1_weeks + P.phase2_weeks) * 12) / 52));
    expect(cohort.graduationMonth).toBe(cohort.startMonth + months);
    while (s.turn < cohort.graduationMonth - 1) s = step(s, NOTHING);
    expect(s.trainedCohorts).toHaveLength(0);
    expect(s.pools.conscriptInTraining).toBeCloseTo(cohort.size, 6);
    s = step(s, NOTHING);
    expect(s.turn).toBe(cohort.graduationMonth);
    expect(s.trainingCohorts).toHaveLength(0);
    expect(s.trainedCohorts).toHaveLength(1);
    expect(s.trainedCohorts[0].size).toBeCloseTo(cohort.size * (1 - P.training_attrition), 6);
    expect(s.trainedCohorts[0].equipped).toBe(false);
    expect(s.briefing.graduations).toBeCloseTo(cohort.size * (1 - P.training_attrition), 6);
    expect(s.pools.conscriptTrainedUnequipped).toBeCloseTo(cohort.size * (1 - P.training_attrition), 6);
    // Unequipped conscripts count at the unequipped effectiveness.
    expect(s.composition.conscripts.ese).toBeCloseTo(s.pools.conscriptTrainedUnequipped * P.eff_conscript_unequipped, 6);
    // Compressed syllabus and wartime medical raise attrition and shorten the course.
    let c = newGame(11, 'corps');
    c = step(c, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses: { ...clauses, medical: 'wartime' } }, { id: 'compress_syllabus' }], eventChoice: null });
    c = idle(c, P.bill_months_emergency - 1);
    c = step(c, { actions: [{ id: 'set_callup', perMonth: callup }], eventChoice: null });
    c = step(c, { actions: [{ id: 'set_callup', perMonth: 0 }], eventChoice: null });
    const cc = c.trainingCohorts[0];
    expect(cc.syllabus).toBe('compressed');
    expect(cc.graduationMonth - cc.startMonth).toBe(courseMonths('compressed'));
    while (c.turn < cc.graduationMonth) c = step(c, NOTHING);
    const expectedAttrition = P.training_attrition + P.attrition_compressed_add + P.attrition_wartime_medical_add;
    expect(c.trainedCohorts[0].size).toBeCloseTo(cc.size * (1 - expectedAttrition), 6);
  });

  it('equipment arrival flips unequipped cohorts to equipped and charges the cost once', () => {
    let s = newGame(13, 'corps');
    s.trainedCohorts.push({ size: 1000, graduationMonth: 0, syllabus: 'normal', equipped: false });
    s = derive(s);
    expect(s.pools.conscriptTrainedUnequipped).toBe(1000);
    s = step(s, { actions: [{ id: 'equipment_buy' }], eventChoice: null });
    expect(s.equipmentOrdered).toBe(true);
    expect(s.equipmentArrivalMonth).toBe(P.equipment_lead_months);
    s = idle(s, P.equipment_lead_months - 2);
    expect(s.trainedCohorts[0].equipped).toBe(false);
    expect(s.ledger.costBreakdown.equipment).toBe(0);
    s = step(s, NOTHING);
    expect(s.turn).toBe(P.equipment_lead_months);
    expect(s.trainedCohorts[0].equipped).toBe(true);
    expect(s.pools.conscriptTrainedEquipped).toBe(1000);
    expect(s.pools.conscriptTrainedUnequipped).toBe(0);
    expect(s.ledger.costBreakdown.equipment).toBe(1000 * P.equipment_cost_per_head);
    // Equipped cohort effectiveness grows from the start value by month.
    const months = s.turn - 0;
    const eff = Math.min(P.eff_conscript_normal_cap, P.eff_conscript_normal_start + P.eff_conscript_growth_monthly * months);
    expect(s.composition.conscripts.ese).toBeCloseTo(1000 * eff, 6);
    // Not charged again.
    s = step(s, NOTHING);
    expect(s.ledger.costBreakdown.equipment).toBe(0);
    expect(availableActions(s).find((a) => a.id === 'equipment_buy')?.exhausted).toBe(true);
  });

  it('reconstructs the published annual outflow from intention x conversion', () => {
    // The AFCAS split is meant to rebuild the number the flat rate used to
    // carry, not to replace it: 70,951 x 19% x 0.2456 = the 3,311 a year the
    // Army reports. Assert that against the published figure directly.
    const rebuilt = P.regular_trained_start * (P.regular_outflow_intent_pct / 100) * P.regular_outflow_intent_conversion;
    expect(rebuilt).toBeCloseTo(P.regular_voluntary_outflow_annual, 0);

    // The month's actual draw is a shade higher, and correctly so: the regular
    // pipeline adds its intake (3d) before the drain is taken (3h), and the
    // drain is proportional to the strength then held.
    const s = step(newGame(17, 'division'), NOTHING);
    const gains = Math.min(P.regular_untrained_start + P.regular_untrained_intake_annual / 12, P.regular_gains_annual / 12);
    const rate = (P.regular_outflow_intent_pct / 100) * P.regular_outflow_intent_conversion;
    expect(s.briefing.outflow).toBeCloseTo(((P.regular_trained_start + gains) * rate) / 12, 6);
    expect(s.briefing.outflow).toBeGreaterThan(P.regular_voluntary_outflow_annual / 12);
    expect(s.outflowIntent).toBe(P.regular_outflow_intent_pct);
  });

  it('stop-loss reduces outflow rather than ending it, and the leak grows', () => {
    const base = newGame(17, 'division');
    const drained = step(base, NOTHING);
    const held = step(base, { actions: [{ id: 'stop_loss' }], eventChoice: null });
    const gains = Math.min(P.regular_untrained_start + P.regular_untrained_intake_annual / 12, P.regular_gains_annual / 12);
    const rate = (P.regular_outflow_intent_pct / 100) * P.regular_outflow_intent_conversion;
    const gross = ((P.regular_trained_start + gains) * rate) / 12;
    expect(drained.pools.regularTrained).toBeCloseTo(P.regular_trained_start + gains - gross, 6);

    // Held: a quarter still goes, and the junior leaders go with them. The
    // month stop-loss is imposed already carries its intention bump — the
    // compulsion is felt from the day it is announced — so the leak is taken
    // at the raised rate, not the baseline one.
    const heldRate = ((P.regular_outflow_intent_pct + P.stop_loss_intent_add_monthly) / 100) * P.regular_outflow_intent_conversion;
    const leak = (((P.regular_trained_start + gains) * heldRate) / 12) * P.stop_loss_leak_fraction;
    expect(held.briefing.outflow).toBeCloseTo(leak, 6);
    expect(held.pools.regularTrained).toBeCloseTo(P.regular_trained_start + gains - leak, 6);
    expect(held.ledger.juniorLeadersLostToOutflow).toBeCloseTo(leak * (P.junior_leaders / P.regular_trained_start), 6);
    expect(held.briefing.outflow).toBeLessThan(drained.briefing.outflow);
    expect(held.briefing.outflow).toBeGreaterThan(0);

    // And it is a deferral, not a cure: every month under compulsion adds to
    // the intention to leave, so what leaks grows while the compulsion holds.
    expect(held.outflowIntent).toBeCloseTo(P.regular_outflow_intent_pct + P.stop_loss_intent_add_monthly, 6);
    let later = held;
    for (let i = 0; i < 6; i++) later = step(later, NOTHING);
    expect(later.outflowIntent).toBeCloseTo(P.regular_outflow_intent_pct + 7 * P.stop_loss_intent_add_monthly, 6);
    expect(later.briefing.outflow).toBeGreaterThan(held.briefing.outflow);
  });

  it('never drives the intention to leave past its ceiling', () => {
    let s = newGame(17, 'corps');
    s = step(s, { actions: [{ id: 'stop_loss' }], eventChoice: null });
    while (!s.over) s = step(s, NOTHING);
    expect(s.outflowIntent).toBeLessThanOrEqual(P.outflow_intent_max_pct);
    expect(s.outflowIntent).toBeGreaterThan(P.regular_outflow_intent_pct);
  });

  it('leadership factor drops when capacity purchases exceed the spareable cadre', () => {
    let s = newGame(19, 'corps');
    expect(leadershipFactor(s)).toBe(1);
    // A large conscript force needs more leaders than the spareable cadre.
    const conscripts = P.junior_leaders * P.junior_leaders_spareable_fraction * P.junior_leader_ratio * 1.1;
    s.trainingCohorts.push({ size: conscripts, startMonth: 0, graduationMonth: 8, syllabus: 'normal', medical: 'peacetime' });
    s = derive(s);
    const spareable = P.junior_leaders * P.junior_leaders_spareable_fraction;
    const needed = conscripts / P.junior_leader_ratio;
    expect(s.gauges.leadershipFactor).toBeCloseTo(spareable / needed, 9);
    expect(s.gauges.leadershipFactor).toBeLessThan(1);
    const before = s.gauges.leadershipFactor;
    const trainedBefore = s.pools.regularTrained;
    s = step(s, { actions: [{ id: 'expand_capacity' }, { id: 'expand_capacity' }], eventChoice: null });
    expect(s.capacityPurchases).toBe(2);
    expect(s.ledger.juniorLeadersDiverted).toBe(2 * P.leaders_per_capacity_purchase);
    expect(s.ledger.costBreakdown.capacity).toBe(2 * P.capacity_purchase_cost);
    expect(s.ledger.cumulativeCost).toBeGreaterThanOrEqual(2 * P.capacity_purchase_cost);
    expect(s.gauges.leadershipFactor).toBeLessThan(before);
    // The purchase pulled 625 each out of the trained regulars.
    const gains = Math.min(P.regular_untrained_start + P.regular_untrained_intake_annual / 12, P.regular_gains_annual / 12);
    // Outflow is now proportional to the strength held (§6a), and the two
    // purchases took 1,250 out of it before the drain was taken, so the month's
    // outflow is computed on the reduced figure rather than on the published
    // flat rate.
    const afterDiversion = trainedBefore - 2 * P.leaders_per_capacity_purchase + gains;
    const drain = (afterDiversion * (P.regular_outflow_intent_pct / 100) * P.regular_outflow_intent_conversion) / 12;
    expect(s.pools.regularTrained).toBeCloseTo(afterDiversion - drain, 6);
    // Purchases come online after the stand-up delay.
    expect(spareIntake(s)).toBeCloseTo(spareIntake(newGame(19, 'corps')), 6);
    s = idle(s, P.capacity_standup_months);
    expect(spareIntake(s)).toBeGreaterThan(spareIntake(newGame(19, 'corps')));
    // Outflow erodes the cadre too, so the factor keeps sliding.
    const lf = s.gauges.leadershipFactor;
    s = idle(s, 2);
    expect(s.gauges.leadershipFactor).toBeLessThan(lf);
  });

  it('charges the cadre for everyone raised who does not arrive in formed units', () => {
    // Volunteer reservists come as sub-units with their own corporals and
    // sergeants; ex-regulars, traced Strategic Reservists and conscripts come
    // as individuals and have to be given a chain of command.
    let s = newGame(31, 'corps');
    s.pools.reserveVolunteerMobilised = 20_000;
    s = derive(s);
    expect(ledPersonnel(s)).toBe(0);
    expect(s.gauges.leadershipFactor).toBe(1);

    s.pools.exRegularReported = 12_000;
    s.pools.strategicTraced = 6_000;
    s.trainingCohorts.push({ size: 20_000, startMonth: 0, graduationMonth: 8, syllabus: 'normal', medical: 'peacetime' });
    s = derive(s);
    expect(ledPersonnel(s)).toBe(38_000);
    expect(leadersNeeded(s)).toBeCloseTo(38_000 / P.junior_leader_ratio, 9);
    // The recall returns junior leaders in the Army's own proportion, rusty.
    expect(leadersRecalled(s)).toBeCloseTo((12_000 / P.junior_leader_ratio) * P.eff_ex_regular, 9);
    expect(leadersAvailable(s)).toBeCloseTo(leadersSpareable(s) + leadersRecalled(s), 9);
    expect(s.gauges.leadershipFactor).toBeCloseTo(leadersAvailable(s) / leadersNeeded(s), 9);
    expect(s.gauges.leadershipFactor).toBeLessThan(1);
  });

  it('scales every bucket it charges, and no others', () => {
    let s = newGame(37, 'corps');
    s.pools.reserveVolunteerMobilised = 8_000;
    s.pools.exRegularReported = 14_000;
    s.pools.strategicTraced = 7_000;
    s.trainedCohorts.push({ size: 11_000, graduationMonth: 0, syllabus: 'normal', equipped: true });
    s = derive(s);
    const lf = s.gauges.leadershipFactor;
    expect(lf).toBeLessThan(1);
    const c = s.composition;
    // Regulars are already led; volunteer reservists bring their own cadre.
    expect(c.regulars.ese).toBeCloseTo(c.regulars.headcount * P.eff_regular, 6);
    expect(c.reservists.ese).toBeCloseTo(8_000 * P.eff_reserve_volunteer, 6);
    // The three that had to be formed are discounted by the factor.
    expect(c.exRegulars.ese).toBeCloseTo(14_000 * P.eff_ex_regular * lf, 6);
    expect(c.strategic.ese).toBeCloseTo(7_000 * P.eff_strategic * lf, 6);
    expect(c.conscripts.ese).toBeCloseTo(11_000 * P.eff_conscript_normal_start * lf, 6);
  });

  it('derives the field ratio from the Army’s own strength and cadre', () => {
    // The ratio is read off two primary figures, not assumed. The instructor
    // ratio is a different number doing a different job.
    expect(P.junior_leader_ratio).toBeCloseTo(P.regular_trained_start / P.junior_leaders, 2);
    expect(P.leaders_per_capacity_purchase).toBeCloseTo(P.capacity_purchase_annual / P.instructor_ratio, 6);
    expect(param('junior_leader_ratio').confidence).toBe('derived');
    expect(param('instructor_ratio').confidence).toBe('assumption');
  });

  it('a third paid action in one turn is ignored', () => {
    let s = newGame(23, 'division');
    s = step(s, { actions: [{ id: 'stop_loss' }, { id: 'equipment_buy' }, { id: 'recall_ex_regular' }], eventChoice: null });
    expect(s.stopLoss).toBe(true);
    expect(s.equipmentOrdered).toBe(true);
    expect(s.exRegularRecallActive).toBe(false);
    expect(s.briefing.notes).toContain('action_no_slot:recall_ex_regular');
    expect(s.politicalCapital).toBe(P.pc_start + P.pc_cost_stop_loss + P.pc_cost_equipment_buy - P.pc_baseline_drain);
    expect(s.briefing.pcReasons.map((r) => r.delta).reduce((a, b) => a + b, 0)).toBe(s.briefing.pcDelta);
  });

  it('political actions pay out as specified', () => {
    let s = newGame(29, 'division');
    s = step(s, { actions: [{ id: 'address_nation' }, { id: 'blame_predecessors' }], eventChoice: null });
    expect(s.politicalCapital).toBe(P.pc_start + P.pc_address_first + P.pc_blame_first - P.pc_baseline_drain);
    expect(s.willingnessBoosts).toHaveLength(1);
    s = step(s, { actions: [{ id: 'address_nation' }, { id: 'blame_predecessors' }], eventChoice: null });
    expect(s.politicalCapital).toBe(P.pc_start + P.pc_address_first + P.pc_blame_first + P.pc_address_second + P.pc_blame_subsequent - 2 * P.pc_baseline_drain);
    const pc = s.politicalCapital;
    s = step(s, { actions: [{ id: 'address_nation' }], eventChoice: null });
    // A third address costs: there is nothing left to announce. It must cost
    // more than idling, or it is a free way to look busy.
    expect(s.politicalCapital).toBe(pc + P.pc_address_subsequent - P.pc_baseline_drain);
    expect(P.pc_address_subsequent).toBeLessThan(0);
    expect(-P.pc_address_subsequent).toBeGreaterThan(P.pc_idle_penalty);
    // The third address (taken on turn 2) boosts willingness until turn 2 + address_willingness_months.
    const lastUntil = 2 + P.address_willingness_months;
    expect(s.willingnessBoosts.map((b) => b.until)).toContain(lastUntil);
    while (s.turn < lastUntil) s = step(s, NOTHING);
    expect(s.willingnessBoosts.some((b) => b.until === lastUntil)).toBe(true);
    s = idle(s, 1);
    expect(s.willingnessBoosts).toHaveLength(0);
  });

  it('ex-regulars and the strategic reserve report on schedule', () => {
    let s = newGame(31, 'corps');
    s = step(s, { actions: [{ id: 'recall_ex_regular' }, { id: 'trace_strategic_reserve' }], eventChoice: null });
    expect(s.strategicTraceMonth).toBe(P.strategic_trace_delay_months);
    s = idle(s, P.ex_regular_delay_months - 2);
    expect(s.pools.exRegularReported).toBe(0);
    s = step(s, NOTHING);
    expect(s.turn).toBe(P.ex_regular_delay_months);
    const first = P.ex_regular_tracked * P.ex_regular_report_ceiling * P.ex_regular_report_rate_monthly;
    expect(s.pools.exRegularReported).toBeCloseTo(first, 6);
    expect(s.pools.exRegularTracked).toBeCloseTo(P.ex_regular_tracked - first, 6);
    while (s.turn < P.strategic_trace_delay_months) s = step(s, NOTHING);
    expect(s.strategicTraceDone).toBe(true);
    const yieldNote = s.briefing.notes.find((n) => n.startsWith('strategic_trace_yield:'));
    expect(yieldNote).toBeDefined();
    const y = Number(yieldNote!.split(':')[1]);
    expect(y).toBeGreaterThanOrEqual(P.strategic_trace_yield_min);
    expect(y).toBeLessThan(P.strategic_trace_yield_max);
    expect(s.pools.strategicTraced).toBeCloseTo(P.strategic_reserve_untracked * y * P.strategic_report_fraction, 3);
    expect(s.pools.strategicUntracked).toBeCloseTo(P.strategic_reserve_untracked * (1 - y), 3);
    expect(s.composition.strategic.ese).toBeCloseTo(s.pools.strategicTraced * P.eff_strategic, 6);
    expect(s.composition.exRegulars.ese).toBeCloseTo(s.pools.exRegularReported * P.eff_ex_regular, 6);
  });

  it('PC below zero ends the game with a resignation', () => {
    let s = newGame(37, 'division');
    s.politicalCapital = 5;
    s = step(s, { actions: [{ id: 'stop_loss' }], eventChoice: null });
    expect(s.politicalCapital).toBeLessThan(0);
    expect(s.over).toBe(true);
    expect(s.overReason).toBe('resigned');
    expect(s.pendingEvent).toBeNull();
    const sc = score(s);
    expect(sc.resigned).toBe(true);
    expect(sc.met).toBe(false);
    expect(sc.seedUrl).toBe('?seed=37&difficulty=division');
    // PC exactly zero is survivable.
    let z = newGame(37, 'division');
    z.politicalCapital = P.pc_baseline_drain;
    z = step(z, NOTHING);
    expect(z.politicalCapital).toBe(0);
    expect(z.over).toBe(false);
  });

  it('score bands and verdict placeholders', () => {
    let s = newGame(41, 'brigade');
    s = step(s, { actions: [{ id: 'call_out_reserve', notice: 90 }, { id: 'recall_ex_regular' }], eventChoice: null });
    while (!s.over) s = step(s, NOTHING);
    const sc = score(s);
    expect(sc.months).toBe(P.deadline_brigade);
    expect(sc.ese).toBeCloseTo(s.gauges.forceReady, 9);
    expect(sc.met).toBe(sc.ese >= P.target_brigade);
    expect(sc.costPctDefenceBudget).toBeCloseTo((s.ledger.cumulativeCost / P.defence_budget_2025) * 100, 9);
    expect(sc.verdictText).not.toMatch(/\{\w+\}/);
    expect(sc.verdictOneLiner).not.toMatch(/\{\w+\}/);
    expect(['low', 'mid', 'high']).toContain(sc.qualityBand);
    expect(['broken', 'strained', 'intact']).toContain(sc.leadershipBand);
  });
});

describe('the age band and refusal', () => {
  const BANDS = ['18-25', '18-30', '26-40', '18-65'] as const;
  const clausesFor = (ageBand: (typeof BANDS)[number]) =>
    ({ ageBand, includeWomen: true, medical: 'relaxed', exemptions: 'broad' }) as const;

  it('is more popular the less of the hostile group it contains', () => {
    const w = BANDS.map((b) => {
      const s = newGame(3, 'division');
      s.clauses = { ...clausesFor(b) };
      return effectiveWillingness(s);
    });
    // Monotonically increasing across the four the Bill offers.
    expect(w).toEqual([...w].sort((a, b) => a - b));
    expect(w[0]).toBeLessThan(w[3]);
    expect(w[3] - w[0]).toBe(
      P.conscription_willingness_adj_18_65 - P.conscription_willingness_adj_18_25,
    );
    // 26-40 is the point of the set: it is the only band whose lower bound is
    // not 18, so it is the only one that excludes the 18-24s outright rather
    // than diluting them, and it beats a band nearly half as wide again
    // (18-40, which this replaced, was worth +3 where this is worth +6).
    const [, def, older, widest] = w;
    expect(older - def).toBe(P.conscription_willingness_adj_26_40);
    expect(older).toBeGreaterThan(def);
    expect(widest - older).toBeLessThan(older - def);
  });

  it('turns willingness into people who do not report, not only into capital', () => {
    for (const b of BANDS) {
      const s = newGame(3, 'division');
      s.clauses = { ...clausesFor(b) };
      const opp = P.refusal_strong_opposition_intercept
        + P.refusal_strong_opposition_slope * effectiveWillingness(s);
      expect(strongOpposition(s)).toBeCloseTo(opp, 6);
      expect(refusalRate(s)).toBeCloseTo((opp / 100) * P.conscription_refusal_conversion, 9);
      expect(refusalRate(s)).toBeGreaterThan(0);
      expect(refusalRate(s)).toBeLessThan(1);
    }
    // The widest band refuses least.
    const narrow = newGame(3, 'division'); narrow.clauses = { ...clausesFor('18-25') };
    const wide = newGame(3, 'division'); wide.clauses = { ...clausesFor('18-65') };
    expect(refusalRate(wide)).toBeLessThan(refusalRate(narrow));
  });

  it('lets an address to the nation reduce refusals', () => {
    // Addresses moved willingness before this change too, but willingness only
    // led to a political charge. Now it leads to soldiers.
    const before = newGame(3, 'division');
    const after = step(before, { actions: [{ id: 'address_nation' }], eventChoice: null });
    expect(effectiveWillingness(after)).toBeGreaterThan(effectiveWillingness(before));
    expect(refusalRate(after)).toBeLessThan(refusalRate(before));
  });

  it('never lets refusal escape [0, 1] however far willingness is pushed', () => {
    const s = newGame(3, 'division');
    s.willingness = -500;
    expect(strongOpposition(s)).toBe(100);
    expect(refusalRate(s)).toBeCloseTo(P.conscription_refusal_conversion, 9);
    s.willingness = 500;
    expect(strongOpposition(s)).toBe(0);
    expect(refusalRate(s)).toBe(0);
  });
});

describe("the Equipment Plan's contingency", () => {
  const draw = (s: GameState): GameState => step(s, { actions: [{ id: 'draw_contingency' }], eventChoice: null });

  it('costs no capital now and takes the contingency off the Treasury bill', () => {
    let s = newGame(31, 'corps');
    s.ledger.cumulativeCost = costPenaltyThreshold(s) * 1.5;
    expect(costPenaltySteps(s)).toBe(1);
    const pcBefore = s.politicalCapital;

    const after = structuredClone(s);
    applyAction(after, { id: 'draw_contingency' });
    expect(after.contingencyDrawn).toBe(true);
    expect(after.politicalCapital).toBe(pcBefore);
    expect(chargeableCost(after)).toBe(s.ledger.cumulativeCost - P.equipment_plan_contingency);
    expect(costPenaltySteps(after)).toBe(0);
  });

  it('makes every later step cost more, so it is only the better buy on a small programme', () => {
    const base = newGame(31, 'corps');
    const at = (cost: number, drawn: boolean): number => {
      const s = structuredClone(base);
      s.ledger.cumulativeCost = cost;
      s.contingencyDrawn = drawn;
      return costPenaltyPerStep(s) * costPenaltySteps(s);
    };
    expect(costPenaltyPerStep({ ...base, contingencyDrawn: true })).toBe(
      P.cost_pc_penalty_per_step + P.contingency_drawn_penalty_add,
    );
    // One step of pressure: drawing clears it outright.
    const oneStep = costPenaltyThreshold(base) + P.equipment_plan_contingency - 1e6;
    expect(at(oneStep, true)).toBeLessThan(at(oneStep, false));
    // Two steps and up: the steeper slope costs more than the headroom saves.
    const threeSteps = costPenaltyThreshold(base) * 3;
    expect(at(threeSteps, true)).toBeGreaterThan(at(threeSteps, false));
  });

  it('slips an equipment order already placed, and one bought afterwards', () => {
    // Already placed: the order loses its place in the programme.
    let placed = step(newGame(31, 'corps'), { actions: [{ id: 'equipment_buy' }], eventChoice: null });
    const due = placed.equipmentArrivalMonth!;
    placed = draw(placed);
    expect(placed.equipmentArrivalMonth).toBe(due + P.contingency_equipment_delay_months);

    // Bought afterwards: it is quoted the longer lead time.
    let later = draw(newGame(31, 'corps'));
    expect(later.equipmentArrivalMonth).toBeNull();
    // Actions are applied before the month advances, so the order is quoted
    // from the turn it was placed on, not the turn the step ends on.
    const placedOn = later.turn;
    later = step(later, { actions: [{ id: 'equipment_buy' }], eventChoice: null });
    expect(later.equipmentArrivalMonth).toBe(placedOn + P.equipment_lead_months + P.contingency_equipment_delay_months);
  });

  it('can only be spent once', () => {
    const s = draw(newGame(31, 'corps'));
    const again = availableActions(s).find((a) => a.id === 'draw_contingency');
    expect(again?.available).toBe(false);
    expect(again?.exhausted).toBe(true);
    const blocked = draw(s);
    expect(blocked.briefing.notes.some((n) => n.startsWith('action_unavailable:draw_contingency'))).toBe(true);
  });
});

describe('the Treasury allowance', () => {
  it('is sized to the campaign, not fixed', () => {
    const [b, d, c] = (['brigade', 'division', 'corps'] as const).map((x) => newGame(11, x));
    expect(costPenaltyThreshold(b)).toBe(P.cost_pc_allowance_per_month * P.deadline_brigade);
    expect(costPenaltyThreshold(d)).toBe(P.cost_pc_allowance_per_month * P.deadline_division);
    expect(costPenaltyThreshold(c)).toBe(P.cost_pc_allowance_per_month * P.deadline_corps);
    expect(costPenaltyThreshold(b)).toBeLessThan(costPenaltyThreshold(d));
    expect(costPenaltyThreshold(d)).toBeLessThan(costPenaltyThreshold(c));
    // Raising spending still doubles whatever the allowance is.
    expect(costPenaltyThreshold({ ...d, spendingRaised: true })).toBe(costPenaltyThreshold(d) * P.raise_spending_threshold_multiplier);
  });

  it('leaves the contingency worth less than one whole step at Corps', () => {
    // The load-bearing property of the level: if the Equipment Plan's
    // contingency clears a whole allowance on its own, drawing it wins
    // everywhere and the fork `draw_contingency` exists for closes. See the
    // parameter's rationale and docs/design-review.md F13.
    expect(P.equipment_plan_contingency).toBeLessThan(costPenaltyThreshold(newGame(11, 'corps')));
  });

  it('charges the mounting bill at Division, where a flat threshold never did', () => {
    let s = newGame(11, 'division');
    s.ledger.cumulativeCost = costPenaltyThreshold(s) * 1.2;
    s = step(s, NOTHING);
    expect(s.briefing.pcReasons.some((r) => r.label.startsWith('Treasury pressure'))).toBe(true);
  });
});

describe('cumulative output loss', () => {
  it('is reported and never charged', () => {
    // The GDP arm reaches the player through the scoring screen and one event
    // trigger. It costs no political capital, because the game never removes
    // enough people from the workforce for a penalty on a share of annual GDP
    // to be in reach (docs/design-review.md F13).
    const base = step(newGame(13, 'division'), NOTHING);
    const loud = newGame(13, 'division');
    loud.ledger.cumulativeGdpLoss = P.uk_gdp_2025; // a year of national output
    const after = step(loud, NOTHING);
    expect(after.politicalCapital).toBe(base.politicalCapital);
    expect(after.briefing.pcReasons.map((r) => r.label)).toEqual(base.briefing.pcReasons.map((r) => r.label));
    expect(score(after).gdpLossPctGdp).toBeCloseTo(100, 6);
  });
});

describe('the age band as a priced clause', () => {
  const clauses = (ageBand: '18-25' | '18-30' | '26-40' | '18-65') =>
    ({ ageBand, includeWomen: true, medical: 'peacetime', exemptions: 'broad' }) as const;

  it('charges the band on introduction and the difference on amendment', () => {
    let s = newGame(17, 'corps');
    const before = s.politicalCapital;
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses: clauses('26-40') }], eventChoice: null });
    expect(s.politicalCapital).toBe(before + P.pc_cost_bill_emergency + P.pc_cost_band_26_40 - P.pc_baseline_drain);

    // Widening costs the difference, not the whole of the wider band.
    const mid = s.politicalCapital;
    s = step(s, { actions: [{ id: 'amend_bill', clauses: { ageBand: '18-65' } }], eventChoice: null });
    expect(s.politicalCapital).toBe(mid + (P.pc_cost_band_18_65 - P.pc_cost_band_26_40) - P.pc_baseline_drain);

    // Narrowing back refunds it: the Bill is being narrowed, and the House
    // is being asked for less than it has already given.
    const wide = s.politicalCapital;
    s = step(s, { actions: [{ id: 'amend_bill', clauses: { ageBand: '18-30' } }], eventChoice: null });
    expect(s.politicalCapital).toBe(wide + (P.pc_cost_band_18_30 - P.pc_cost_band_18_65) - P.pc_baseline_drain);
  });

  it('prices the two bands that clear the refusal threshold', () => {
    // 26-40 and 18-65 both lift willingness over willingness_low_threshold_pct
    // and so switch off a standing monthly charge. Neither may be free.
    for (const b of ['26-40', '18-65'] as const) {
      const s = newGame(17, 'division');
      s.clauses = { ...clauses(b) };
      expect(effectiveWillingness(s)).toBeGreaterThanOrEqual(P.willingness_low_threshold_pct);
      expect(ageBandClauseCost(b)).toBeLessThan(0);
    }
    for (const b of ['18-25', '18-30'] as const) {
      const s = newGame(17, 'division');
      s.clauses = { ...clauses(b) };
      expect(effectiveWillingness(s)).toBeLessThan(P.willingness_low_threshold_pct);
    }
    // The wider reach is the dearer one.
    expect(ageBandClauseCost('18-65')).toBeLessThan(ageBandClauseCost('26-40'));
  });

  it('costs the older band training attrition, on the cohorts it raised', () => {
    expect(cohortAttrition('normal', 'peacetime', '26-40'))
      .toBeCloseTo(cohortAttrition('normal', 'peacetime', '18-30') + P.attrition_age_add_26_40, 9);
    // It lands on throughput, which is where a band's cost can actually be
    // felt: the eligible pool never binds (docs/design-review.md F3, F4).
    expect(P.attrition_age_add_26_40).toBeGreaterThan(0);

    // A cohort keeps the band it was raised under, exactly as it keeps the
    // medical standard: amending the Bill cannot change who is on the course.
    let s = newGame(17, 'corps');
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses: clauses('26-40') }], eventChoice: null });
    while (s.billStatus !== 'passed') s = step(s, NOTHING);
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 3000 }], eventChoice: null });
    const raised = s.trainingCohorts.filter((c) => c.size > 0);
    expect(raised.length, 'no cohort was raised').toBeGreaterThan(0);
    expect(raised.every((c) => c.ageBand === '26-40')).toBe(true);
    s = step(s, { actions: [{ id: 'amend_bill', clauses: { ageBand: '18-25' } }], eventChoice: null });
    expect(s.trainingCohorts.some((c) => c.ageBand === '26-40')).toBe(true);
  });
});

describe("the Chancellor's letter", () => {
  // The scripted strategies always take choice 0, so the balance harness never
  // exercises the second arm and cannot catch a regression in it. Test it here.
  const letter = (): GameEvent => {
    const e = DECK.find((x) => x.id === 'treasury_letter');
    expect(e, 'treasury_letter is no longer in the deck').toBeDefined();
    return e!;
  };

  function stateWithOrder(): GameState {
    let s = newGame(23, 'corps');
    s = step(s, { actions: [{ id: 'equipment_buy' }, { id: 'expand_capacity' }], eventChoice: null });
    expect(s.equipmentArrivalMonth, 'no order to delay').not.toBeNull();
    return s;
  }

  it('answers the Treasury out of the equipment programme, not only out of capital', () => {
    const s = stateWithOrder();
    const arm = letter().choices[1];
    expect(arm.effects.some((e) => e.type === 'equipment_delay')).toBe(true);

    const before = s.equipmentArrivalMonth!;
    const pcBefore = s.politicalCapital;
    const after = structuredClone(s);
    const out = applyEffects(after, arm.effects);
    expect(after.equipmentArrivalMonth).toBe(before + 2);
    expect(after.politicalCapital).toBe(pcBefore - 3);
    expect(out.pcDelta).toBe(-3);
    expect(out.notes).toContain('equipment_delay:2');
  });

  it('costs only the capital when there is no order to slip', () => {
    // Nothing to delay is not a bug: the minister who has bought no equipment
    // has nothing for the Treasury to take, and pays the smaller political bill.
    const s = newGame(23, 'corps');
    expect(s.equipmentArrivalMonth).toBeNull();
    const after = structuredClone(s);
    applyEffects(after, letter().choices[1].effects);
    expect(after.equipmentArrivalMonth).toBeNull();
    expect(after.politicalCapital).toBe(s.politicalCapital - 3);
  });

  it('leaves the first arm a real cut rather than a political one', () => {
    const s = stateWithOrder();
    expect(s.capacityPurchases).toBe(1);
    const after = structuredClone(s);
    const out = applyEffects(after, letter().choices[0].effects);
    expect(after.capacityPurchases).toBe(0);
    expect(out.pcDelta).toBe(0);
  });
});

describe('political capital for delivery', () => {
  const DELIVERY = /Soldiers reaching their units/;

  it('pays nothing to a minister who delivers nobody', () => {
    let s = newGame(5, 'division');
    for (let i = 0; i < 6; i += 1) {
      s = step(s, NOTHING);
      expect(s.briefing.graduations).toBe(0);
      expect(s.briefing.arrivals).toHaveLength(0);
      expect(s.briefing.pcReasons.some((r) => DELIVERY.test(r.label)), `month ${s.turn}`).toBe(false);
    }
  });

  it('pays a point per threshold delivered, capped, in the month they arrive', () => {
    let s = newGame(5, 'brigade');
    s = step(s, { actions: [{ id: 'call_out_reserve', notice: 90 }], eventChoice: null });
    let paidMonths = 0;
    while (!s.over) {
      const delivered = s.briefing.graduations + s.briefing.arrivals.reduce((a, x) => a + x.count, 0);
      const expected = Math.min(P.pc_delivery_max, Math.floor(delivered / P.pc_delivery_per_credit));
      const credit = s.briefing.pcReasons.find((r) => DELIVERY.test(r.label));
      expect(credit?.delta ?? 0, `month ${s.turn}, ${delivered} delivered`).toBe(expected);
      if (expected > 0) paidMonths += 1;
      s = step(s, NOTHING);
    }
    expect(paidMonths, 'the reserves arrived and earned nothing').toBeGreaterThan(0);
  });

  it('never pays for the regular pipeline, which arrives whatever the minister does', () => {
    let s = newGame(5, 'division');
    const before = s.pools.regularTrained;
    s = step(s, NOTHING);
    expect(s.pools.regularTrained, 'the regular pipeline did not run').not.toBe(before);
    expect(s.briefing.pcReasons.some((r) => DELIVERY.test(r.label))).toBe(false);
  });

  it('is reachable at every difficulty, unlike the momentum bonus it replaced', () => {
    for (const difficulty of ['brigade', 'division', 'corps'] as const) {
      let s = newGame(5, difficulty);
      s = step(s, { actions: [{ id: 'call_out_reserve', notice: 90 }], eventChoice: null });
      let earned = 0;
      while (!s.over) {
        earned += s.briefing.pcReasons.filter((r) => DELIVERY.test(r.label)).reduce((a, r) => a + r.delta, 0);
        s = step(s, NOTHING);
      }
      earned += s.briefing.pcReasons.filter((r) => DELIVERY.test(r.label)).reduce((a, r) => a + r.delta, 0);
      expect(earned, `nothing earned at ${difficulty}`).toBeGreaterThan(0);
    }
  });
});

describe('a government seen to be doing nothing', () => {
  it('tolerates two idle months, then charges for every one after', () => {
    let s = newGame(5, 'division');
    const idleLabel = /doing nothing/;
    for (let i = 0; i < P.pc_idle_grace_months; i += 1) {
      s = step(s, NOTHING);
      expect(s.idleMonths).toBe(i + 1);
      expect(s.briefing.pcReasons.some((r) => idleLabel.test(r.label)), 'charged inside the grace').toBe(false);
    }
    s = step(s, NOTHING);
    const charge = s.briefing.pcReasons.find((r) => idleLabel.test(r.label));
    expect(charge, 'no penalty after the grace ran out').toBeDefined();
    expect(charge!.delta).toBe(-P.pc_idle_penalty);
    expect(s.briefing.notes).toContain(`idle_months:${P.pc_idle_grace_months + 1}`);
  });

  it('resets the run when a lever is actually pulled', () => {
    let s = newGame(5, 'division');
    s = step(s, NOTHING);
    s = step(s, NOTHING);
    expect(s.idleMonths).toBe(2);
    s = step(s, { actions: [{ id: 'stop_loss' }], eventChoice: null });
    expect(s.idleMonths).toBe(0);
    s = step(s, NOTHING);
    expect(s.briefing.pcReasons.some((r) => /doing nothing/.test(r.label))).toBe(false);
  });

  it('does not count re-entering the same call-up as a lever', () => {
    const clauses = { ageBand: '18-30', includeWomen: true, medical: 'relaxed', exemptions: 'broad' } as const;
    let s = newGame(5, 'division');
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses }], eventChoice: null });
    while (s.billStatus !== 'passed' && !s.over) s = step(s, NOTHING);
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 5000 }], eventChoice: null });
    expect(s.idleMonths).toBe(0);
    // Re-entering the same figure changes nothing and does not reset the run.
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 5000 }], eventChoice: null });
    expect(s.idleMonths).toBe(1);
    // Changing it is a decision.
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 4000 }], eventChoice: null });
    expect(s.idleMonths).toBe(0);
  });
});

describe('event cadence', () => {
  useRealDeck();

  it('shows an event every month that has one, on every difficulty', () => {
    for (const difficulty of ['brigade', 'division', 'corps'] as const) {
      for (const seed of ['churchill', 'attlee', '7']) {
        let s = newGame(seed, difficulty);
        let months = 0;
        let withEvent = 0;
        while (!s.over) {
          s = step(s, STRATEGIES.capacity_heavy(s));
          months += 1;
          if (s.pendingEvent) withEvent += 1;
          // The deck never offers an event on the last month: the game is over.
          if (!s.over) expect(eligibleEvents(s).length === 0 || s.pendingEvent != null).toBe(true);
        }
        expect(months).toBeGreaterThan(1);
        expect(withEvent, `${difficulty}/${seed}: too quiet`).toBeGreaterThanOrEqual(Math.floor((months - 1) * 0.6));
      }
    }
  });

  it('keeps a repeatable event to its cooldown and its cap', () => {
    const limits = new Map(DECK.filter((e) => e.trigger.repeatable).map((e) => [e.id, e.trigger]));
    for (const difficulty of ['division', 'corps'] as const) {
      for (const seed of ['churchill', '11', '12']) {
        let s = newGame(seed, difficulty);
        while (!s.over) s = step(s, STRATEGIES.capacity_heavy(s));
        const turnsById = new Map<string, number[]>();
        for (const e of s.eventLog) turnsById.set(e.eventId, [...(turnsById.get(e.eventId) ?? []), e.turn]);
        for (const [id, turns] of turnsById) {
          const t = limits.get(id);
          expect(turns.length, `${id} fired ${turns.length} times`).toBeLessThanOrEqual(t?.maxFires ?? 1);
          for (let i = 1; i < turns.length; i += 1) {
            expect(turns[i] - turns[i - 1], `${id} repeated too soon`).toBeGreaterThanOrEqual(t!.cooldownMonths!);
          }
        }
      }
    }
  });
});

describe('the vetting queue', () => {
  // The deck stays empty: these tests apply the three events' effects directly
  // and ask whether a trigger passes, so nothing depends on what the draw
  // happens to offer.
  const clauses = { ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' } as const;

  /** A game with the Act in force and a call-up set well above any ceiling. */
  function conscripting(seed: number, callup = 20_000): GameState {
    let s = newGame(seed, 'corps');
    s = step(s, { actions: [{ id: 'introduce_bill', procedure: 'emergency', clauses }], eventChoice: null });
    s = idle(s, P.bill_months_emergency - 1);
    expect(s.billStatus).toBe('passed');
    return step(s, { actions: [{ id: 'set_callup', perMonth: callup }], eventChoice: null });
  }

  const event = (id: string): GameEvent => DECK.find((e) => e.id === id)!;

  /** Apply one event's choice to a state without waiting for the deck to draw it. */
  function choose(s: GameState, eventId: string, choice: number): GameState {
    const next = structuredClone(s);
    applyEffects(next, event(eventId).choices[choice].effects);
    return next;
  }

  const triggers = (s: GameState, id: string): boolean => eventEligible(event(id), s, conditionVars(s));

  it('holds the call-up to the ceiling and lifts it when the backlog clears', () => {
    const before = conscripting(31);
    const calledFree = before.conscriptsCalledTotal;
    expect(calledFree).toBeGreaterThan(5_000);

    // "Leave it to them": a ceiling of 2,000 a month for six months.
    let s = choose(before, 'vetting_backlog', 2);
    expect(s.callupCapPerMonth).toBe(P.vetting_throughput_monthly);
    expect(s.callupCapUntil).toBe(s.turn + 6);

    const calledBefore = s.conscriptsCalledTotal;
    s = step(s, NOTHING);
    expect(s.conscriptsCalledTotal - calledBefore).toBe(P.vetting_throughput_monthly);
    expect(s.briefing.notes.some((n) => n.startsWith('callup_capped:'))).toBe(true);

    // Five more months under the ceiling, then it expires.
    for (let i = 0; i < 5; i += 1) s = step(s, NOTHING);
    expect(s.callupCapPerMonth).toBe(2000);
    s = step(s, NOTHING);
    expect(s.briefing.notes).toContain('callup_cap_lifted');
    expect(s.callupCapPerMonth).toBeNull();
    const uncapped = s.conscriptsCalledTotal;
    s = step(s, NOTHING);
    expect(s.conscriptsCalledTotal - uncapped).toBeGreaterThan(P.vetting_throughput_monthly);
  });

  it('leaves the call-up alone on the other two branches', () => {
    const base = conscripting(32);
    for (const choice of [0, 1]) {
      const s = step(choose(base, 'vetting_backlog', choice), NOTHING);
      expect(s.callupCapPerMonth).toBeNull();
      expect(s.briefing.notes.some((n) => n.startsWith('callup_capped:'))).toBe(false);
    }
    // Lowering the threshold also releases the volunteers stuck in the queue.
    const relaxed = choose(base, 'vetting_backlog', 1);
    expect(relaxed.pools.regularUntrained - base.pools.regularUntrained).toBeCloseTo(1500, 6);
  });

  it('brings the Commissioner two months after the military take priority', () => {
    let s = choose(conscripting(33), 'vetting_backlog', 0);
    expect(s.vettingPriorityMonth).toBe(s.turn);
    expect(triggers(s, 'police_vetting_row')).toBe(false);
    s = idle(s, 2);
    expect(triggers(s, 'police_vetting_row')).toBe(true);

    // Returning the slots ends the priority and puts the ceiling back on.
    const returned = choose(s, 'police_vetting_row', 0);
    expect(returned.vettingPriorityMonth).toBeNull();
    expect(returned.callupCapPerMonth).toBe(P.vetting_throughput_monthly);
    // Holding it costs capital now and again at the scoring table.
    const held = choose(s, 'police_vetting_row', 1);
    expect(held.politicalCapital).toBe(s.politicalCapital - 5);
    expect(held.scoringPcIfMissed).toBe(s.scoringPcIfMissed - 2);
    expect(held.callupCapPerMonth).toBeNull();
  });

  it('lets a bad character through three months after the threshold is lowered', () => {
    let s = choose(conscripting(34), 'vetting_backlog', 1);
    expect(s.vettingRelaxedMonth).toBe(s.turn);
    s = idle(s, 2);
    expect(triggers(s, 'vetting_failure')).toBe(false);
    s = idle(s, 1);
    expect(triggers(s, 'vetting_failure')).toBe(true);

    // Re-screening restores the standard and slows the call-up while it runs.
    const rescreened = choose(s, 'vetting_failure', 0);
    expect(rescreened.vettingRelaxedMonth).toBeNull();
    expect(rescreened.callupCapPerMonth).toBe(P.vetting_rescreen_throughput_monthly);
    expect(rescreened.callupCapUntil).toBe(s.turn + 4);
    // Brazening it out keeps the shortened check and costs capital and willingness.
    const brazen = choose(s, 'vetting_failure', 1);
    expect(brazen.vettingRelaxedMonth).toBe(s.vettingRelaxedMonth);
    expect(brazen.politicalCapital).toBe(s.politicalCapital - 6);
    expect(brazen.willingnessBoosts.at(-1)).toEqual({ delta: -3, until: s.turn + 6 });
  });

  it('takes the ceiling from the parameter, not from the event', () => {
    const s = choose(conscripting(36), 'vetting_backlog', 2);
    expect(s.callupCapParam).toBe('vetting_throughput_monthly');
    expect(s.callupCapPerMonth).toBe(P.vetting_throughput_monthly);
    // No callup_cap effect in the deck may carry its own magnitude.
    for (const ev of DECK) {
      for (const c of ev.choices) {
        for (const eff of c.effects) {
          if (eff.type === 'callup_cap') expect((eff as { perMonth?: number }).perMonth).toBeUndefined();
        }
      }
    }
  });

  it('keeps the tighter ceiling and the later expiry when two congestions overlap', () => {
    const s = conscripting(35);
    const both = choose(choose(s, 'vetting_backlog', 2), 'vetting_failure', 0);
    expect(both.callupCapPerMonth).toBe(P.vetting_rescreen_throughput_monthly);
    expect(both.callupCapUntil).toBe(s.turn + 6);
  });
});

describe('determinism', () => {
  useRealDeck();

  it('same seed and same inputs give deep-equal states (with the event deck on disk)', () => {
    const play = () => {
      let s = newGame('churchill', 'corps');
      const inputs: TurnInput[] = [];
      while (!s.over) {
        const input = STRATEGIES.capacity_heavy(s);
        inputs.push(structuredClone(input));
        s = step(s, input);
      }
      return { s, inputs };
    };
    const a = play();
    const b = play();
    expect(a.inputs).toEqual(b.inputs);
    expect(a.s).toEqual(b.s);
    // Replaying the recorded inputs reproduces the state too.
    let r = newGame('churchill', 'corps');
    for (const i of a.inputs) r = step(r, i);
    expect(r).toEqual(a.s);
    // A different seed diverges in RNG state at least.
    expect(newGame('attlee', 'corps').rngState).not.toBe(a.s.seed);
  });

  it('step does not mutate its input', () => {
    const s = newGame(43, 'division');
    const frozen = structuredClone(s);
    step(s, { actions: [{ id: 'stop_loss' }, { id: 'expand_capacity' }], eventChoice: 0 });
    expect(s).toEqual(frozen);
  });
});
