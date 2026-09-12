/**
 * Share card: a 1200×630 PNG rendered client-side with the canvas API.
 * Shows difficulty, headcount vs ESE (the gap is the point), months, cost,
 * a one-line verdict and the seed URL. No external assets.
 */
import type { Score, Difficulty } from '../types';
import { displayEse, displayShortfall } from '../sim/score';

export interface ShareCardInput {
  difficulty: Difficulty;
  score: Score;
  siteUrl: string; // absolute URL of the game, used for the seed link
}

const W = 1200;
const H = 630;

const COLOURS = {
  paper: '#f6f4ee',
  ink: '#1c1b18',
  ink2: '#4a4843',
  ink3: '#6f6c65',
  rule: '#c9c5b8',
  accent: '#7a1f1f',
  ok: '#2f5d3a',
  headcount: '#b7c2d3',
  ese: '#7a1f1f',
};

const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

export function renderShareCard(input: ShareCardInput): HTMLCanvasElement {
  const { score, difficulty } = input;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Paper
  ctx.fillStyle = COLOURS.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = COLOURS.accent;
  ctx.fillRect(0, 0, W, 10);

  // Masthead
  ctx.fillStyle = COLOURS.ink;
  ctx.font = `600 30px ${SERIF}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Mobilisation Minister', 60, 70);
  ctx.font = `500 16px ${SANS}`;
  ctx.fillStyle = COLOURS.accent;
  const label = `${cap(difficulty)} · ${score.months} months`;
  ctx.fillText(label.toUpperCase(), 60, 100);

  // Headline
  const headline = score.resigned
    ? 'The Prime Minister has accepted your resignation.'
    : score.met
      ? `Target met: ${fmt(displayEse(score.ese))} effective soldiers.`
      // A shortfall now rounds up, so "missed by 1" is reachable and has to be singular.
      : `Target missed by ${fmt(displayShortfall(score.shortfall))} effective soldier${displayShortfall(score.shortfall) === 1 ? '' : 's'}.`;
  ctx.fillStyle = score.met && !score.resigned ? COLOURS.ok : COLOURS.accent;
  ctx.font = `600 40px ${SERIF}`;
  wrapText(ctx, headline, 60, 160, 1080, 46, 2);

  // Bars: headcount vs ESE
  const barX = 60;
  const barW = 760;
  const maxV = Math.max(score.headcount, score.target, 1);
  const rowY = [250, 320];
  const rows: [string, number, string][] = [
    ['Bodies fielded', score.headcount, COLOURS.headcount],
    ['Effective soldiers', score.ese, COLOURS.ese],
  ];
  ctx.font = `500 18px ${SANS}`;
  rows.forEach(([lbl, v, colour], i) => {
    const y = rowY[i];
    ctx.fillStyle = COLOURS.ink2;
    ctx.fillText(lbl, barX, y - 10);
    ctx.fillStyle = '#e6e2d6';
    ctx.fillRect(barX, y, barW, 34);
    ctx.fillStyle = colour;
    ctx.fillRect(barX, y, Math.max(2, (v / maxV) * barW), 34);
    ctx.fillStyle = COLOURS.ink;
    ctx.font = `600 22px ${SERIF}`;
    ctx.fillText(fmt(v), barX + barW + 16, y + 25);
    ctx.font = `500 18px ${SANS}`;
  });
  // Target marker
  const tx = barX + (score.target / maxV) * barW;
  ctx.strokeStyle = COLOURS.ink;
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx, 232);
  ctx.lineTo(tx, 362);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COLOURS.ink3;
  ctx.font = `500 15px ${SANS}`;
  ctx.fillText(`target ${fmt(score.target)}`, Math.min(tx + 8, 980), 380);

  // Stats row
  const stats: [string, string][] = [
    ['Force quality', score.quality.toFixed(2)],
    ['Leadership', score.leadership.toFixed(2)],
    ['Treasury cost', `£${score.cost / 1e9 < 10 ? (score.cost / 1e9).toFixed(1) : Math.round(score.cost / 1e9)}bn`],
    ['GDP output lost', `£${(score.gdpLoss / 1e9).toFixed(1)}bn`],
  ];
  stats.forEach(([k, v], i) => {
    const x = 60 + i * 270;
    ctx.fillStyle = COLOURS.ink3;
    ctx.font = `500 14px ${SANS}`;
    ctx.fillText(k.toUpperCase(), x, 430);
    ctx.fillStyle = COLOURS.ink;
    ctx.font = `600 30px ${SERIF}`;
    ctx.fillText(v, x, 466);
  });

  // Verdict
  ctx.fillStyle = COLOURS.ink2;
  ctx.font = `italic 22px ${SERIF}`;
  wrapText(ctx, `“${score.verdictOneLiner}”`, 60, 520, 1080, 28, 2);

  // Footer
  ctx.strokeStyle = COLOURS.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 575);
  ctx.lineTo(1140, 575);
  ctx.stroke();
  ctx.fillStyle = COLOURS.ink3;
  ctx.font = `500 15px ${SANS}`;
  ctx.fillText('Every number sourced. Effectiveness multipliers are modelling assumptions.', 60, 602);
  const link = `${input.siteUrl}${score.seedUrl}`;
  ctx.textAlign = 'right';
  ctx.fillText(link.replace(/^https?:\/\//, ''), 1140, 602);
  ctx.textAlign = 'left';

  return c;
}

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
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines: number): void {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++;
      line = words[i];
      if (lines === maxLines - 1) {
        // last line: truncate with ellipsis if needed
        let rest = words.slice(i).join(' ');
        while (ctx.measureText(rest + '…').width > maxW && rest.length) rest = rest.slice(0, -1);
        ctx.fillText(rest + (rest === words.slice(i).join(' ') ? '' : '…'), x, y + lines * lineH);
        return;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + lines * lineH);
}
