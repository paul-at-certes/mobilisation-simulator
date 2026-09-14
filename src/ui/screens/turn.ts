/** Turn screen: gauges, the Permanent Secretary's note, an event if any, decisions, ledger, end month. */
import type { ActionAvailability, GameEvent, GameState, TurnInput } from '../../types';
import { h } from '../dom';
import { renderGauges, renderStatusStrip } from '../components/gauges';
import { forecast } from '../../sim/forecast';
import { renderHoldingPool } from '../components/holding';
import { renderLedger } from '../components/ledger';
import { renderActionMenu } from '../components/action-menu';
import { sourced, escapeHtml, getParam } from '../components/sourced';
import { pencilNote } from '../pencil';

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
    const input = { actions: menu.selectedActions(), eventChoice };
    // The month closes under a rubber stamp: APPROVED if the minister decided
    // anything, NOTED if not, DEADLINE on the last. The state advances while
    // the stamp is down, so the next month is on the desk when it lifts.
    // Under reduced motion there is no stamp and no wait.
    const final = state.turn >= state.deadlineMonths - 1;
    const word = final ? 'Deadline' : input.actions.length ? 'Approved' : 'Noted';
    const delay = stamp(word);
    if (delay === 0) d.onEndTurn(input);
    else window.setTimeout(() => d.onEndTurn(input), delay);
  });

  const eventEl = event ? renderEvent(event, state.turn === 0 ? 'Day 0' : `Month ${state.turn}`, (i) => {
    eventChoice = i;
    endBtn.disabled = false;
    hint.textContent = '';
  }) : null;

  const monthLabel = state.turn === 0 ? 'Day 0' : `Month ${state.turn} of ${state.deadlineMonths}`;
  const remaining = state.deadlineMonths - state.turn;
  const projection = forecast(state);
  const pencil = pencilNote(state, projection);

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
        // The month is the screen's heading: the tab is how it dresses.
        h('h1', { class: 'turn' }, monthLabel),
        h('span', { class: 'small muted' }, remaining > 0 ? `${remaining} month${remaining === 1 ? '' : 's'} to the deadline` : 'Deadline'),
        h('button', { class: 'btn btn-quiet', style: 'min-height:36px;padding:0.3rem 0.6rem;font-size:0.8rem', onclick: d.onRestart }, 'Restart'),
      ),
      renderStatusStrip(state),
    ),
    renderGauges(state, projection),
    renderHoldingPool(state),
    // A minute sheet. The typed header says who is writing to whom: the
    // player is the Secretary of State, and this is their official writing
    // to them. The reference carries the month in the form a registry would.
    h(
      'div',
      { class: 'note' },
      minuteHead(`PUS/MOB/${state.turn} \u00b7 ${monthLabel}`),
      ...d.briefing.map((s) => h('p', { html: s })),
      // The Permanent Secretary's pencilled line, when the month has earned one.
      pencil ? h('div', { class: 'pencil' }, h('span', { class: 'visually-hidden' }, 'Pencilled in the margin: '), pencil) : null,
    ),
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

/**
 * The month's news, on the paper it arrived on: a torn press cutting under
 * the fictional paper's name, a Commons paper, or a letter or report in the
 * Department's in-tray. The decision is taken beneath it in a red-ruled box.
 */
function renderEvent(ev: GameEvent, dateLabel: string, onChoose: (i: number) => void): HTMLElement {
  const heads: Record<GameEvent['via'], [string, string]> = {
    press: ['The Morning Despatch', `${dateLabel} \u00b7 p.2`],
    house: ['House of Commons', dateLabel],
    paper: ['In-tray', `${dateLabel} \u00b7 Secretary of State`],
  };
  const [paper, edition] = heads[ev.via];
  const choices = h('div', { class: 'choices', role: 'group', 'aria-label': 'Choices' });
  const buttons: HTMLButtonElement[] = [];
  ev.choices.forEach((c, i) => {
    const b = h('button', { class: 'choice', type: 'button', 'aria-pressed': 'false' }, h('span', { class: 'choice-label' }, c.label), h('span', { class: 'choice-summary' }, c.summary)) as HTMLButtonElement;
    b.addEventListener('click', () => {
      // The tick is drawn by the stylesheet from aria-pressed.
      buttons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
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
  return h(
    'section',
    { class: `event event-${ev.via}`, 'aria-label': 'Event' },
    h(
      'div',
      { class: 'event-body' },
      h('div', { class: 'cutting-head', 'aria-hidden': 'true' }, h('span', {}, paper), h('span', {}, edition)),
      h('h2', {}, ev.title),
      h('p', { html: escapeHtml(ev.text) }),
    ),
    ev.choices.length ? choices : h('p', { class: 'small muted' }, 'No decision required.'),
    src,
  );
}

/**
 * The typed header of a minute sheet. A <dl> so a screen reader hears
 * "From, Permanent Secretary" rather than a run of loose words.
 */
export function minuteHead(ref: string): HTMLElement {
  return h(
    'dl',
    { class: 'minute-head' },
    h('dt', {}, 'From:'), h('dd', {}, 'Permanent Secretary'),
    h('dt', {}, 'To:'), h('dd', {}, 'Secretary of State'),
    h('dt', {}, 'Ref:'), h('dd', {}, ref),
  );
}

/**
 * Slam a stamp over the screen and return how long to hold the next screen
 * back, in milliseconds. Zero, and no stamp, when the player has asked for
 * reduced motion. The overlay lives on <body>, outside #app, so it survives
 * the re-render underneath it and takes itself off when its fade ends.
 */
function stamp(word: string): number {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  const overlay = h('div', { class: 'stamp-overlay', 'aria-hidden': 'true' }, h('span', { class: 'stamp stamp-big' }, word));
  document.body.append(overlay);
  overlay.addEventListener('animationend', (e) => {
    if (e.animationName === 'stamp-out') overlay.remove();
  });
  // A belt to the braces: no browser event, no leak.
  window.setTimeout(() => overlay.remove(), 1600);
  // A tap's worth of haptic where the platform offers it, and only after a
  // real gesture: a scripted click would otherwise log a warning.
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(12);
  return 620;
}
