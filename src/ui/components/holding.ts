/**
 * The holding pool indicator: conscripts called up with nowhere to train.
 *
 * It is shown only when the pool is not empty, because an empty one says
 * nothing. It is the game's central failure mode — a call-up rate above the
 * training estate's spare intake produces paid, idle, uncounted people — so it
 * reports the backlog, the month's change, and how long the current spare
 * intake would take to clear it.
 */
import type { GameState } from '../../types';
import { h, fmtInt } from '../dom';
import { spareIntake } from '../../sim/pipeline';

export function renderHoldingPool(state: GameState): HTMLElement | null {
  const pool = state.pools.holdingPool;
  if (pool < 1) return null;

  const delta = state.briefing?.holdingPoolDelta ?? 0;
  const spare = spareIntake(state);
  const months = spare > 0 ? Math.ceil(pool / spare) : null;
  const left = state.deadlineMonths - state.turn;

  // House typography: a real minus sign, as the briefing uses.
  const change = delta > 0 ? `+${fmtInt(delta)} this month` : delta < 0 ? `−${fmtInt(-delta)} this month` : 'unchanged this month';

  const clearance =
    months == null
      ? 'No training place comes free at the current intake: they stay where they are.'
      : months > left
        ? `At this month's spare intake of ${fmtInt(spare)} it would take ${fmtInt(months)} months to place them all, and there are ${fmtInt(left)} left.`
        : `At this month's spare intake of ${fmtInt(spare)} it would take ${fmtInt(months)} months to place them all.`;

  // Naming the levers matters: nothing else in the interface connects the pool
  // to the three actions that drain it, and a player looking at a six-figure
  // number needs to know what to do about it.
  const levers = 'Only spare training places clear it: expanding capacity, contracting civilian instructors, or a shorter syllabus.';
  const stopGrowing = delta > 0 ? ' A lower monthly call-up would stop it growing.' : '';

  return h(
    'section',
    { class: 'holding', role: 'group', 'aria-label': 'Holding pool' },
    h('span', { class: 'holding-label' }, 'Holding pool'),
    h('span', { class: 'holding-value' }, fmtInt(pool)),
    h('span', { class: 'holding-change small muted' }, change),
    h('div', { class: 'holding-note' }, 'Called up, paid, counted in lost output, and producing nothing until a training place opens. ', clearance),
    h('div', { class: 'holding-note' }, levers + stopGrowing),
  );
}
