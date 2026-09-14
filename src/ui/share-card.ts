/**
 * Share card: a 1200×630 PNG rendered client-side with the canvas API, as the
 * front page the scoring screen shows. Nameplate, the result as a banner, a
 * standfirst, the two bars, one line of the verdict and the replay link. No
 * external assets: the typefaces are the game's own, and the card is drawn
 * once at once and again when they have loaded.
 *
 * `renderTeaserCard` draws the link-preview image for the site itself, in
 * the same idiom; the dev route `?card=og` shows it for saving.
 */
import type { Score, Difficulty } from '../types';
import { displayEse, displayShortfall } from '../sim/score';
import { P } from '../sim/params';
import { FIGURE_H, FIGURE_PATH, FIGURE_W } from './components/figure';

export interface ShareCardInput {
  difficulty: Difficulty;
  score: Score;
  siteUrl: string; // absolute URL of the game, used for the seed link
}

const W = 1200;
const H = 630;

const COLOURS = {
  paper: '#f6f2e8',
  ink: '#1a1916',
  ink2: '#4a4843',
  ink3: '#64615a',
  rule: '#a89f8c',
  red: '#8b1a1a',
  ok: '#2a5a3a',
};

const SERIF = '"Newsreader", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const COND = '"Barlow Condensed", "Arial Narrow", "Helvetica Neue", Helvetica, Arial, sans-serif';
const MONO = '"Courier Prime", "Courier New", Courier, monospace';

/** The faces the card sets, so it can wait for them and draw again. */
const FACES = ['800 132px "Barlow Condensed"', '700 18px "Barlow Condensed"', '800 40px "Newsreader"', '600 27px "Newsreader"', 'italic 400 19px "Newsreader"', '400 14px "Courier Prime"', '700 22px "Courier Prime"'];

type Ctx = CanvasRenderingContext2D;

export function renderShareCard(input: ShareCardInput): HTMLCanvasElement {
  return card((ctx) => paintResult(ctx, input));
}

/**
 * The link-preview card for the site. `sheet` sets a larger canvas with the
 * same page drawn inside a margin: GitHub's repository card is 1280×640 and
 * wants everything that matters 40px in from the edges, so the 1200×630 page
 * is laid at (40, 5) and only the decorative bottom rule reaches the edge.
 */
export function renderTeaserCard(siteUrl: string, sheet?: { width: number; height: number; offset: [number, number] }): HTMLCanvasElement {
  return card((ctx) => paintTeaser(ctx, siteUrl), sheet);
}

function card(paint: (ctx: Ctx) => void, sheet?: { width: number; height: number; offset: [number, number] }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = sheet?.width ?? W;
  c.height = sheet?.height ?? H;
  const ctx = c.getContext('2d')!;
  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    setSpacing(ctx, 0);
    if (sheet) ctx.translate(sheet.offset[0], sheet.offset[1]);
    paint(ctx);
  };
  draw();
  if ('fonts' in document) {
    Promise.all(FACES.map((f) => document.fonts.load(f))).then(draw, () => {});
  }
  return c;
}

// ---------------------------------------------------------------------------
// The two cards
// ---------------------------------------------------------------------------

