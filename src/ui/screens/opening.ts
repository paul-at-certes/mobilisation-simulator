/** Opening screen: premise, difficulty, start. */
import type { Difficulty } from '../../types';
import { h } from '../dom';
import { sourced, getParam } from '../components/sourced';
import { formatInt } from '../../format';
import { minuteHead } from './turn';
import { figureGlyph } from '../components/figure';

export function renderOpening(opts: { defaultDifficulty: Difficulty; seed: number; onStart: (d: Difficulty, seed: number) => void }): HTMLElement {
  const pv = (id: string) => getParam(id)?.value ?? 0;
  let difficulty = opts.defaultDifficulty;
  const seedInput = h('input', { type: 'number', id: 'seed', value: String(opts.seed), min: 1, style: 'width:9rem', 'aria-describedby': 'seed-help' }) as HTMLInputElement;

  const diff = (d: Difficulty, title: string, desc: string) =>
    h(
      'label',
      {},
      h('input', { type: 'radio', name: 'difficulty', value: d, checked: d === difficulty, onchange: () => (difficulty = d) }),
      h('span', {}, h('span', { class: 'd-title' }, title), h('br'), h('span', { class: 'd-desc' }, desc)),
    );

  // One regular, one reservist, one conscript, filled to what each counts for.
  const weight = (label: string, value: number, id: string | null) =>
    h('span', { class: 'weight', role: 'listitem' }, figureGlyph(value, `wf-${Math.round(value * 100)}`), `${label} `, id ? sourced(value.toFixed(1), id) : value.toFixed(1));

  return h(
    'div',
    { class: 'fade-in' },
    h(
      'div',
      { class: 'opening-head' },
      h('div', { class: 'redbox', 'aria-hidden': 'true', html: RED_BOX }),
      h('h1', {}, 'Day 0'),
      h('div', { class: 'typed opening-sub' }, 'The box is on your desk'),
    ),
    h(
      'div',
      { class: 'note' },
      h('span', { class: 'stamp', 'aria-hidden': 'true' }, 'Personal'),
      minuteHead('PUS/MOB/0 · Day 0 · Personal'),
      h(
        'p',
        {},
        "A NATO ally has been attacked. Article 5 has been invoked. The Chief of the Defence Staff has told the Prime Minister that the UK's contribution must be a deployable division: ",
        sourced(formatInt(pv('target_division')), 'target_division'),
        ' trade-trained personnel with their enablers, ready to move in ',
        sourced(String(pv('deadline_division')), 'deadline_division'),
        ' months.',
      ),
      h(
        'p',
        {},
        "The regular Army's trade-trained strength this morning is ",
        sourced(formatInt(pv('regular_trained_start')), 'regular_trained_start'),
        '. Of those, the Chief of the General Staff can release perhaps ',
        sourced(`${Math.round(pv('regular_deployable_fraction') * 100)}%`, 'regular_deployable_fraction'),
        ' without breaking commitments we already have. The rest of the division has to be found.',
      ),
      h('p', {}, 'You are the Secretary of State for Defence. The Prime Minister has asked you to make it happen.'),
      // The Prime Minister's line in the margin, in fountain pen.
      h('div', { class: 'scrawl' }, h('span', { class: 'visually-hidden' }, 'Written in the margin: '), 'Make it happen. \u2014 PM'),
    ),
    h('h2', {}, 'What counts'),
    h(
      'p',
      {},
      'Raw headcount is not the score. The target is in ',
      h('strong', {}, 'effective-soldier equivalents'),
      ': each person counted, weighted by how useful they are. A trade-trained regular is 1.0. A reservist after a refresher is ',
      sourced(String(pv('eff_reserve_volunteer')), 'eff_reserve_volunteer'),
      '. A conscript fresh out of training is ',
      sourced(String(pv('eff_conscript_normal_start')), 'eff_conscript_normal_start'),
      ', and less if there are not enough junior leaders to lead them. Every number can be tapped for its source. The weightings are modelling assumptions and are labelled as such.',
    ),
    h(
      'div',
      { class: 'weights', role: 'list', 'aria-label': 'What one person counts for' },
      weight('regular', 1, null),
      weight('reservist', pv('eff_reserve_volunteer'), 'eff_reserve_volunteer'),
      weight('conscript', pv('eff_conscript_normal_start'), 'eff_conscript_normal_start'),
    ),
    h(
      'p',
      {},
      'Almost nothing arrives in the month you decide it. Under Force Ready the Department publishes a projection: where the decisions already taken will land by the deadline, if you take no others. It assumes no further decisions and no news, so it is a statement about your orders rather than a prediction of the year.',
    ),
    h('h2', {}, 'Difficulty'),
    h(
      'div',
      { class: 'difficulty', role: 'radiogroup', 'aria-label': 'Difficulty' },
      diff('brigade', `Brigade: ${formatInt(pv('target_brigade'))} in ${pv('deadline_brigade')} months`, "A brigade group, fast. The Army Reserve's standard notice is 180 days."),
      diff('division', `Division: ${formatInt(pv('target_division'))} in ${pv('deadline_division')} months`, 'What the Chief asked for.'),
      diff('corps', `Corps: ${formatInt(pv('target_corps'))} in ${pv('deadline_corps')} months`, 'The Chief asked for 60,000. Nobody has managed even this in testing.'),
    ),
    h(
      'p',
      { class: 'small muted' },
      h('label', { for: 'seed' }, 'Seed '),
      seedInput,
      h('span', { id: 'seed-help' }, '. The same seed gives the same events. Share links carry it.'),
    ),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: () => opts.onStart(difficulty, Math.max(1, Math.floor(Number(seedInput.value) || 1))) }, 'Take office')),
    h('p', { class: 'small muted' }, 'The mechanics of mobilisation. No combat, no maps. Ten minutes, on a phone.'),
  );
}

/** The ministerial red box, flat, on the edge of a desk. Decorative: hidden from assistive technology. */
const RED_BOX = `<svg viewBox="0 0 300 168" xmlns="http://www.w3.org/2000/svg" focusable="false">
  <rect x="0" y="152" width="300" height="2" fill="#1a1916" opacity="0.5"/>
  <ellipse cx="150" cy="154" rx="132" ry="6" fill="#1a1916" opacity="0.12"/>
  <rect x="126" y="18" width="48" height="16" rx="7" fill="none" stroke="#5e1010" stroke-width="5"/>
  <rect x="34" y="30" width="232" height="26" rx="3" fill="#6e1414"/>
  <rect x="30" y="52" width="240" height="98" rx="4" fill="#8b1a1a"/>
  <rect x="30" y="52" width="240" height="4" fill="#5e1010"/>
  <rect x="44" y="66" width="212" height="70" rx="2" fill="none" stroke="#d9b45c" stroke-width="1"/>
  <text x="150" y="98" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="12" letter-spacing="2.2" fill="#d9b45c">SECRETARY OF STATE</text>
  <text x="150" y="115" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="12" letter-spacing="2.2" fill="#d9b45c">FOR DEFENCE</text>
  <rect x="141" y="52" width="18" height="12" rx="1.5" fill="#d9b45c"/>
  <rect x="146" y="56" width="8" height="5" rx="1" fill="#8b1a1a"/>
</svg>`;
