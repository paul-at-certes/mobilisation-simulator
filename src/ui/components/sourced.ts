/**
 * Sourced values.
 *
 * Every number rendered in the game passes through `sourced()` so the player
 * can see where it comes from. The trigger is a <button> with a dotted
 * underline; clicking (or Enter/Space) opens a single shared popover with the
 * value, description, source, as-of date, confidence badge and link.
 *
 * Usage:
 *   initSourcedPopover();                       // once per page
 *   el.append(sourced('70,951', 'regular_trained_start'));
 *   html`... ${sourcedHtml('70,951', 'regular_trained_start')} ...`  // string form
 */
import type { Parameter } from '../../types';
import paramsFile from '../../data/parameters.json' with { type: 'json' };

type ParamId = keyof typeof paramsFile.parameters;
const PARAMS = paramsFile.parameters as unknown as Record<string, Parameter>;

export function getParam(id: string): Parameter | undefined {
  return PARAMS[id];
}

export function sourced(display: string, paramId: ParamId | string, opts: { title?: string } = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sourced';
  b.dataset.param = String(paramId);
  b.textContent = display;
  const p = PARAMS[paramId];
  // "3,311. Trade-trained voluntary outflow. Show source". Where the trigger
  // already reads as the label — the event cards' source chips — saying it
  // twice is the screen reader's version of a stutter.
  const name = opts.title ?? p?.label ?? '';
  b.setAttribute('aria-label', name && name !== display ? `${display}. ${name}. Show source` : `${display}. Show source`);
  b.setAttribute('aria-haspopup', 'dialog');
  return b;
}

export function sourcedHtml(display: string, paramId: ParamId | string): string {
  const p = PARAMS[paramId];
  const label = escapeHtml(p?.label ?? '');
  return `<button type="button" class="sourced" data-param="${escapeHtml(String(paramId))}" aria-haspopup="dialog" aria-label="${escapeHtml(display)}. ${label}. Show source">${escapeHtml(display)}</button>`;
}

export function confidenceLabel(c: Parameter['confidence']): string {
  return c === 'primary' ? 'Primary' : c === 'derived' ? 'Derived' : 'Assumption';
}

export function formatValue(p: Parameter): string {
  const v = p.value;
  switch (p.unit) {
    case 'gbp':
      if (Math.abs(v) >= 1e9) return `£${(v / 1e9).toFixed(1)}bn`;
      if (Math.abs(v) >= 1e6) return `£${(v / 1e6).toFixed(0)}m`;
      return `£${v.toLocaleString('en-GB')}`;
    case 'pct':
      return `${v}%`;
    case 'ratio':
    case 'multiplier':
      return String(v);
    case 'pc':
      return v > 0 ? `+${v}` : String(v);
    default:
      return v.toLocaleString('en-GB');
  }
}

/**
 * The same figure in both dresses: `0.247 (25%)`.
 *
 * A ratio is written as a percentage everywhere the game speaks prose — the
 * action copy renders every `ratio` as one, and an event card says "25% of
 * notices served are contested" — while the parameter itself is 0.247. Tapping
 * the one and being shown the other reads like a different number (F23). The
 * headline says both; ranges and prose keep the raw form, which is the figure
 * the model actually multiplies by.
 *
 * Only for ratios that are a share of something: `junior_leader_ratio` (2.4)
 * and `instructor_ratio` (8) are one-per-n ratios, and a regression slope is
 * not a percentage of anything.
 */
export function headlineValue(p: Parameter): string {
  const raw = formatValue(p);
  if (p.unit !== 'ratio' || p.value <= 0 || p.value > 1) return raw;
  const pct = p.value * 100;
  // A fifth of a percent rounds to nothing, and "0%" of anything is a lie.
  return `${raw} (${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%)`;
}

let popover: HTMLDivElement | null = null;
let lastTrigger: HTMLElement | null = null;

export function initSourcedPopover(): void {
  if (popover) return;
  popover = document.createElement('div');
  popover.className = 'popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');
  popover.hidden = true;
  document.body.append(popover);

  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.sourced[data-param]');
    if (t) {
      e.preventDefault();
      if (lastTrigger === t && !popover!.hidden) closePopover();
      else openPopover(t);
      return;
    }
    if (!popover!.hidden && !popover!.contains(e.target as Node)) closePopover();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popover && !popover.hidden) {
      closePopover();
      lastTrigger?.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (popover && !popover.hidden && lastTrigger) position(lastTrigger);
  });
}

