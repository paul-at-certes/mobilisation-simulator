/**
 * Fuzz invariants (docs/sim-spec.md §12): 1,000 runs with random seeds,
 * difficulties, random legal actions and random event choices.
 *
 * Even-numbered runs use the event deck on disk; odd-numbered runs empty the
 * deck so the two conservation laws can be checked exactly (events are
 * allowed to add and remove people).
 */
import { afterAll, describe, expect, it } from 'vitest';
import type { Action, ActionId, GameState, PoolKey, TurnInput } from '../src/types.js';
import { P } from '../src/sim/params.js';
import { getEvents, setEvents } from '../src/sim/content.js';
import { newGame, step } from '../src/sim/step.js';
import { availableActions } from '../src/sim/actions.js';
import { findEvent } from '../src/sim/events.js';
import { next } from '../src/sim/rng.js';
import { POOL_KEYS } from '../src/sim/pools.js';

const RUNS = 1000;
const DIFFICULTIES = ['brigade', 'division', 'corps'] as const;
const AGE_BANDS = ['18-25', '18-30', '26-40', '18-65'] as const;
const MEDICALS = ['peacetime', 'relaxed', 'wartime'] as const;
const EXEMPTIONS = ['strict', 'broad', 'minimal'] as const;

/** A tiny test-side RNG (independent of the game's) for choosing actions. */
class Dice {
  constructor(private state: number) {}
  float(): number {
    const r = next(this.state);
    this.state = r.state;
    return r.value;
  }
  int(n: number): number {
    return Math.floor(this.float() * n);
  }
  pick<T>(xs: readonly T[]): T {
    return xs[this.int(xs.length)];
  }
}

function randomAction(d: Dice, id: ActionId): Action {
  switch (id) {
    case 'call_out_reserve':
      return { id, notice: d.pick([180, 90] as const) };
    case 'introduce_bill':
      return {
        id,
        procedure: d.pick(['emergency', 'normal'] as const),
        clauses: { ageBand: d.pick(AGE_BANDS), includeWomen: d.float() < 0.7, medical: d.pick(MEDICALS), exemptions: d.pick(EXEMPTIONS) },
      };
    case 'amend_bill': {
      const clauses: Partial<Action & { id: 'amend_bill' }>['clauses'] = {};
      if (d.float() < 0.5) clauses.ageBand = d.pick(AGE_BANDS);
      if (d.float() < 0.5) clauses.includeWomen = d.float() < 0.7;
      if (d.float() < 0.5) clauses.medical = d.pick(MEDICALS);
      if (d.float() < 0.5) clauses.exemptions = d.pick(EXEMPTIONS);
      return { id, clauses };
    }
    case 'set_callup':
      return { id, perMonth: d.pick([0, 500, 2000, 5000, 20000, 100000]) };
    default:
      return { id } as Action;
  }
}

function randomInput(d: Dice, s: GameState): TurnInput {
  const actions: Action[] = [];
  const avail = availableActions(s).filter((a) => a.available);
  const paid = avail.filter((a) => a.id !== 'set_callup');
  const nPaid = d.int(P.actions_per_turn + 2); // occasionally over the limit, which must be ignored
  for (let i = 0; i < nPaid && paid.length > 0; i++) actions.push(randomAction(d, d.pick(paid).id));
  if (avail.some((a) => a.id === 'set_callup') && d.float() < 0.7) actions.push(randomAction(d, 'set_callup'));
  if (d.float() < 0.05) actions.push({ id: 'not_a_real_action' } as unknown as Action);
  const ev = findEvent(s.pendingEvent);
  const eventChoice = ev && ev.choices.length > 0 ? d.int(ev.choices.length) : null;
  return { actions, eventChoice };
}

function assertFinitePools(s: GameState, ctx: string): void {
  for (const k of POOL_KEYS) {
    const v = s.pools[k as PoolKey];
    if (!(Number.isFinite(v) && v >= -1e-6)) throw new Error(`${ctx}: pool ${k} = ${v}`);
  }
  for (const c of s.trainingCohorts) if (!(Number.isFinite(c.size) && c.size >= 0)) throw new Error(`${ctx}: training cohort size ${c.size}`);
  for (const c of s.trainedCohorts) if (!(Number.isFinite(c.size) && c.size >= 0)) throw new Error(`${ctx}: trained cohort size ${c.size}`);
}

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