function paintResult(ctx: Ctx, input: ShareCardInput): void {
  const { score, difficulty } = input;
  const formation = difficulty;
  const shortfall = displayShortfall(score.shortfall);
  const ese = displayEse(score.ese);
  const edition = score.resigned ? `MONTH ${score.months} · RESIGNED` : `MONTH ${score.months} · THE DEADLINE`;
  masthead(ctx, `${edition} · SECRETARY OF STATE FOR DEFENCE · ${difficulty.toUpperCase()} · ${score.months} MONTHS`);

  // The banner, and the sentence under it.
  const lines: [string, string] = score.resigned
    ? ['Minister', 'resigns']
    : score.met
      ? [formation, 'raised']
      : [fmt(shortfall), 'short'];
  banner(ctx, lines, score.met && !score.resigned ? COLOURS.ok : COLOURS.red);
  const standfirst = score.resigned
    ? `The Prime Minister has accepted the minister's resignation after ${score.months} months. ${fmt(ese)} effective soldiers stood ready of the ${fmt(score.target)} promised.`
    : score.met
      ? `Minister delivers the ${formation}: ${fmt(ese)} effective soldiers against a target of ${fmt(score.target)}, in ${score.months} months.`
      : `Minister misses ${formation} target: ${fmt(ese)} effective soldiers fielded of the ${fmt(score.target)} promised.`;
  ctx.fillStyle = COLOURS.ink;
  ctx.font = `600 27px ${SERIF}`;
  wrapText(ctx, standfirst, 56, 392, 570, 32, 3);

  // Right column: the two bars, a line of the verdict, the link.
  column(ctx);
  label(ctx, 'What was actually fielded', 700, 166);
  const c = score.composition;
  const kinds: [number, number, CanvasPattern | string][] = [
    [c.regulars.headcount, c.regulars.ese, COLOURS.ink],
    [c.reservists.headcount, c.reservists.ese, pattern(ctx, 'hatch')],
    [c.exRegulars.headcount, c.exRegulars.ese, pattern(ctx, 'cross')],
    [c.strategic.headcount, c.strategic.ese, pattern(ctx, 'dots')],
    [c.conscripts.headcount, c.conscripts.ese, COLOURS.red],
  ];
  const maxV = Math.max(score.headcount, score.target, 1);
  const trackX = 700;
  const trackW = 386;
  const rows: [string, 0 | 1, number, string][] = [
    ['Bodies', 0, 200, COLOURS.ink],
    ['Effective', 1, 280, COLOURS.red],
  ];
  for (const [name, idx, y, valueColour] of rows) {
    ctx.fillStyle = COLOURS.ink;
    ctx.font = `400 20px ${MONO}`;
    ctx.fillText(name, trackX, y);
    ctx.strokeStyle = COLOURS.rule;
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX + 0.5, y + 10.5, trackW, 30);
    let x = trackX;
    for (const kind of kinds) {
      const w = (kind[idx] / maxV) * trackW;
      if (w > 0) {
        ctx.fillStyle = kind[2];
        ctx.fillRect(x, y + 10, w, 30);
      }
      x += w;
    }
    ctx.fillStyle = valueColour;
    ctx.font = `700 22px ${MONO}`;
    ctx.fillText(fmt(idx === 0 ? score.headcount : ese), trackX + trackW + 8, y + 33);
  }
  const tx = Math.min(trackX + trackW - 1, trackX + (score.target / maxV) * trackW);
  ctx.strokeStyle = COLOURS.ink;
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tx, 186);
  ctx.lineTo(tx, 330);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLOURS.ink3;
  ctx.font = `400 15px ${MONO}`;
  ctx.textAlign = tx > trackX + trackW * 0.8 ? 'right' : 'center';
  ctx.fillText(`target ${fmt(score.target)}`, tx, 350);
  ctx.textAlign = 'left';

  ctx.fillStyle = COLOURS.ink2;
  ctx.font = `italic 400 19px ${SERIF}`;
  wrapText(ctx, `“${score.verdictOneLiner}”`, 700, 400, 440, 26, 4);

  footer(ctx, 'Play it yourself · every number sourced', `${input.siteUrl}${score.seedUrl}`);
}

