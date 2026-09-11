/**
 * The projection under Force Ready (docs/sim-spec.md §7.1).
 *
 * The claim the UI makes is narrow and testable: hold every decision in
 * force, take no others, let no events fire, and this is where Force Ready
 * lands. The central test therefore plays that future for real — with the
 * deck empty and no actions — and asserts the projection matched it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameState, TurnInput } from '../src/types.js';
import { setEvents } from '../src/sim/content.js';
import { newGame, step } from '../src/sim/step.js';
import { forecast } from '../src/sim/forecast.js';

const NOTHING: TurnInput = { actions: [], eventChoice: null };

/** An empty deck: the projection's own premise is that no event fires. */
beforeAll(() => setEvents([]));
afterAll(() => setEvents([]));

function playOut(s: GameState): GameState {
  let cur = s;
  while (!cur.over) cur = step(cur, NOTHING);
  return cur;
}

describe('forecast', () => {
  it('matches the future it describes: no further actions, no events', () => {
    const start = newGame(42, 'division');
    const projected = forecast(start);
    const realised = playOut(start);

    expect(realised.turn).toBe(start.deadlineMonths);
    expect(projected.monthsProjected).toBe(start.deadlineMonths);
    expect(projected.forceReady).toBeCloseTo(realised.gauges.forceReady, 6);
  });

  it('matches after decisions have been taken and are still in flight', () => {
    // Reserves called out, ex-regulars recalled, a trace running, a bill
    // passed and a call-up standing: five clocks, none of them finished.
    let s = newGame(7, 'division');
    s = step(s, { actions: [{ id: 'call_out_reserve', notice: 90 }, { id: 'recall_ex_regular' }], eventChoice: null });
    s = step(s, {
      actions: [
        { id: 'trace_strategic_reserve' },
        { id: 'introduce_bill', procedure: 'emergency', clauses: { ageBand: '18-30', includeWomen: true, medical: 'relaxed', exemptions: 'broad' } },
      ],
      eventChoice: null,
    });
    s = step(s, { actions: [{ id: 'expand_capacity' }, { id: 'equipment_buy' }], eventChoice: null });
    s = step(s, { actions: [], eventChoice: null });
    s = step(s, { actions: [{ id: 'set_callup', perMonth: 3000 }], eventChoice: null });
    expect(s.billStatus).toBe('passed');
    expect(s.over).toBe(false);

    const projected = forecast(s);
    const realised = playOut(s);
    expect(projected.monthsProjected).toBe(s.deadlineMonths - s.turn);
    expect(projected.forceReady).toBeCloseTo(realised.gauges.forceReady, 6);
  });

  it('does not consume the run’s randomness or mutate the state', () => {
    const s = newGame(99, 'corps');
    const before = JSON.stringify(s);
    forecast(s);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('projects an outstanding trace at the mid-point of its yield range, not a draw', () => {
    // Two states identical but for the generator: a projection that drew from
    // it would disagree with itself; one that takes the mid-point cannot.
    let a = newGame(1, 'division');
    a = step(a, { actions: [{ id: 'trace_strategic_reserve' }], eventChoice: null });
    const b: GameState = structuredClone(a);
    b.rngState = (a.rngState ^ 0x5f3759df) >>> 0;
    expect(forecast(b).forceReady).toBeCloseTo(forecast(a).forceReady, 9);
  });

  it('is the current Force Ready once the deadline is reached', () => {
    const s = playOut(newGame(3, 'brigade'));
    const f = forecast(s);
    expect(f.monthsProjected).toBe(0);
    expect(f.forceReady).toBeCloseTo(s.gauges.forceReady, 6);
  });

  it('reports progress against the target', () => {
    const s = newGame(5, 'division');
    const f = forecast(s);
    expect(f.forceReadyPct).toBeCloseTo((f.forceReady / s.target) * 100, 6);
    // Day 0, nothing decided: the projection is the do-nothing outcome, and
    // the do-nothing outcome is nowhere near a division.
    expect(f.meetsTarget).toBe(false);
    expect(f.forceReady).toBeGreaterThan(0);
    expect(f.forceReady).toBeLessThan(s.target);
  });
});