function openPopover(trigger: HTMLElement): void {
  const id = trigger.dataset.param!;
  const p = PARAMS[id];
  if (!popover) return;
  lastTrigger = trigger;
  if (!p) {
    popover.innerHTML = `<p class="popover-body">No source recorded for <code>${escapeHtml(id)}</code>. That is a bug.</p>`;
  } else {
    const badge = `<span class="badge badge-${p.confidence}">${confidenceLabel(p.confidence)}</span>`;
    const range = p.range ? `<p class="popover-meta">Plausible range: ${escapeHtml(fmtRange(p))}</p>` : '';
    const rationale = p.rationale ? `<p class="popover-rationale">${escapeHtml(p.rationale)}</p>` : '';
    const derivation = p.derivation ? `<p class="popover-meta">Derivation: ${escapeHtml(p.derivation)}</p>` : '';
    const link = p.url ? `<a class="popover-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">Open source ↗</a>` : '';
    popover.innerHTML = `
      <div class="popover-head">
        <span class="popover-value">${escapeHtml(headlineValue(p))}</span>
        ${badge}
        <button type="button" class="popover-close" aria-label="Close">×</button>
      </div>
      <p class="popover-label">${escapeHtml(p.label)}</p>
      <p class="popover-body">${escapeHtml(p.description)}</p>
      ${rationale}
      ${derivation}
      ${range}
      <p class="popover-meta">Source: ${escapeHtml(p.source)}<br>As of ${escapeHtml(p.asOf)}</p>
      ${link}
    `;
  }
  popover.hidden = false;
  position(trigger);
  popover.querySelector<HTMLButtonElement>('.popover-close')?.addEventListener('click', () => {
    closePopover();
    trigger.focus();
  });
  (popover.querySelector<HTMLElement>('.popover-close') ?? popover).focus();
}

function closePopover(): void {
  if (popover) popover.hidden = true;
}

/**
 * Fit the popover to the space the trigger leaves it, rather than hoping.
 *
 * The old rule placed it below the trigger and flipped it above only when the
 * whole thing fitted there. A long rationale fits neither way: ten of the
 * turn screen's popovers hung 27px below the fold on a 375x812 phone, under
 * the fixed footer. So the height is cut to whichever side has more room and
 * the popover scrolls inside itself, which is what the CSS cap already
 * assumed. The footer is subtracted where there is one — it sits above the
 * popover's stacking context and would otherwise eat the last three lines.
 */
function position(trigger: HTMLElement): void {
  if (!popover) return;
  const r = trigger.getBoundingClientRect();
  const pw = Math.min(360, window.innerWidth - 16);
  popover.style.width = pw + 'px';
  let left = r.left + window.scrollX;
  if (left + pw > window.scrollX + window.innerWidth - 8) left = window.scrollX + window.innerWidth - pw - 8;
  if (left < 8) left = 8;

  const gap = 6;
  const margin = 8;
  const footer = document.querySelector<HTMLElement>('.turnfoot');
  const floor = window.innerHeight - (footer?.getBoundingClientRect().height ?? 0) - margin;
  const spaceBelow = floor - r.bottom - gap;
  const spaceAbove = r.top - gap - margin;
  const below = spaceBelow >= spaceAbove;
  // A popover shorter than this is not worth reading; on a screen that short
  // it is clamped into view below instead, and scrolls.
  popover.style.maxHeight = Math.max(140, Math.floor(below ? spaceBelow : spaceAbove)) + 'px';

  const ph = popover.offsetHeight;
  let top = below ? r.bottom + gap : r.top - ph - gap;
  top = Math.min(Math.max(margin, top), Math.max(margin, floor - ph));
  popover.style.left = left + 'px';
  popover.style.top = top + window.scrollY + 'px';
}

function fmtRange(p: Parameter): string {
  if (!p.range) return '';
  const clone = (v: number) => formatValue({ ...p, value: v });
  return `${clone(p.range[0])} – ${clone(p.range[1])}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