function paintTeaser(ctx: Ctx, siteUrl: string): void {
  masthead(ctx, 'DAY 0 · SECRETARY OF STATE FOR DEFENCE · A SOURCED CRISIS GAME');
  banner(ctx, ['22,000', 'soldiers.'], COLOURS.red);
  ctx.fillStyle = COLOURS.ink;
  ctx.font = `600 27px ${SERIF}`;
  wrapText(ctx, 'You are the Secretary of State for Defence. You have twelve months. Headcount is easy; trained, led, equipped soldiers are slow.', 56, 392, 570, 32, 4);

  column(ctx);
  label(ctx, 'What one person counts for', 700, 166);
  const weights: [string, number][] = [
    ['regular', 1],
    ['reservist', P.eff_reserve_volunteer],
    ['conscript', P.eff_conscript_normal_start],
  ];
  const scale = 5.2;
  weights.forEach(([name, value], i) => {
    const x = 700 + i * 165;
    figure(ctx, x, 190, scale, value);
    ctx.fillStyle = COLOURS.ink;
    ctx.font = `400 18px ${MONO}`;
    ctx.fillText(`${name} ${value.toFixed(1)}`, x, 190 + FIGURE_H * scale + 34);
  });
  ctx.fillStyle = COLOURS.ink2;
  ctx.font = `italic 400 19px ${SERIF}`;
  wrapText(ctx, '“A reservist after a refresher is 0.8. A conscript fresh out of training is 0.5, and less if there are not enough junior leaders to lead them.”', 700, 430, 440, 26, 4);
  footer(ctx, 'Ten minutes, on a phone · every number sourced', siteUrl);
}

// ---------------------------------------------------------------------------
// The furniture
// ---------------------------------------------------------------------------

/** Paper, nameplate, the typed edition line, the stamp, and the rules under them. */
function masthead(ctx: Ctx, edition: string): void {
  // Paper and the red rule along the foot belong to the whole canvas, whatever
  // sheet the page is laid on.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLOURS.paper;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = COLOURS.red;
  ctx.fillRect(0, ctx.canvas.height - 10, ctx.canvas.width, 10);
  ctx.restore();

  ctx.fillStyle = COLOURS.ink;
  ctx.font = `800 40px ${SERIF}`;
  setSpacing(ctx, 2.4);
  ctx.fillText('THE MORNING DESPATCH', 56, 74);
  ctx.font = `400 14px ${MONO}`;
  setSpacing(ctx, 0.7);
  ctx.fillStyle = COLOURS.ink3;
  ctx.fillText(edition, 56, 100);
  setSpacing(ctx, 0);

  // The stamp, a little off true.
  ctx.save();
  ctx.translate(982, 42);
  ctx.rotate((5 * Math.PI) / 180);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = COLOURS.red;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(0.5, 0.5, 190, 58);
  ctx.strokeRect(4.5, 4.5, 182, 50);
  ctx.fillStyle = COLOURS.red;
  ctx.textAlign = 'center';
  ctx.font = `700 18px ${COND}`;
  setSpacing(ctx, 1.8);
  ctx.fillText('OFFICIAL-SENSITIVE', 95, 29);
  ctx.font = `600 12px ${COND}`;
  setSpacing(ctx, 2.4);
  ctx.fillText('FICTION', 95, 47);
  setSpacing(ctx, 0);
  ctx.restore();
  ctx.textAlign = 'left';

  ctx.fillStyle = COLOURS.ink;
  ctx.fillRect(56, 118, W - 112, 1);
  ctx.fillRect(56, 124, W - 112, 1);
  ctx.fillRect(56, 128, W - 112, 1);
}

/** The banner: a big line and a smaller one under it, in the result's colour. */
function banner(ctx: Ctx, lines: [string, string], colour: string): void {
  ctx.fillStyle = colour;
  ctx.font = `800 132px ${COND}`;
  setSpacing(ctx, -2);
  ctx.fillText(lines[0].toUpperCase(), 52, 262);
  ctx.font = `800 96px ${COND}`;
  setSpacing(ctx, -1);
  ctx.fillText(lines[1].toUpperCase(), 54, 348);
  setSpacing(ctx, 0);
}

function column(ctx: Ctx): void {
  ctx.fillStyle = COLOURS.ink;
  ctx.fillRect(668, 150, 1, 420);
}

function label(ctx: Ctx, text: string, x: number, y: number): void {
  ctx.fillStyle = COLOURS.ink;
  ctx.font = `700 18px ${COND}`;
  setSpacing(ctx, 2.5);
  ctx.fillText(text.toUpperCase(), x, y);
  setSpacing(ctx, 0);
}

