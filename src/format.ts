/**
 * format.ts — how a number is rendered to the player, in one place.
 *
 * There were three implementations of `formatInt` — `src/sim/score.ts`,
 * `src/ui/dom.ts` and `src/ui/briefing.ts` — and they disagreed on nine of
 * nineteen test inputs: the minus sign, what a non-finite value prints as, and
 * whether grouping went through the runtime locale. That is how one rounding
 * rule came to be applied three different ways (design review F18).
 *
 * Rounding *rules* that mean something about the game live with the thing they
 * describe — `displayEse`, `displayShortfall` and `displaySurplus` are in
 * `score.ts` because "never flatter the result" is a scoring decision. This
 * module is only the typography.
 */

/**
 * 70,951. The canonical integer rendering, and the only one.
 *
 * - **Non-finite prints as `n/a`**, never `NaN` or `Infinity`: a player should
 *   not be shown a JavaScript value. `refusalCaseload` can be infinite when the
 *   courts will never clear, so this is a live case and not a nicety.
 * - **Negative uses U+2212**, the typographic minus rather than the ASCII
 *   hyphen. It is the correct glyph in running text, and it is digit-width, so
 *   it aligns in the `tabular-nums` columns the UI sets. `holding.ts` had
 *   already reached for it by hand, which settled the convention.
 * - **Grouping is done here rather than by `toLocaleString`**, so the output
 *   cannot shift with the runtime's locale data.
 * - **`-0` prints as `0`.** `Math.round(-0.4)` is `-0`, and the locale-based
 *   implementation rendered that as "-0". Not reachable today — every caller
 *   either passes a count or handles the sign itself — but it was one negative
 *   delta away from being so.
 */
export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const rounded = Math.round(n);
  // `-0 < 0` is false, so a rounded negative zero falls through unsigned.
  const sign = rounded < 0 ? '−' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Money and percentages come in two forms, and the names say which.
 *
 * **`*Tabular`** is for a figure in a column — a `stat()` tile or a ledger
 * `row()`. The unit is fixed (always £bn) and the precision is higher, because
 * the reader is comparing it against the figure above it and the decimal points
 * have to line up. These are the ones set in `tabular-nums`.
 *
 * **`*Prose`** is for a figure in a sentence. It picks the natural unit — £85m
 * rather than £0.09bn — and rounds harder, because the reader meets it once and
 * reads it aloud in their head. It also carries the `n/a` and U+2212 behaviour
 * of `formatInt`.
 *
 * They were `fmtBn`/`formatGbpBn` and `fmtPct`/`formatPct`, one pair in
 * `ui/dom.ts` and one in `ui/briefing.ts`, which invited picking the wrong one
 * and hid that `formatGbpBn` did not always render billions. Design review F18.
 */

/** £12.34bn — fixed unit, for a column of figures. */
export function gbpTabular(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const bn = n / 1e9;
  return `£${bn < 10 ? bn.toFixed(2) : bn < 100 ? bn.toFixed(1) : Math.round(bn)}bn`;
}

/** 12.3% — a decimal place by default, for a column of figures. */
export function pctTabular(n: number, dp = 1): string {
  if (!Number.isFinite(n)) return 'n/a';
  return `${n.toFixed(dp)}%`;
}

/** £85m, £12.3bn — the natural unit, for a sentence. */
export function gbpProse(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs < 1e9) return `${sign}£${Math.round(abs / 1e6)}m`;
  if (abs < 100e9) return `${sign}£${(abs / 1e9).toFixed(1)}bn`;
  return `${sign}£${Math.round(abs / 1e9)}bn`;
}

/** 12% — whole numbers, for a sentence. */
export function pctProse(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  return `${Math.round(n)}%`;
}

/**
 * +3, −7. A delta with its sign shown.
 *
 * There were two of these called `signed`, one in `ui/dom.ts` and one private
 * to `ui/briefing.ts`, and they disagreed: the first printed an ASCII hyphen
 * and did not round, so the action menu showed `-7 PC` while the briefing
 * showed `−7` for the same figure. This is the briefing's, which goes through
 * `formatInt` and therefore obeys the one convention.
 */
export function signedInt(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const rounded = Math.round(n);
  return rounded > 0 ? `+${formatInt(rounded)}` : formatInt(rounded);
}
