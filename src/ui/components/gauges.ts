/** The three always-visible gauges. Every gauge has a text value; colour is never the only signal. */
import type { GameState } from '../../types';
import { h, fmtInt } from '../dom';

export function renderGauges(state: GameState): HTMLElement {
  const g = state.gauges;
  const pct = Math.min(100, g.forceReadyPct);
  const readyClass = g.forceReadyPct >= 100 ? 'bar-ok' : g.forceReadyPct >= 60 ? 'bar-warn' : '';
  const qClass = g.forceQuality >= 0.65 ? 'bar-ok' : g.forceQuality >= 0.45 ? 'bar-warn' : '';
  const pcClass = g.politicalCapital >= 40 ? 'bar-ok' : g.politicalCapital >= 20 ? 'bar-warn' : '';

  const gauge = (label: string, value: string, sub: string, barPct: number, cls: string, note: string, ariaValue: string) =>
    h(
      'div',
      { class: 'gauge', role: 'group', 'aria-label': label },
      h('div', { class: 'gauge-label' }, h('span', {}, label), h('span', {}, sub)),
      h('div', { class: 'gauge-value' }, value, ' ', h('small', {}, ariaValue)),
      h('div', { class: `bar ${cls}`, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(barPct), 'aria-label': label }, h('span', { style: `width:${Math.max(0, Math.min(100, barPct))}%` })),
      note ? h('div', { class: 'gauge-note' }, note) : null,
    );

  const leadershipNote = g.leadershipFactor < 1 ? `Leadership factor ${g.leadershipFactor.toFixed(2)}: not enough junior leaders` : '';

  return h(
    'section',
    { class: 'gauges', 'aria-label': 'Gauges' },
    gauge('Force Ready', fmtInt(g.forceReady), `of ${fmtInt(state.target)}`, pct, readyClass, '', `${Math.round(g.forceReadyPct)}%`),
    gauge('Force Quality', g.forceQuality.toFixed(2), 'of 1.00', g.forceQuality * 100, qClass, leadershipNote, `${fmtInt(g.headcountCounted)} counted`),
    gauge('Political Capital', String(Math.round(g.politicalCapital)), 'of 100', g.politicalCapital, pcClass, g.politicalCapital < 15 ? 'Resignation below 0' : '', ''),
  );
}
