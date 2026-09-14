/**
 * The soldier pictogram: one figure, drawn once, used wherever the game
 * counts people rather than plotting them. The isotype under Force Ready is
 * rows of it; the opening screen's weightings fill it to 1.0, 0.8 and 0.5.
 *
 * 14 wide by 26 tall in its own units. Head, then a torso with two legs.
 */
import { s } from '../dom';

export const FIGURE_W = 14;
export const FIGURE_H = 26;
export const FIGURE_PATH = 'M1.5 10a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v8h-2.4v8h-2.4v-8h-1.4v8H4v-8H1.5z';

/** The figure's two shapes, in figure units, as a group carrying `cls`. */
export function figureShapes(cls: string): SVGGElement {
  return s('g', { class: cls }, s('circle', { cx: 7, cy: 3.5, r: 3.2 }), s('path', { d: FIGURE_PATH }));
}

/**
 * One figure filled from the feet up to `frac` of its height, over an
 * outline. `id` must be unique in the document: it names the clip.
 */
export function figureGlyph(frac: number, id: string, cls = 'figure'): SVGSVGElement {
  const f = Math.max(0, Math.min(1, frac));
  const svg = s('svg', { class: cls, viewBox: `0 0 ${FIGURE_W} ${FIGURE_H}`, width: FIGURE_W, height: FIGURE_H, 'aria-hidden': 'true', focusable: 'false' });
  svg.append(
    s('defs', {}, s('clipPath', { id }, s('rect', { x: 0, y: FIGURE_H * (1 - f), width: FIGURE_W, height: FIGURE_H * f }))),
    figureShapes('fig-empty'),
    s('g', { 'clip-path': `url(#${id})` }, figureShapes('fig-fill')),
  );
  return svg;
}
