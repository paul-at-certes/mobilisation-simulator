#!/usr/bin/env node
/**
 * Generates ASSUMPTIONS.md from src/data/parameters.json so the list of
 * assumptions can never drift from the numbers the game actually uses.
 * The preamble (modelling assumptions that are not single numbers) is
 * maintained by hand in scripts/assumptions-preamble.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const data = JSON.parse(readFileSync(join(root, 'src', 'data', 'parameters.json'), 'utf8'));
const preamble = readFileSync(join(here, 'assumptions-preamble.md'), 'utf8');

const fmt = (v, unit) => {
  if (unit === 'gbp') return v >= 1e9 ? `£${(v / 1e9).toFixed(1)}bn` : v >= 1e6 ? `£${(v / 1e6).toFixed(0)}m` : `£${v.toLocaleString('en-GB')}`;
  if (unit === 'pct') return `${v}%`;
  if (unit === 'ratio' || unit === 'multiplier') return String(v);
  return v.toLocaleString('en-GB');
};

const sections = data.sections;
const bySection = {};
for (const [id, p] of Object.entries(data.parameters)) {
  (bySection[p.section] ??= []).push([id, p]);
}

let out = `# Assumptions\n\n`;
out += `*Generated from \`src/data/parameters.json\` (v${data.version}) by \`npm run assumptions\` on ${new Date().toISOString().slice(0, 10)}. Edit the JSON or \`scripts/assumptions-preamble.md\`, not this file.*\n\n`;
out += preamble.trim() + '\n\n';

out += `## Numerical assumptions\n\nEvery parameter tagged \`assumption\` in the game, with its plausible range and the one-line rationale shown in the source popover. Values were tuned only within these ranges during the balance pass.\n\n`;
for (const [sec, title] of Object.entries(sections)) {
  const rows = (bySection[sec] ?? []).filter(([, p]) => p.confidence === 'assumption');
  if (!rows.length) continue;
  out += `### ${title}\n\n| Parameter | Value | Range | Rationale |\n|---|---|---|---|\n`;
  for (const [id, p] of rows) {
    out += `| \`${id}\` — ${p.label} | ${fmt(p.value, p.unit)} | ${fmt(p.range[0], p.unit)} – ${fmt(p.range[1], p.unit)} | ${p.rationale} |\n`;
  }
  out += '\n';
}

out += `## Derived figures\n\nFigures computed from primary sources, with the arithmetic.\n\n| Parameter | Value | Derivation | Source |\n|---|---|---|---|\n`;
for (const [id, p] of Object.entries(data.parameters)) {
  if (p.confidence !== 'derived') continue;
  const src = p.url ? `[${p.source}](${p.url})` : p.source;
  out += `| \`${id}\` — ${p.label} | ${fmt(p.value, p.unit)} | ${p.derivation ?? ''} | ${src} |\n`;
}
out += '\n';

out += `## Primary figures\n\n| Parameter | Value | As of | Source |\n|---|---|---|---|\n`;
for (const [id, p] of Object.entries(data.parameters)) {
  if (p.confidence !== 'primary') continue;
  out += `| \`${id}\` — ${p.label} | ${fmt(p.value, p.unit)} | ${p.asOf} | [${p.source}](${p.url}) |\n`;
}
out += '\n';

writeFileSync(join(root, 'ASSUMPTIONS.md'), out);
const n = Object.values(data.parameters).filter((p) => p.confidence === 'assumption').length;
console.log(`ASSUMPTIONS.md written (${n} numerical assumptions)`);
