/** Tiny DOM helpers. No framework; the UI is a handful of screens. */

type Child = Node | string | null | undefined | false | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | ((e: Event) => void) | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el: HTMLElement, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}
export function fmtBn(n: number): string {
  const bn = n / 1e9;
  return `£${bn < 10 ? bn.toFixed(2) : bn < 100 ? bn.toFixed(1) : Math.round(bn)}bn`;
}
export function fmtPct(n: number, dp = 1): string {
  return `${n.toFixed(dp)}%`;
}
export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
