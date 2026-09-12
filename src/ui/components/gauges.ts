/** The three always-visible gauges. Every gauge has a text value; colour is never the only signal. */
import type { GameState } from '../../types';
import type { Forecast } from '../../sim/forecast';
import { h } from '../dom';
import { formatInt } from '../../format';
import { displayEse, displayReadyPct } from '../../sim/score';

/**
 * The three thresholds, in one place: the gauges and the sticky strip must
 * never disagree about whether a number is in trouble.
 */
const readyState = (pct: number): Tone => (pct >= 100 ? 'ok' : pct >= 60 ? 'warn' : 'bad');
const qualityState = (q: number): Tone => (q >= 0.65 ? 'ok' : q >= 0.45 ? 'warn' : 'bad');
const pcState = (pc: number): Tone => (pc >= 40 ? 'ok' : pc >= 20 ? 'warn' : 'bad');
type Tone = 'ok' | 'warn' | 'bad';
const barClass = (t: Tone): string => (t === 'ok' ? 'bar-ok' : t === 'warn' ? 'bar-warn' : '');

export function renderGauges(state: GameState, projection?: Forecast): HTMLElement {
  const g = state.gauges;
  const pct = Math.min(100, g.forceReadyPct);
  const readyClass = barClass(readyState(g.forceReadyPct));
  const qClass = barClass(qualityState(g.forceQuality));
  const pcClass = barClass(pcState(g.politicalCapital));

  const gauge = (label: string, value: string, sub: string, barPct: number, cls: string, note: Node | string | null, ariaValue: string) =>
    h(
      'div',
      { class: 'gauge', role: 'group', 'aria-label': label },
      h('div', { class: 'gauge-label' }, h('span', {}, label), h('span', {}, sub)),
      h('div', { class: 'gauge-value' }, value, ' ', h('small', {}, ariaValue)),
      h('div', { class: `bar ${cls}`, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(barPct), 'aria-label': label }, h('span', { style: `width:${Math.max(0, Math.min(100, barPct))}%` })),
      note ? h('div', { class: 'gauge-note' }, note) : null,
    );

  const leadershipNote = g.leadershipFactor < 1
    ? `Leadership factor ${g.leadershipFactor.toFixed(2)}: not enough junior leaders for the recalled and the conscripted`
    : '';

  return h(
    'section',
    { class: 'gauges', 'aria-label': 'Gauges' },
    gauge('Force Ready', formatInt(displayEse(g.forceReady)), `of ${formatInt(state.target)}`, pct, readyClass, forecastNote(state, projection), `${displayReadyPct(g.forceReadyPct)}%`),
    gauge('Force Quality', g.forceQuality.toFixed(2), 'of 1.00', g.forceQuality * 100, qClass, leadershipNote, `${formatInt(g.headcountCounted)} counted`),
    gauge('Political Capital', String(Math.round(g.politicalCapital)), 'of 100', g.politicalCapital, pcClass, g.politicalCapital < 15 ? 'Resignation below 0' : '', ''),
  );
}

/**
 * Where the decisions already taken will land. Almost everything in this game
 * arrives months after it is decided, so a gauge that reports only the past
 * hides the lag until it is too late to act on it. Suppressed in the final
 * month, when the projection is the gauge.
 */
function forecastNote(state: GameState, projection?: Forecast): HTMLElement | null {
  if (!projection || projection.monthsProjected <= 0) return null;
  return h(
    'div',
    { class: 'forecast' },
    h('span', { class: 'forecast-label' }, 'On present decisions'),
    `: ${formatInt(projection.forceReady)} by month ${state.deadlineMonths} (${Math.round(projection.forceReadyPct)}%).`,
  );
}

/**
 * The same three numbers, compressed into one line for the sticky header.
 *
 * The gauges sit at the top of a turn screen that is several phone screens
 * long, so by the time the player reaches the action that costs 12 political
 * capital, the political capital reading has been off screen for four screens
 * (F7). This strip rides along with the turn bar.
 *
 * Hidden from assistive technology: it is a duplicate of the gauges above, and
 * a screen reader user has no scroll problem to solve. The gauges keep the
 * roles and the labels; this is a visual affordance only.
 */
export function renderStatusStrip(state: GameState): HTMLElement {
  const g = state.gauges;
  const item = (label: string, value: string, sub: string, tone: Tone) =>
    h(
      'span',
      { class: 'ss-item' },
      h('span', { class: 'ss-label' }, label),
      h('span', { class: `ss-value tone-${tone}` }, value),
      sub ? h('span', { class: 'ss-sub' }, sub) : null,
    );
  return h(
    'div',
    { class: 'statusstrip', 'aria-hidden': 'true' },
    item('Ready', formatInt(displayEse(g.forceReady)), `/ ${formatInt(state.target)}`, readyState(g.forceReadyPct)),
    item('Quality', g.forceQuality.toFixed(2), '', qualityState(g.forceQuality)),
    item('Capital', String(Math.round(g.politicalCapital)), '', pcState(g.politicalCapital)),
  );
}
