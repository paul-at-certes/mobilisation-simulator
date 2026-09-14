/**
 * Scoring screen: the next morning's front page. Headline, standfirst, the
 * two bars, the figures, the general's verdict, and the share card made from
 * the same page.
 */
import type { GameState, Score } from '../../types';
import { h, s } from '../dom';
import { renderShareCard, copyImage, downloadImage, shareImage, canShareImages } from '../share-card';
import { sourced } from '../components/sourced';
import { displayEse, displayShortfall } from '../../sim/score';
import { formatInt, gbpTabular, pctTabular } from '../../format';

/**
 * The five kinds of soldier, each with the fill it is drawn in. One ink and
 * four textures, as a newspaper chart would: five shades of one grey did not
 * tell apart, and a texture survives greyscale and colour blindness where a
 * tint does not. Conscripts are the one exception, in red, because they are
 * the lever the game is about.
 */
export const FILLS = ['fp-solid', 'fp-hatch', 'fp-cross', 'fp-dots', 'fp-red'] as const;

export function renderScoring(opts: { state: GameState; score: Score; siteUrl: string; onRestart: () => void }): HTMLElement {
  const { state, score } = opts;
  const c = score.composition;
  const segs: [string, string, number, number][] = [
    ['Regulars', FILLS[0], c.regulars.headcount, c.regulars.ese],
    ['Reservists', FILLS[1], c.reservists.headcount, c.reservists.ese],
    ['Ex-regulars', FILLS[2], c.exRegulars.headcount, c.exRegulars.ese],
    ['Strategic Reserve', FILLS[3], c.strategic.headcount, c.strategic.ese],
    ['Conscripts', FILLS[4], c.conscripts.headcount, c.conscripts.ese],
  ];

  const formation = state.difficulty;
  const shortfall = displayShortfall(score.shortfall);
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
  // The banner, and under it the sentence the game has always said.
  const banner = score.resigned ? 'Minister resigns' : score.met ? `${cap(formation)} raised` : `${formatInt(shortfall)} short`;
  const standfirst = score.resigned
    ? 'The Prime Minister has accepted your resignation.'
    : score.met
      ? `Target met. ${formatInt(displayEse(score.ese))} effective soldiers against ${formatInt(score.target)}.`
      // A shortfall now rounds up, so "missed by 1" is reachable and has to be singular.
      : `Target missed by ${formatInt(shortfall)} effective soldier${shortfall === 1 ? '' : 's'}.`;

  const canvas = renderShareCard({ difficulty: state.difficulty, score, siteUrl: opts.siteUrl });
  const status = h('span', { class: 'small muted', 'aria-live': 'polite' });
  const link = `${opts.siteUrl}${score.seedUrl}`;

  return h(
    'div',
    { class: 'fade-in' },
    h(
      'div',
      { class: 'frontpage-wrap' },
      h(
        'article',
        { class: 'frontpage' },
        h('div', { class: 'nameplate' }, 'The Morning Despatch'),
        h(
          'div',
          { class: 'fp-dateline' },
          h('span', {}, score.resigned ? `Month ${state.turn} · Resigned` : `Month ${state.deadlineMonths} · The deadline`),
          h('span', {}, 'Late edition'),
        ),
        // The same dateline the share card carries, for the same reason: this is
        // where a run ends and where a stranger following a replay link arrives,
        // and the office the player held was named nowhere on it (F20). It also
        // says which difficulty the run was, which the screen never did.
        h('div', { class: 'dateline' }, `Secretary of State for Defence · ${cap(state.difficulty)} · ${score.months} months`),
        h('h1', { class: `fp-headline ${score.met && !score.resigned ? 'met' : 'missed'}` }, banner),
        h('p', { class: 'fp-standfirst' }, standfirst),
        h('p', { class: 'fp-byline' }, score.resigned ? 'Scored as things stood on the day you left.' : 'By our Defence Correspondent · Whitehall'),
        h(
          'section',
          { class: 'fp-fielded', 'aria-label': 'What you actually fielded' },
          h('h2', { class: 'fp-label' }, 'What was actually fielded'),
          h('p', { class: 'fp-caption' }, `The top bar counts heads. The bottom bar counts what they add up to as effective soldiers. The dashed line is the ${formatInt(score.target)} you were asked for.`),
          fieldedChart(score, segs),
          h('div', { class: 'legend' }, ...segs.map((seg) => h('span', { class: 'legend-item' }, swatch(seg[1]), `${seg[0]}: ${formatInt(seg[2])} bodies, ${formatInt(seg[3])} effective`))),
        ),
        h(
          'div',
          { class: 'stat-grid' },
          stat('Force quality', score.quality.toFixed(2), `${score.qualityBand} band`),
          stat('Leadership factor', score.leadership.toFixed(2), `${score.leadershipBand}`),
          stat('Treasury cost', gbpTabular(score.cost), [pctTabular(score.costPctDefenceBudget), ' of the ', sourced('2025/26 defence budget', 'defence_budget_2025')]),
          stat('GDP output lost', gbpTabular(score.gdpLoss), [pctTabular(score.gdpLossPctGdp, 2), ' of ', sourced('2025 GDP', 'uk_gdp_2025')]),
          // Only shown when there were any: a nil return is not worth a tile.
          score.refused >= 1
            ? stat(
                'Refused to report',
                formatInt(score.refused),
                score.refusalBacklog >= 1
                  ? [formatInt(score.refusalBacklog), score.resigned ? ' cases still unheard when you left' : ' cases still unheard at the deadline'].join('')
                  : 'all heard',
              )
            : null,
        ),
        h('div', { class: 'verdict' }, h('div', { class: 'note-head' }, "Analysis · The general's verdict"), h('p', { class: 'fp-verdict' }, score.verdictText)),
      ),
    ),
    h('h2', {}, 'Share the front page'),
    h('p', { class: 'small muted' }, 'The card is what travels: the same headline, the same two bars, and a link to replay this exact run.'),
    Object.assign(canvas, { className: 'share-card' }),
    h(
      'div',
      { class: 'btn-row' },
      // The share sheet first, where there is one: on a phone it is the one
      // tap that reaches LinkedIn with the card attached. The clipboard image
      // API is missing from most in-app browsers, which is where the audience
      // arrives from.
      canShareImages()
        ? h('button', { class: 'btn', onclick: async () => { const r = await shareImage(canvas, { title: 'Mobilisation Minister', text: score.verdictOneLiner, url: link }); status.textContent = r === 'shared' ? 'Shared.' : r === 'cancelled' ? '' : 'Sharing not available here; downloading instead.'; if (r === 'failed') downloadImage(canvas); } }, 'Share')
        : null,
      h('button', { class: canShareImages() ? 'btn btn-secondary' : 'btn', onclick: async () => { status.textContent = (await copyImage(canvas)) ? 'Image copied.' : 'Clipboard not available here; downloading instead.'; if (!status.textContent.startsWith('Image')) downloadImage(canvas); } }, 'Copy image'),
      h('button', { class: 'btn btn-secondary', onclick: () => downloadImage(canvas) }, 'Download image'),
      h('button', { class: 'btn btn-secondary', onclick: async () => { try { await navigator.clipboard.writeText(link); status.textContent = 'Link copied.'; } catch { status.textContent = link; } } }, 'Copy link'),
      status,
    ),
    h('p', { class: 'small muted' }, 'Replay this exact run: ', h('a', { href: score.seedUrl }, link)),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-quiet', onclick: opts.onRestart }, 'Play again'), h('a', { class: 'btn btn-quiet', href: './methodology.html', style: 'display:inline-flex;align-items:center;text-decoration:none' }, 'How this works')),
  );
}

