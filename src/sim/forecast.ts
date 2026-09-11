/**
 * forecast.ts — where the decisions already taken will land (spec §7.1).
 *
 * The player's problem is that almost everything in this game arrives late:
 * the Bill takes three months, a training place takes two, a course takes
 * eight, reservists take three to six. Without a projection the gauges only
 * report the past, and the lag is invisible until the deadline.
 *
 * `forecast(state)` runs the pipeline forward to the deadline and reports the
 * Force Ready it would reach. It holds constant every decision in force —
 * the call-up figure, the syllabus, the capacity bought, the recalls under
 * way — and assumes nothing further is decided. It does not run the politics
 * and it does not draw from the event deck: neither is knowable a month
 * ahead, and a projection that guessed at them would be a prediction of the
 * seed rather than a statement about the decisions.
 *
 * Pure, and cheap: at most `deadlineMonths` months on one clone.
 */
import type { GameState } from '../types.js';
import { computeForce } from './effectiveness.js';
import { syncDerivedPools } from './pools.js';
import { advanceMonth } from './step.js';

export interface Forecast {
  /** Force Ready (ESE) at the deadline if nothing further is decided. */
  forceReady: number;
  /** The same as a percentage of the target. */
  forceReadyPct: number;
  /** Months of pipeline the projection ran. Zero once the deadline is reached. */
  monthsProjected: number;
  /** Whether the projection reaches the target. */
  meetsTarget: boolean;
}

export function forecast(state: GameState): Forecast {
  const s = structuredClone(state);
  const monthsProjected = Math.max(0, s.deadlineMonths - s.turn);
  // Scratch collectors: the projection reports a number, not a narrative.
  const arrivals: { label: string; count: number }[] = [];
  const notes: string[] = [];

  for (let m = 0; m < monthsProjected; m++) {
    // The one-off £ accumulators are per-turn in `step`; keep them so here
    // too, or a capacity purchase would be charged every projected month.
    s.ledger.costBreakdown.capacity = 0;
    s.ledger.costBreakdown.other = 0;
    s.turn += 1;
    advanceMonth(s, arrivals, notes, { expectedDraws: true });
  }

  syncDerivedPools(s);
  const f = computeForce(s);
  return {
    forceReady: f.forceReady,
    forceReadyPct: s.target > 0 ? (f.forceReady / s.target) * 100 : 0,
    monthsProjected,
    meetsTarget: f.forceReady >= s.target,
  };
}
