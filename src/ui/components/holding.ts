/**
 * The holding pool indicator: conscripts called up with nowhere to train.
 *
 * It is shown only when the pool is not empty, because an empty one says
 * nothing. It is the game's central failure mode — a call-up rate above the
 * training estate's spare intake produces paid, idle, uncounted people — so it
 * reports the backlog, the month's change, and what can still be done about
 * it, including the case where the honest answer is nothing.
 */
import type { GameState } from '../../types';
import { h, fmtInt } from '../dom';
import { courseMonths, spareIntake } from '../../sim/pipeline';

export type HoldingVerdict = 'clearable' | 'compress_only' | 'too_late';

export interface HoldingOutlook {
  pool: number;
  delta: number;
  spare: number;
  monthsLeft: number;
  /** Months of the course on the syllabus in force, and on the shortest one. */
  course: number;
  shortest: number;
  /** Months left in which a cohort could start and still graduate by the deadline. */
  startWindow: number;
  /** The same on a compressed syllabus: the best any decision can now buy. */
  bestWindow: number;
  /** How many of them could start in time at the current spare intake. */
  placeable: number;
  verdict: HoldingVerdict;
}

/**
 * Only a conscript who *graduates* counts toward Force Ready, so the question
 * is not when a training place opens but whether one opens early enough to
 * finish the course. A cohort forming in month T graduates in T + course, so
 * the last useful start month is `deadline − course`. Nothing a player can buy
 * shortens the course below the compressed syllabus, which is what makes
 * `too_late` a safe thing to say out loud.
 */
export function holdingOutlook(state: GameState): HoldingOutlook {
  const pool = state.pools.holdingPool;
  const spare = spareIntake(state);
  const course = courseMonths(state.syllabus);
  const shortest = courseMonths('compressed');
  const startWindow = Math.max(0, state.deadlineMonths - course - state.turn);
  const bestWindow = Math.max(0, state.deadlineMonths - shortest - state.turn);
  return {
    pool,
    delta: state.briefing?.holdingPoolDelta ?? 0,
    spare,
    monthsLeft: state.deadlineMonths - state.turn,
    course,
    shortest,
    startWindow,
    bestWindow,
    placeable: Math.floor(spare * startWindow),
    verdict: bestWindow <= 0 ? 'too_late' : startWindow <= 0 ? 'compress_only' : 'clearable',
  };
}

export function renderHoldingPool(state: GameState): HTMLElement | null {
  const o = holdingOutlook(state);
  if (o.pool < 1) return null;

  const change = o.delta > 0 ? `+${fmtInt(o.delta)} this month` : o.delta < 0 ? `−${fmtInt(-o.delta)} this month` : 'unchanged this month';
  const months = (n: number) => `${fmtInt(n)} month${n === 1 ? '' : 's'}`;

  const lines: string[] = ['Called up, paid, counted in lost output, and producing nothing until a training place opens.'];

  if (o.verdict === 'too_late') {
    lines.push(
      `Nothing can now turn them into ready soldiers: the shortest course is ${months(o.shortest)} and there ${o.monthsLeft === 1 ? 'is' : 'are'} ${months(o.monthsLeft)} to the deadline. They will be paid, and counted against output, until it.`,
    );
  } else if (o.verdict === 'compress_only') {
    lines.push(
      `On the ${fmtInt(o.course)}-month course none of them can graduate in time. Only a compressed syllabus still can, and only for those who start within ${months(o.bestWindow)}.`,
    );
  } else {
    const clearance = o.spare > 0
      ? `At this month's spare intake of ${fmtInt(o.spare)} it would take ${months(Math.ceil(o.pool / o.spare))} to place them all, and there ${o.monthsLeft === 1 ? 'is' : 'are'} ${months(o.monthsLeft)} left.`
      : 'No training place comes free at the current intake: they stay where they are.';
    lines.push(clearance);
    if (o.placeable < o.pool) {
      lines.push(
        `Allowing for the ${fmtInt(o.course)}-month course, at this intake at most ${fmtInt(o.placeable)} of them can start in time to graduate before the deadline.`,
      );
    }
    lines.push(
      'Only spare training places clear it: expanding capacity, contracting civilian instructors, or a shorter syllabus.'
      + (o.delta > 0 ? ' A lower monthly call-up would stop it growing.' : ''),
    );
  }

  return h(
    'section',
    { class: `holding${o.verdict === 'too_late' ? ' holding-lost' : ''}`, role: 'group', 'aria-label': 'Holding pool' },
    h('span', { class: 'holding-label' }, 'Holding pool'),
    h('span', { class: 'holding-value' }, fmtInt(o.pool)),
    h('span', { class: 'holding-change small muted' }, change),
    ...lines.map((t) => h('div', { class: 'holding-note' }, t)),
  );
}
