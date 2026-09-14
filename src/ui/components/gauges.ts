/**
 * The three always-visible gauges. Every gauge has a text value; colour is
 * never the only signal.
 *
 * Force Ready is drawn as an isotype: a parade of figures, each standing for
 * a round number of soldiers, filled as the force fills. The projection is
 * hatched on the same parade, so the player sees in one glance what is here,
 * what is coming on present decisions, and what is still to find. Political
 * capital is a pen mark on a scale. Force Quality keeps a plain bar.
 */
import type { GameState } from '../../types';
import type { Forecast } from '../../sim/forecast';
import { h, s } from '../dom';
import { formatInt } from '../../format';
import { displayEse, displayReadyPct } from '../../sim/score';
import { FIGURE_H, FIGURE_W, figureShapes } from './figure';

/**
 * The three thresholds, in one place: the gauges and the sticky strip must
 * never disagree about whether a number is in trouble.
 */
const readyState = (pct: number): Tone => (pct >= 100 ? 'ok' : pct >= 60 ? 'warn' : 'bad');
const qualityState = (q: number): Tone => (q >= 0.65 ? 'ok' : q >= 0.45 ? 'warn' : 'bad');
const pcState = (pc: number): Tone => (pc >= 40 ? 'ok' : pc >= 20 ? 'warn' : 'bad');
type Tone = 'ok' | 'warn' | 'bad';
const barClass = (t: Tone): string => (t === 'ok' ? 'bar-ok' : t === 'warn' ? 'bar-warn' : '');

/**
 * How many soldiers one figure stands for: the smallest round unit that
 * parades the whole target in at most 48 figures, two rows of 24. A brigade
 * of 10,000 is 40 figures of 250; a division of 22,000 is 44 of 500; a corps
 * of 45,000 is 45 of 1,000.
 */
export function figureUnit(target: number): number {
  for (const u of [100, 200, 250, 500, 1000, 2000, 5000]) if (target / u <= 48) return u;
  return 10000;
}

export function renderGauges(state: GameState, projection?: Forecast): HTMLElement {
  const g = state.gauges;
  const readyTone = readyState(g.forceReadyPct);
  const qClass = barClass(qualityState(g.forceQuality));
  const pcTone = pcState(g.politicalCapital);

  const label = (name: string, sub: string) => h('div', { class: 'gauge-label' }, h('span', {}, name), h('span', {}, sub));
  const value = (v: string, small: string) => h('div', { class: 'gauge-value' }, v, ' ', h('small', {}, small));

  const leadershipNote = g.leadershipFactor < 1
    ? `Leadership factor ${g.leadershipFactor.toFixed(2)}: not enough junior leaders for the recalled and the conscripted`
    : '';

  return h(
    'section',
    { class: 'gauges', 'aria-label': 'Gauges' },
    h(
      'div',
      { class: `gauge gauge-ready ${barClass(readyTone)}`, role: 'group', 'aria-label': 'Force Ready' },
      label('Force Ready', `of ${formatInt(state.target)}`),
      value(formatInt(displayEse(g.forceReady)), `${displayReadyPct(g.forceReadyPct)}%`),
      isotype(state, projection),
      isotypeLegend(state, projection),
    ),
    h(
      'div',
      { class: 'gauge', role: 'group', 'aria-label': 'Force Quality' },
      label('Force Quality', 'of 1.00'),
      value(g.forceQuality.toFixed(2), `${formatInt(g.headcountCounted)} counted`),
      h('div', { class: `bar ${qClass}`, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(g.forceQuality * 100), 'aria-label': 'Force Quality' }, h('span', { style: `width:${Math.max(0, Math.min(100, g.forceQuality * 100))}%` })),
      leadershipNote ? h('div', { class: 'gauge-note' }, leadershipNote) : null,
    ),
    h(
      'div',
      { class: 'gauge', role: 'group', 'aria-label': 'Political Capital' },
      label('Political Capital', ''),
      value(String(Math.round(g.politicalCapital)), 'of 100'),
      pcScale(g.politicalCapital, pcTone),
      g.politicalCapital < 15 ? h('div', { class: 'gauge-note' }, 'Resignation below 0') : null,
    ),
  );
}

/**
 * The parade. Figures fill from the left as Force Ready rises; the figure at
 * the front fills from the feet up, so a reading of 3,547 at 500 a figure
 * shows seven whole figures and a tenth of an eighth. The projection is
 * hatched from there to where present decisions land. Suppressed in the
 * final month, when the projection is the gauge.
 */
