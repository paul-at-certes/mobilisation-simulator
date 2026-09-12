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
