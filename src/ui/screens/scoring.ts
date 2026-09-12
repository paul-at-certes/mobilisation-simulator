/** Scoring screen: headline, the two bars, cost, the general's verdict, share card. */
import type { GameState, Score } from '../../types';
import { h } from '../dom';
import { renderShareCard, copyImage, downloadImage, shareImage, canShareImages } from '../share-card';
import { sourced } from '../components/sourced';
import { displayEse, displayShortfall } from '../../sim/score';
import { formatInt, gbpTabular, pctTabular } from '../../format';

export function renderScoring(opts: { state: GameState; score: Score; siteUrl: string; onRestart: () => void }): HTMLElement {
  const { state, score } = opts;
  const c = score.composition;
  const segs: [string, string, number, number][] = [
    ['Regulars', 'seg-regulars', c.regulars.headcount, c.regulars.ese],
    ['Reservists', 'seg-reservists', c.reservists.headcount, c.reservists.ese],
    ['Ex-regulars', 'seg-exregulars', c.exRegulars.headcount, c.exRegulars.ese],
    ['Strategic Reserve', 'seg-strategic', c.strategic.headcount, c.strategic.ese],
    ['Conscripts', 'seg-conscripts', c.conscripts.headcount, c.conscripts.ese],
  ];
  const maxV = Math.max(score.headcount, score.target, 1);
  const bar = (label: string, total: number, idx: 2 | 3) =>
    h(
      'div',
      { class: 'row' },
      h('span', {}, label),
      h(
        'div',
        { class: 'track', role: 'img', 'aria-label': `${label}: ${formatInt(total)} (${segs.map((s) => `${s[0]} ${formatInt(s[idx])}`).join(', ')})` },
        ...segs.map((s) => h('span', { class: `seg ${s[1]}`, style: `width:${(s[idx] / maxV) * 100}%`, title: `${s[0]}: ${formatInt(s[idx])}` })),
      ),
      h('span', { class: 'num', style: 'text-align:right;font-variant-numeric:tabular-nums' }, formatInt(total)),
    );

  const headline = score.resigned
    ? 'The Prime Minister has accepted your resignation.'
    : score.met
      ? `Target met. ${formatInt(displayEse(score.ese))} effective soldiers against ${formatInt(score.target)}.`
      // A shortfall now rounds up, so "missed by 1" is reachable and has to be singular.
      : `Target missed by ${formatInt(displayShortfall(score.shortfall))} effective soldier${displayShortfall(score.shortfall) === 1 ? '' : 's'}.`;

  const canvas = renderShareCard({ difficulty: state.difficulty, score, siteUrl: opts.siteUrl });
  const status = h('span', { class: 'small muted', 'aria-live': 'polite' });
  const link = `${opts.siteUrl}${score.seedUrl}`;

  return h(
    'div',
    { class: 'fade-in' },
    // The same dateline the share card carries, for the same reason: this is
    // where a run ends and where a stranger following a replay link arrives,
    // and the office the player held was named nowhere on it (F20). It also
    // says which difficulty the run was, which the screen never did.
    h('div', { class: 'dateline' }, `Secretary of State for Defence · ${state.difficulty[0].toUpperCase()}${state.difficulty.slice(1)} · ${score.months} months`),
    h('h1', {}, score.resigned ? `Month ${state.turn}` : `Month ${state.deadlineMonths}. The deadline.`),
    h('p', { class: `headline ${score.met && !score.resigned ? 'met' : 'missed'}` }, headline),
    score.resigned ? h('p', { class: 'muted' }, 'Scored as things stood on the day you left.') : null,
    h('h2', {}, 'What you actually fielded'),
    h('p', { class: 'small muted' }, 'Bodies on the top bar. Effective soldiers on the bottom. The gap is the point.'),
    h(
      'div',
      { class: 'stacked' },
      bar('Bodies', score.headcount, 2),
      bar('Effective', displayEse(score.ese), 3),
      h('div', { class: 'legend' }, ...segs.map((s) => h('span', { class: 'legend-item' }, h('span', { class: `swatch ${s[1]}` }), `${s[0]}: ${formatInt(s[2])} bodies, ${formatInt(s[3])} effective`))),
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
    h('div', { class: 'verdict' }, h('div', { class: 'note-head' }, "The general's verdict"), h('p', {}, score.verdictText)),
    h('h2', {}, 'Share'),
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

function stat(label: string, value: string, sub: string | (string | Node)[]): HTMLElement {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, label), h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-sub' }, ...(Array.isArray(sub) ? sub : [sub])));
}