describe('fuzz invariants', () => {
  const deck = getEvents();
  afterAll(() => setEvents(deck));

  it(`${RUNS} random games respect the invariants`, () => {
    let withEvents = 0;
    let eventsFired = 0;
    for (let run = 0; run < RUNS; run++) {
      const useEvents = run % 2 === 0;
      setEvents(useEvents ? deck : []);
      if (useEvents) withEvents++;
      const d = new Dice(1000 + run);
      const seed = d.int(2 ** 31);
      const difficulty = d.pick(DIFFICULTIES);
      const inputs: TurnInput[] = [];
      let s = newGame(seed, difficulty);
      let prev = s;
      let attritionLost = 0;
      let months = 0;
      const ctx = () => `run ${run} (seed ${seed}, ${difficulty}, events ${useEvents}) turn ${s.turn}`;
      assertFinitePools(s, ctx());
      let guard = 0;
      while (!s.over) {
        check(guard++ < 100, `${ctx()}: game did not end`);
        const input = randomInput(d, s);
        inputs.push(structuredClone(input));
        prev = s;
        s = step(s, input);
        if (s.eventLog.length > prev.eventLog.length) eventsFired++;
        if (s.turn > prev.turn) {
          months += 1;
          // Cohorts that graduated this step lost (entrants − graduates) to attrition.
          const entrants = prev.trainingCohorts.filter((c) => c.graduationMonth <= s.turn).reduce((a, c) => a + c.size, 0);
          attritionLost += entrants - s.briefing.graduations;
        }
        const c = ctx();
        assertFinitePools(s, c);
        const g = s.gauges;
        check(g.forceReady <= g.headcountCounted + 1e-6, `${c}: forceReady ${g.forceReady} > headcount ${g.headcountCounted}`);
        check(g.forceQuality >= 0 && g.forceQuality <= 1 + 1e-9, `${c}: quality ${g.forceQuality}`);
        check(g.leadershipFactor >= 0 && g.leadershipFactor <= 1, `${c}: leadership ${g.leadershipFactor}`);
        check(s.ledger.cumulativeCost >= prev.ledger.cumulativeCost - 1e-6, `${c}: cost decreased`);
        check(s.ledger.cumulativeGdpLoss >= prev.ledger.cumulativeGdpLoss - 1e-6, `${c}: gdp loss decreased`);
        check(Number.isFinite(s.politicalCapital), `${c}: PC not finite`);
        check(s.turn <= s.deadlineMonths, `${c}: past deadline`);
        check(s.history.length === s.turn + 1 || s.over, `${c}: history length ${s.history.length}`);
        if (!useEvents) {
          // Regulars: trained + untrained + outflow + diverted = start + intake × months.
          const regulars = s.pools.regularTrained + s.pools.regularUntrained + s.ledger.regularOutflowToDate + s.ledger.juniorLeadersDiverted;
          const expected = P.regular_trained_start + P.regular_untrained_start + (P.regular_untrained_intake_annual / 12) * months;
          check(Math.abs(regulars - expected) < 1e-3, `${c}: regulars ${regulars} ≠ ${expected}`);
          // Conscripts: called total = called + holding + training + trained
          // + attrition lost + those who refused to report (§10a). Refusers
          // leave the eligible pool and never enter the pipeline, so they have
          // to be counted here or the conservation law loses them.
          const serving =
            s.pools.conscriptCalled + s.pools.holdingPool + s.pools.conscriptInTraining + s.pools.conscriptTrainedUnequipped + s.pools.conscriptTrainedEquipped;
          const accounted = serving + attritionLost + s.conscriptsRefusedTotal;
          check(Math.abs(accounted - s.conscriptsCalledTotal) < 1e-3, `${c}: conscripts ${accounted} ≠ ${s.conscriptsCalledTotal}`);
          check(s.conscriptsRefusedTotal >= 0 && s.conscriptsRefusedTotal <= s.conscriptsCalledTotal, `${c}: refused ${s.conscriptsRefusedTotal}`);
          // Reservists are conserved.
          const reserve = s.pools.reserveVolunteerAvailable + s.pools.reserveVolunteerPending + s.pools.reserveVolunteerMobilised;
          check(Math.abs(reserve - P.reserve_volunteer_trained) < 1e-3, `${c}: reserve ${reserve}`);
          const exReg = s.pools.exRegularTracked + s.pools.exRegularReported;
          check(Math.abs(exReg - P.ex_regular_tracked) < 1e-3, `${c}: ex-regulars ${exReg}`);
        }
      }
      check(s.over && (s.turn === s.deadlineMonths || s.overReason !== 'deadline'), `${ctx()}: over ${s.overReason} at ${s.turn}`);
      check(s.turn <= s.deadlineMonths, `${ctx()}: ended after the deadline`);
      // Determinism: replay the recorded inputs from the same seed.
      let r = newGame(seed, difficulty);
      for (const i of inputs) r = step(r, i);
      expect(r).toEqual(s);
    }
    expect(withEvents).toBe(RUNS / 2);
    if (deck.length > 0) expect(eventsFired).toBeGreaterThan(0);
  }, 60_000);
});