/**
 * The two bars, drawn: bodies over effective soldiers, stacked by kind, with
 * the target as a dashed line. The bars are scaled to whichever is larger of
 * headcount and target, so the line is what says which scale this is: a
 * full track means "hit it" on one run and "twice it" on another. The
 * textures are defined here and used by the legend's swatches as well.
 */
function fieldedChart(score: Score, segs: [string, string, number, number][]): SVGSVGElement {
  const maxV = Math.max(score.headcount, score.target, 1);
  const trackX = 62;
  const trackW = 212;
  const rows: [string, 2 | 3, number, string][] = [
    ['Bodies', 2, 4, ''],
    ['Effective', 3, 34, 'fp-val-red'],
  ];
  const describe = (idx: 2 | 3) => segs.map((seg) => `${seg[0]} ${formatInt(seg[idx])}`).join(', ');
  const svg = s('svg', {
    class: 'fp-bars',
    viewBox: '0 0 326 74',
    role: 'img',
    'aria-label': `Bodies ${formatInt(score.headcount)} (${describe(2)}). Effective soldiers ${formatInt(displayEse(score.ese))} (${describe(3)}). Target ${formatInt(score.target)}.`,
  });
  svg.append(
    s(
      'defs',
      {},
      s('pattern', { id: 'fp-hatch', width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 1.6, height: 4 })),
      s('pattern', { id: 'fp-cross', width: 4, height: 4, patternUnits: 'userSpaceOnUse' }, s('path', { d: 'M0 0.5H4M0.5 0V4', fill: 'none' })),
      s('pattern', { id: 'fp-dots', width: 4, height: 4, patternUnits: 'userSpaceOnUse' }, s('circle', { cx: 2, cy: 2, r: 0.9 })),
    ),
  );
  for (const [label, idx, y, valClass] of rows) {
    svg.append(s('text', { x: 0, y: y + 11 }, label), s('rect', { class: 'fp-track', x: trackX, y, width: trackW, height: 14 }));
    let x = trackX;
    for (const seg of segs) {
      const w = (seg[idx] / maxV) * trackW;
      if (w > 0) svg.append(s('rect', { class: seg[1], x, y, width: w, height: 14 }));
      x += w;
    }
    const total = idx === 2 ? score.headcount : displayEse(score.ese);
    svg.append(s('text', { class: `fp-val ${valClass}`, x: trackX + trackW + 6, y: y + 11 }, formatInt(total)));
  }
  const tx = Math.min(trackX + trackW - 1, trackX + (score.target / maxV) * trackW);
  const anchorEnd = tx > trackX + trackW * 0.8;
  svg.append(
    s('line', { class: 'fp-target', x1: tx, y1: 0, x2: tx, y2: 54 }),
    s('text', { class: 'fp-target-text', x: tx, y: 66, 'text-anchor': anchorEnd ? 'end' : 'middle' }, `target ${formatInt(score.target)}`),
  );
  return svg;
}

/** A legend swatch in the same fill as its segment; the patterns live in the chart. */
function swatch(fill: string): SVGSVGElement {
  const svg = s('svg', { class: 'swatch', viewBox: '0 0 12 12', width: 12, height: 12, 'aria-hidden': 'true', focusable: 'false' });
  svg.append(s('rect', { class: 'fp-track', x: 0.5, y: 0.5, width: 11, height: 11 }), s('rect', { class: fill, x: 0.5, y: 0.5, width: 11, height: 11 }));
  return svg;
}

function stat(label: string, value: string, sub: string | (string | Node)[]): HTMLElement {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, label), h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-sub' }, ...(Array.isArray(sub) ? sub : [sub])));
}