function footer(ctx: Ctx, line: string, url: string): void {
  ctx.fillStyle = COLOURS.ink3;
  ctx.font = `400 13px ${MONO}`;
  ctx.fillText(line, 700, 560);
  ctx.fillText(url.replace(/^https?:\/\//, ''), 700, 582);
}

/** One soldier figure, `scale` times its 14×26 units, filled from the feet up to `frac`. */
function figure(ctx: Ctx, x: number, y: number, scale: number, frac: number): void {
  const path = new Path2D(FIGURE_PATH);
  const w = FIGURE_W * scale;
  const hgt = FIGURE_H * scale;
  const shapes = () => {
    ctx.beginPath();
    ctx.arc(7, 3.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fill(path);
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = COLOURS.red;
  ctx.beginPath();
  ctx.arc(7, 3.5, 3.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.stroke(path);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y + hgt * (1 - frac), w, hgt * frac);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = COLOURS.red;
  shapes();
  ctx.restore();
}

/** The chart textures: hatch, cross-hatch and dots, in ink. */
const patterns = new WeakMap<Ctx, Record<string, CanvasPattern>>();
function pattern(ctx: Ctx, kind: 'hatch' | 'cross' | 'dots'): CanvasPattern | string {
  const cache = patterns.get(ctx) ?? {};
  if (cache[kind]) return cache[kind];
  const t = document.createElement('canvas');
  t.width = 8;
  t.height = 8;
  const p = t.getContext('2d');
  if (!p) return COLOURS.ink2;
  p.strokeStyle = COLOURS.ink;
  p.fillStyle = COLOURS.ink;
  p.lineWidth = 1.6;
  if (kind === 'hatch') {
    p.beginPath();
    p.moveTo(-2, 10);
    p.lineTo(10, -2);
    p.moveTo(-2, 2);
    p.lineTo(2, -2);
    p.moveTo(6, 10);
    p.lineTo(10, 6);
    p.stroke();
  } else if (kind === 'cross') {
    p.lineWidth = 1.2;
    p.beginPath();
    p.moveTo(0, 0.5);
    p.lineTo(8, 0.5);
    p.moveTo(0.5, 0);
    p.lineTo(0.5, 8);
    p.stroke();
  } else {
    p.beginPath();
    p.arc(4, 4, 1.6, 0, Math.PI * 2);
    p.fill();
  }
  const made = ctx.createPattern(t, 'repeat');
  if (!made) return COLOURS.ink2;
  cache[kind] = made;
  patterns.set(ctx, cache);
  return made;
}

/** Tracking, where the canvas supports it (Chrome, Safari 17+); otherwise ignored. */
function setSpacing(ctx: Ctx, px: number): void {
  const c = ctx as Ctx & { letterSpacing?: string };
  if ('letterSpacing' in c) c.letterSpacing = `${px}px`;
}

function wrapText(ctx: Ctx, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): void {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines++;
      if (lines === maxLines) {
        ctx.fillText(`${line}…`, x, y);
        return;
      }
      ctx.fillText(line, x, y);
      y += lineH;
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

// ---------------------------------------------------------------------------
// Getting it off the page
// ---------------------------------------------------------------------------

export async function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

/** Copies the PNG to the clipboard where supported; otherwise returns false so the UI can offer a download. */
export async function copyImage(c: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await canvasToBlob(c);
    const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (!ClipboardItemCtor || !navigator.clipboard?.write) return false;
    await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Whether the browser offers a share sheet that takes a file: mobile Safari and Chrome do, desktop mostly does not. */
export function canShareImages(): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (!nav.share || !nav.canShare || typeof File === 'undefined') return false;
    return nav.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/**
 * Hand the card to the system share sheet with the one-liner and the replay
 * link. `cancelled` is the user closing the sheet, which is not a failure and
 * should not trigger the download fallback.
 */
export async function shareImage(c: HTMLCanvasElement, data: { title: string; text: string; url: string }): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    const blob = await canvasToBlob(c);
    const file = new File([blob], 'mobilisation-minister.png', { type: 'image/png' });
    await navigator.share({ files: [file], title: data.title, text: `${data.text} ${data.url}` });
    return 'shared';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

export function downloadImage(c: HTMLCanvasElement, filename = 'mobilisation-minister.png'): void {
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = filename;
  a.click();
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}
