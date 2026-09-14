/**
 * pencil.ts — the line the Permanent Secretary pencils in the margin.
 *
 * The monthly minute is the formal record. This is the private reaction under
 * it: one short line, lower case, at most one a month, and none at all when
 * nothing new deserves one. It carries no figure from the parameter table, so
 * nothing here needs a source; the only numbers it quotes are months already
 * on the game clock.
 *
 * The rules are in priority order and the first that applies wins. When two
 * apply, odd and even months alternate between the top two, because an
 * official who writes the same thing in the margin five months running is
 * not being dry, only repetitive. Pure: same state, same line, so a replay
 * from `?seed=` reads identically.
 */
import type { GameState } from '../types.js';
import type { Forecast } from '../sim/forecast.js';

export function pencilNote(state: GameState, projection: Forecast): string | null {
  // Day 0 carries the Prime Minister's line instead, and a finished run has
  // nothing left to pencil.
  if (state.turn === 0 || state.over || state.turn >= state.deadlineMonths) return null;

  const g = state.gauges;
  const remaining = state.deadlineMonths - state.turn;
  const candidates: string[] = [];

  if (remaining === 1) candidates.push('last month. what is in the pipeline is what there is.');
  if (g.forceReadyPct >= 100) candidates.push('on paper, done.');
  if (g.politicalCapital < 20) candidates.push('the PM is asking questions.');
  if (state.pools.holdingPool >= 1) candidates.push('paid, idle, uncounted. every month.');
  if (g.leadershipFactor < 0.9) candidates.push('corporals. we need corporals.');
  if (projection.monthsProjected > 0 && !projection.meetsTarget && remaining <= 4) candidates.push('the projection will not close this.');
  if (state.idleMonths >= 2) candidates.push('still nothing on the books.');

  const next = nextArrival(state);
  if (next !== null && next > state.turn) candidates.push(`nothing lands before month ${next}.`);

  if (state.billStatus === 'in_progress' && state.billPassesMonth !== null) candidates.push(`royal assent month ${state.billPassesMonth}, then the wait.`);
  if (state.billStatus === 'passed' && state.callupPerMonth === 0 && !state.conscriptionEverActive) candidates.push('the power is on the statute book. unused.');

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates[state.turn % 2];
}

/**
 * The first month anything already ordered reaches the counted force: a
 * reserve cohort reporting, a recall's first returns, a training cohort
 * graduating. Null when nothing is on order.
 */
function nextArrival(state: GameState): number | null {
  const months: number[] = [];
  for (const a of state.reserveArrivals) months.push(a.arrivalMonth);
  for (const c of state.trainingCohorts) months.push(c.graduationMonth);
  if (state.exRegularRecallActive && state.pools.exRegularReported < 1) months.push(state.exRegularRecallMonth + 1);
  if (state.strategicTraceMonth !== null && !state.strategicTraceDone) months.push(state.strategicTraceMonth);
  return months.length ? Math.min(...months) : null;
}
