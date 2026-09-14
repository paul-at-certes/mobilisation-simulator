/**
 * The Permanent Secretary's pencilled margin line (src/ui/pencil.ts).
 *
 * The claims worth holding: it is silent on Day 0 and when nothing new
 * applies; the most urgent condition wins; it names the month something
 * ordered will land; and it is deterministic for a given state.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GameState } from '../src/types.js';
import { setEvents } from '../src/sim/content.js';
import { newGame, step } from '../src/sim/step.js';
import { forecast } from '../src/sim/forecast.js';
import { pencilNote } from '../src/ui/pencil.js';

beforeAll(() => setEvents([]));
afterAll(() => setEvents([]));

const note = (s: GameState) => pencilNote(s, forecast(s));
const idle = (s: GameState, months: number) => {
  let cur = s;
  for (let i = 0; i < months; i++) cur = step(cur, { actions: [], eventChoice: null });
  return cur;
};

describe('pencilNote', () => {
  it('writes nothing on Day 0: the Prime Minister has that margin', () => {
    expect(note(newGame(1, 'division'))).toBeNull();
  });

  it('notes an idle department after two months of no decisions', () => {
    const s = idle(newGame(1, 'division'), 2);
    expect(s.idleMonths).toBeGreaterThanOrEqual(2);
    expect(note(s)).toBe('still nothing on the books.');
  });

  it('names the month the first ordered arrival lands', () => {
    let s = newGame(1, 'division');
    s = step(s, { actions: [{ id: 'call_out_reserve', notice: 180 }], eventChoice: null });
    const first = Math.min(...s.reserveArrivals.map((a) => a.arrivalMonth));
    expect(first).toBeGreaterThan(s.turn);
    expect(note(s)).toBe(`nothing lands before month ${first}.`);
  });

  it('puts the Prime Minister ahead of the pipeline', () => {
    let s = newGame(1, 'division');
    s = step(s, { actions: [{ id: 'call_out_reserve', notice: 180 }], eventChoice: null });
    s = structuredClone(s);
    s.gauges.politicalCapital = 12;
    // Two candidates apply; month 1 takes the second, month 2 the first.
    expect(note(s)).toMatch(/PM is asking|nothing lands/);
    s.turn = 2;
    expect(note(s)).toBe('the PM is asking questions.');
  });

  it('is short, lower case and deterministic', () => {
    let s = newGame(3, 'brigade');
    const seen: string[] = [];
    while (!s.over) {
      const n = note(s);
      if (n) {
        expect(n.length).toBeLessThanOrEqual(64);
        expect(n).toMatch(/^[a-z]/);
        expect(note(structuredClone(s))).toBe(n);
        seen.push(n);
      }
      s = step(s, { actions: [], eventChoice: null });
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(note(s)).toBeNull();
  });
});
