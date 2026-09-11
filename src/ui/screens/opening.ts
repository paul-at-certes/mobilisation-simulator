/** Opening screen: premise, difficulty, start. */
import type { Difficulty } from '../../types';
import { h, fmtInt } from '../dom';
import { sourced, getParam } from '../components/sourced';

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

  return h(
    'div',
    { class: 'fade-in' },
    h('h1', {}, 'Day 0'),
    h(
      'div',
      { class: 'note' },
      h('div', { class: 'note-head' }, 'Permanent Secretary to Secretary of State · Personal'),
      h(
        'p',
        {},
        'A NATO ally has been attacked. Article 5 has been invoked. The Chief of the Defence Staff has told the Prime Minister that the UK’s contribution must be a deployable division: ',
        sourced(fmtInt(pv('target_division')), 'target_division'),
        ' trade-trained personnel with their enablers, ready to move in ',
        sourced(String(pv('deadline_division')), 'deadline_division'),
        ' months.',
      ),
      h(
        'p',
        {},
        'The regular Army’s trade-trained strength this morning is ',
        sourced(fmtInt(pv('regular_trained_start')), 'regular_trained_start'),
        '. Of those, the Chief of the General Staff can release perhaps ',
        sourced(`${Math.round(pv('regular_deployable_fraction') * 100)}%`, 'regular_deployable_fraction'),
        ' without breaking commitments we already have. The rest of the division has to be found.',
      ),
      h('p', {}, 'You are the Secretary of State for Defence. The Prime Minister has asked you to make it happen.'),
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
    h('h2', {}, 'Difficulty'),
    h(
      'div',
      { class: 'difficulty', role: 'radiogroup', 'aria-label': 'Difficulty' },
      diff('brigade', `Brigade: ${fmtInt(pv('target_brigade'))} in ${pv('deadline_brigade')} months`, 'A brigade group, fast. The Army Reserve’s standard notice is 180 days.'),
      diff('division', `Division: ${fmtInt(pv('target_division'))} in ${pv('deadline_division')} months`, 'What the Chief asked for.'),
      diff('corps', `Corps: ${fmtInt(pv('target_corps'))} in ${pv('deadline_corps')} months`, 'The Chief asked for 60,000. Nobody has managed even this in testing.'),
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