function isotype(state: GameState, projection?: Forecast): SVGSVGElement {
  const unit = figureUnit(state.target);
  const n = Math.ceil(state.target / unit);
  const cols = Math.ceil(n / 2);
  const ready = state.gauges.forceReady / unit;
  const projected = projection && projection.monthsProjected > 0 ? projection.forceReady / unit : ready;
  const step = FIGURE_W + 2;
  const rowGap = 6;
  const width = cols * step - 2;
  const height = n > cols ? FIGURE_H * 2 + rowGap : FIGURE_H;

  const pct = displayReadyPct(state.gauges.forceReadyPct);
  const projectedText = projection && projection.monthsProjected > 0
    ? ` On present decisions ${formatInt(projection.forceReady)} by month ${state.deadlineMonths}.`
    : '';
  const svg = s('svg', {
    class: 'isotype',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Force Ready ${formatInt(displayEse(state.gauges.forceReady))} of ${formatInt(state.target)}, ${pct}%. Each figure is ${formatInt(unit)} soldiers.${projectedText}`,
  });
  const defs = s('defs', {}, s('pattern', { id: 'iso-hatch', width: 3, height: 3, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 1.4, height: 3 })));
  svg.append(defs);

  for (let i = 0; i < n; i++) {
    const x = (i % cols) * step;
    const y = i < cols ? 0 : FIGURE_H + rowGap;
    const at = s('g', { transform: `translate(${x} ${y})` });
    at.append(figureShapes('iso-empty'));
    if (i + 1 <= ready) {
      at.append(figureShapes('iso-ready'));
    } else if (i < ready) {
      const frac = ready - i;
      defs.append(s('clipPath', { id: 'iso-part' }, s('rect', { x: 0, y: FIGURE_H * (1 - frac), width: FIGURE_W, height: FIGURE_H * frac })));
      at.append(s('g', { 'clip-path': 'url(#iso-part)' }, figureShapes('iso-ready')));
    } else if (i < projected) {
      at.append(figureShapes('iso-forecast'));
    }
    svg.append(at);
  }
  return svg;
}

function isotypeLegend(state: GameState, projection?: Forecast): HTMLElement {
  const unit = figureUnit(state.target);
  const swatch = (cls: string) => {
    const svg = s('svg', { class: 'iso-swatch', viewBox: '0 0 9 9', width: 9, height: 9, 'aria-hidden': 'true', focusable: 'false' });
    svg.append(s('rect', { class: cls, x: 0.5, y: 0.5, width: 8, height: 8 }));
    return svg;
  };
  const item = (cls: string, text: string) => h('span', { class: 'iso-item' }, swatch(cls), text);
  const showProjection = projection && projection.monthsProjected > 0;
  return h(
    'div',
    { class: 'iso-legend', 'aria-hidden': 'true' },
    item('iso-ready', 'ready'),
    showProjection
      ? item('iso-forecast', `on present decisions: ${formatInt(projection.forceReady)} by month ${state.deadlineMonths} (${Math.round(projection.forceReadyPct)}%)`)
      : null,
    item('iso-empty', `one figure = ${formatInt(unit)}`),
  );
}

/**
 * A scale from 0 to 100 with a pen mark at the reading. The first fifth is
 * hatched: below 20 the Prime Minister is asking questions, and at 0 the
 * minister resigns. The mark takes the reading's tone.
 */
function pcScale(pc: number, tone: Tone): SVGSVGElement {
  const x = Math.max(0, Math.min(100, pc)) * 1.6;
  const svg = s('svg', { class: `pcscale tone-${tone}`, viewBox: '0 0 160 27', role: 'img', 'aria-label': `Political capital ${Math.round(pc)} of 100. Resignation at 0.` });
  svg.append(
    s('defs', {}, s('pattern', { id: 'pc-hatch', width: 3, height: 3, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 1.4, height: 3 }))),
    s('rect', { class: 'pc-danger', x: 0, y: 9, width: 32, height: 6, fill: 'url(#pc-hatch)' }),
    s('line', { class: 'pc-axis', x1: 0, y1: 12, x2: 160, y2: 12 }),
    ...[0, 32, 64, 96, 128, 160].map((t, i) => s('line', { class: 'pc-tick', x1: t, y1: i % 2 ? 10 : 8, x2: t, y2: i % 2 ? 14 : 16 })),
    s('path', { class: 'pc-pen', d: `M${(x - 1).toFixed(1)} 4.5c1 4 1.5 9 1.2 15` }),
    s('text', { class: 'pc-text', x: 0, y: 25 }, 'resigns'),
    s('text', { class: 'pc-text', x: 160, y: 25, 'text-anchor': 'end' }, '100'),
  );
  return svg;
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
