/** Turn screen: gauges, the Permanent Secretary's note, an event if any, decisions, ledger, end month. */
import type { ActionAvailability, GameEvent, GameState, TurnInput } from '../../types';
import { h } from '../dom';
import { renderGauges, renderStatusStrip } from '../components/gauges';
import { forecast } from '../../sim/forecast';
import { renderHoldingPool } from '../components/holding';
import { renderLedger } from '../components/ledger';
import { renderActionMenu } from '../components/action-menu';
import { sourced, escapeHtml, getParam } from '../components/sourced';

export interface TurnScreenDeps {
  state: GameState;
  availability: ActionAvailability[];
  event: GameEvent | null;
  briefing: string[];
  onEndTurn: (input: TurnInput) => void;
  onRestart: () => void;
}

export function renderTurn(d: TurnScreenDeps): HTMLElement {
  const { state, event } = d;
  let eventChoice: number | null = null;
  const needsChoice = !!event && event.choices.length > 0;

  const endBtn = h('button', { class: 'btn', disabled: needsChoice }, state.turn >= state.deadlineMonths - 1 ? 'End final month' : 'End month') as HTMLButtonElement;
  const hint = h('span', { class: 'small muted', 'aria-live': 'polite' }, needsChoice ? 'Decide the event first.' : '');

  const menu = renderActionMenu(state, d.availability, () => {});
  endBtn.addEventListener('click', () => {
    endBtn.disabled = true;
    d.onEndTurn({ actions: menu.selectedActions(), eventChoice });
  });

  const eventEl = event ? renderEvent(event, (i) => {
    eventChoice = i;
    endBtn.disabled = false;
    hint.textContent = '';
  }) : null;

  const monthLabel = state.turn === 0 ? 'Day 0' : `Month ${state.turn} of ${state.deadlineMonths}`;
  const remaining = state.deadlineMonths - state.turn;

  return h(
    'div',
    // `turn-screen` is what main.ts keys the body padding off, so the fixed footer never covers the ledger.
    { class: 'fade-in turn-screen' },
    // Sticky: the month, and the three gauge readings, stay with the player down
    // a screen that is several phone-heights long (F7).
    h(
      'div',
      { class: 'turnhead' },
      h(
        'div',
        { class: 'turnbar' },
        h('span', { class: 'turn' }, monthLabel),
        h('span', { class: 'small muted' }, remaining > 0 ? `${remaining} month${remaining === 1 ? '' : 's'} to the deadline` : 'Deadline'),
        h('button', { class: 'btn btn-quiet', style: 'min-height:36px;padding:0.3rem 0.6rem;font-size:0.8rem', onclick: d.onRestart }, 'Restart'),
      ),
      renderStatusStrip(state),
    ),
    renderGauges(state, forecast(state)),
    renderHoldingPool(state),
    // From and to. "Permanent Secretary · Month 3" read as the player's own
    // badge in a game called Mobilisation Minister; the player is the
    // Secretary of State, and this is their official writing to them. The
    // month goes because the sticky head above already carries it.
    h('div', { class: 'note' }, h('div', { class: 'note-head' }, 'Permanent Secretary to the Secretary of State'), ...d.briefing.map((s) => h('p', { html: s }))),
    eventEl,
    menu.element,
    renderLedger(state),
    // Fixed: *End month* was five and a half screens down, and the action
    // counter was at the top where it could not be read while choosing (F7).
    // Last in the DOM, so it is also last in the tab order.
    h(
      'div',
      { class: 'turnfoot' },
      h('div', { class: 'turnfoot-inner' }, h('div', { class: 'turnfoot-status' }, menu.counter, hint), endBtn),
    ),
  );
}

function renderEvent(ev: GameEvent, onChoose: (i: number) => void): HTMLElement {
  const choices = h('div', { class: 'choices', role: 'group', 'aria-label': 'Choices' });
  const buttons: HTMLButtonElement[] = [];
  ev.choices.forEach((c, i) => {
    const b = h('button', { class: 'choice', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'choice-label' }, c.label), h('span', { class: 'choice-summary' }, c.summary)) as HTMLButtonElement;
    b.addEventListener('click', () => {
      buttons.forEach((x) => {
        x.setAttribute('aria-pressed', 'false');
        x.style.borderColor = '';
        x.style.boxShadow = '';
      });
      b.setAttribute('aria-pressed', 'true');
      b.style.borderColor = 'var(--accent)';
      b.style.boxShadow = 'inset 0 0 0 1px var(--accent)';
      onChoose(i);
    });
    buttons.push(b);
    choices.append(b);
  });
  // The chips carry the parameter's label, not its id with the underscores
  // taken out: "ex regular tracked tri service" is not a thing anybody is
  // called, and "Ex-Regular Reserve on record, all three Services" was sitting
  // in the data unused. The id falls back in only if the parameter is missing,
  // which is a bug the popover will say so about.
  const src = ev.source
    ? h(
        'p',
        { class: 'small muted' },
        'Source: ',
        ev.source.url ? h('a', { href: ev.source.url, target: '_blank', rel: 'noopener' }, ev.source.name) : ev.source.name,
        ...(ev.source.paramIds ?? []).map((id) => [' · ', sourced(getParam(id)?.label ?? id.replace(/_/g, ' '), id)]),
      )
    : null;
  return h('section', { class: 'event', 'aria-label': 'Event' }, h('h3', {}, ev.title), h('p', { html: escapeHtml(ev.text) }), ev.choices.length ? choices : h('p', { class: 'small muted' }, 'No decision required.'), src);
}
