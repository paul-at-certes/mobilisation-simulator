#!/usr/bin/env node
/**
 * Fails the build if any parameter lacks source metadata.
 *
 * Rules:
 *  - every parameter has value (number), unit, label, description, section, source, asOf, confidence
 *  - confidence ∈ {primary, derived, assumption}
 *  - primary → url required (non-empty)
 *  - derived → derivation or url required
 *  - assumption → range and rationale required
 *  - section must exist in `sections`
 *  - asOf must be an ISO date
 *  - player-visible fields name nothing the player cannot open (see below)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'src', 'data', 'parameters.json');
const data = JSON.parse(readFileSync(file, 'utf8'));

const errors = [];

// The file's own header fields. `generated` is stamped into ASSUMPTIONS.md, so a
// missing or malformed one would print there rather than fail here.
if (typeof data.version !== 'string' || !data.version) errors.push('file: missing version');
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.generated ?? '')) errors.push('file: generated must be YYYY-MM-DD');
const warnings = [];
const confidences = new Set(['primary', 'derived', 'assumption']);

/** Fields the source popover and the methodology table read out to the player. */
const PLAYER_VISIBLE = ['label', 'description', 'rationale', 'derivation', 'source'];

/** Things that exist only in this repository. */
const DANGLING = [
  { re: /\bdocs\/[\w.-]+/, what: 'a file in docs/' },
  { re: /\bDECISIONS\.md\b/, what: 'the decisions log' },
  { re: /\b[Dd]esign brief\b/, what: 'the design brief' },
  { re: /\bdesign review\b|\bdesign-review\b/, what: 'the design review' },
  { re: /(?<![A-Za-z0-9])F\d{1,2}(?![\d\w])/, what: 'a design-review finding number' },
  { re: /\bnpm run\b/, what: 'a build command' },
  { re: /\b\w+\.(ts|mjs|json)\b/, what: 'a source file' },
  { re: /\bbalance pass\b/, what: "a stage of this repository's history" },
];
const required = ['value', 'unit', 'label', 'description', 'section', 'source', 'asOf', 'confidence'];

for (const [id, p] of Object.entries(data.parameters)) {
  for (const k of required) {
    if (p[k] === undefined || p[k] === null || p[k] === '') errors.push(`${id}: missing ${k}`);
  }
  if (typeof p.value !== 'number' || Number.isNaN(p.value)) errors.push(`${id}: value must be a number`);
  if (!confidences.has(p.confidence)) errors.push(`${id}: confidence must be primary|derived|assumption`);
  if (!(p.section in data.sections)) errors.push(`${id}: unknown section ${p.section}`);
  if (p.asOf && !/^\d{4}-\d{2}-\d{2}$/.test(p.asOf)) errors.push(`${id}: asOf must be YYYY-MM-DD`);
  if (p.confidence === 'primary' && !p.url) errors.push(`${id}: primary figures need a url`);
  if (p.confidence === 'derived' && !p.derivation && !p.url) errors.push(`${id}: derived figures need a derivation or url`);
  if (p.confidence === 'assumption') {
    if (!Array.isArray(p.range) || p.range.length !== 2) errors.push(`${id}: assumptions need a [lo, hi] range`);
    else if (p.value < p.range[0] || p.value > p.range[1]) errors.push(`${id}: value ${p.value} outside range ${p.range}`);
    if (!p.rationale) errors.push(`${id}: assumptions need a rationale`);
  }
  if (p.confidence === 'derived' && !p.url && !p.derivation) warnings.push(`${id}: derived figure has neither url nor derivation`);

  /*
   * Nothing the player cannot open.
   *
   * `label`, `description`, `rationale`, `derivation` and `source` are read
   * out in the source popover and the methodology page's parameter table, so
   * they are player-facing prose. They used to cite the design brief, the
   * decisions log and design-review finding numbers — documents that live in
   * the repository and nowhere the player will ever look, and a citation that
   * cannot be followed is worse than none, because it advertises that
   * something is being withheld.
   *
   * The working trail is not lost: it belongs in `note`, which is rendered
   * nowhere, or in the documents themselves. Add to this list, don't route
   * around it.
   */
  for (const f of PLAYER_VISIBLE) {
    const v = p[f];
    if (typeof v !== 'string') continue;
    for (const { re, what } of DANGLING) {
      if (re.test(v)) errors.push(`${id}: ${f} names ${what}, which the player cannot open — put it in "note"`);
    }
  }
}

// `generated` means the date the parameter set was last revised, and it is what
// ASSUMPTIONS.md stamps. Two things must hold, and the first is a logical
// invariant rather than a convention: the set cannot have been revised before
// the most recent figure in it was published, so `generated` is never older
// than the newest `asOf`. That catches the common way this field rots — someone
// goes and finds newer data, adds it, and forgets to bump the header.
//
// What it does NOT catch: adding a parameter whose `asOf` is older than the
// current `generated` (a historical figure, a re-derivation of something long
// published). Bumping the field is still a human step in those cases.
if (/^\d{4}-\d{2}-\d{2}$/.test(data.generated ?? '')) {
  let newest = '';
  let newestId = '';
  for (const [id, p] of Object.entries(data.parameters)) {
    if (typeof p.asOf === 'string' && p.asOf > newest) {
      newest = p.asOf;
      newestId = id;
    }
  }
  if (newest && newest > data.generated) {
    errors.push(
      `file: generated ${data.generated} is older than the newest asOf (${newest}, ${newestId}) — bump "generated" when you add or revise a parameter`,
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  if (data.generated > today) errors.push(`file: generated ${data.generated} is in the future`);
}

if (warnings.length) {
  console.warn(`parameters.json: ${warnings.length} warning(s)`);
  for (const w of warnings) console.warn('  - ' + w);
}
if (errors.length) {
  console.error(`parameters.json: ${errors.length} error(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const n = Object.keys(data.parameters).length;
const byConf = {};
for (const p of Object.values(data.parameters)) byConf[p.confidence] = (byConf[p.confidence] ?? 0) + 1;
console.log(`parameters.json OK: ${n} parameters (${Object.entries(byConf).map(([k, v]) => `${v} ${k}`).join(', ')})`);
