/**
 * Methodology page: renders parameters.json as a table grouped by section,
 * the structural assumptions, the effectiveness table with its caveats, and
 * the list of what the game deliberately ignores.
 */
import './styles.css';
import paramsFile from './data/parameters.json' with { type: 'json' };
import type { Parameter } from './types';
import { initSourcedPopover, sourcedHtml, formatValue, confidenceLabel, escapeHtml } from './ui/components/sourced';
import preamble from '../scripts/assumptions-preamble.md?raw';

const PARAMS = paramsFile.parameters as unknown as Record<string, Parameter>;
const SECTIONS = paramsFile.sections as Record<string, string>;

const root = document.getElementById('methodology')!;
initSourcedPopover();

root.innerHTML = `
  <h1>How this works</h1>
  <p class="premise">The game is a calculator wearing a costume. Every number the player sees is drawn from a sourced dataset and can be inspected by tapping it. This page lists all of them, explains the model, and says what it leaves out.</p>
  <p class="toc">
    <a href="#model">The model</a> <a href="#effectiveness">Effectiveness</a> <a href="#assumptions">Assumptions</a>
    <a href="#parameters">All parameters</a> <a href="#ignored">What is ignored</a> <a href="#sources">Sources</a> <a href="#update">Updating</a>
  </p>

  <h2 id="model">The model</h2>
  <p>One turn is one calendar month. The player has three gauges: <strong>Force Ready</strong> (effective-soldier equivalents delivered against the target), <strong>Force Quality</strong> (the weighted average effectiveness of everything counted) and <strong>Political Capital</strong> (an abstract measure of the government's ability to keep doing this).</p>
  <p>Effective-soldier equivalents (ESE) are the sum over every bucket of headcount × effectiveness × leadership factor. Only a ${sourcedHtml(pct('regular_deployable_fraction'), 'regular_deployable_fraction')} slice of the ${sourcedHtml(fmt('regular_trained_start'), 'regular_trained_start')} trade-trained regulars counts: the premise is that the new formation is raised on top of the standing Army's existing commitments.</p>
  <p>The training estate is one estate. Regular recruiting continues at ${sourcedHtml(fmt('regular_untrained_intake_annual'), 'regular_untrained_intake_annual')} a year and uses the baseline pipeline of ${sourcedHtml(fmt('regular_gains_annual'), 'regular_gains_annual')} trade-trained graduates a year first. Conscripts can only use spare capacity, so the player must buy more (${sourcedHtml('+' + fmt('capacity_purchase_annual') + '/yr', 'capacity_purchase_annual')} per purchase) or compress the syllabus. Each purchase pulls ${sourcedHtml(fmt('leaders_per_capacity_purchase'), 'leaders_per_capacity_purchase')} junior leaders out of the field force as instructors.</p>
  <p>The junior leadership cadre (Corporal to Staff Sergeant, Second Lieutenant to Captain) is ${sourcedHtml(fmt('junior_leaders'), 'junior_leaders')}. Only ${sourcedHtml(pct('junior_leaders_spareable_fraction'), 'junior_leaders_spareable_fraction')} of it can be taken from regular units without hollowing them out. Every ${sourcedHtml(fmt('junior_leader_ratio'), 'junior_leader_ratio')} conscripts in training or in the field need one leader. When demand exceeds the spareable supply, the leadership factor falls below one and scales the effectiveness of every conscript bucket. That is the Russian-2022 mechanic: bodies without section commanders.</p>
  <p>Political capital starts at ${sourcedHtml(fmt('pc_start'), 'pc_start')}, drains by ${sourcedHtml(fmt('pc_baseline_drain'), 'pc_baseline_drain')} a month, is charged for each action, and is penalised as cumulative Treasury cost and GDP loss mount. Below zero, the Prime Minister accepts your resignation.</p>
  <p>Random events are drawn with a seeded pseudo-random generator (mulberry32), so a run can be replayed exactly from the <code>?seed=</code> in its share link.</p>

  <h2 id="effectiveness">Effectiveness multipliers</h2>
  <p>These are <em>modelling assumptions</em>, not measurements. They are ordinal judgements with plausible ranges, and the game shows them as such wherever they appear.</p>
  <div class="table-wrap"><table class="param-table">
    <thead><tr><th>Bucket</th><th class="num">Effectiveness</th><th>Range</th></tr></thead>
    <tbody>
      ${effRow('Regular, trade-trained', 'eff_regular')}
      ${effRow('Volunteer reservist, after refresher', 'eff_reserve_volunteer')}
      ${effRow('Ex-regular, recalled (on record)', 'eff_ex_regular')}
      ${effRow('Strategic Reserve, traced', 'eff_strategic')}
      ${effRow('Conscript at graduation, normal syllabus', 'eff_conscript_normal_start')}
      ${effRow('Conscript cap, normal syllabus', 'eff_conscript_normal_cap')}
      ${effRow('Conscript at graduation, compressed syllabus', 'eff_conscript_compressed_start')}
      ${effRow('Conscript cap, compressed syllabus', 'eff_conscript_compressed_cap')}
      ${effRow('Conscript growth per month of collective training', 'eff_conscript_growth_monthly')}
      ${effRow('Conscript, trained, unequipped', 'eff_conscript_unequipped')}
      <tr><td>In training, holding pool, pending arrival</td><td class="num">0</td><td>—</td></tr>
    </tbody>
  </table></div>
  <p class="small muted">Caveats. Trevor Dupuy's <em>Numbers, Predictions and War</em> (1979) is the best-known attempt to put multipliers on combat effectiveness and has been criticised ever since for fitting history rather than predicting it. Stephen Biddle's <em>Military Power</em> (2004) argues that force employment, not headcount or materiel, explains modern outcomes. Ian Malcolm Brown's <em>British Logistics on the Western Front, 1914–1919</em> (1998) shows how far logistics rather than manpower governed what a force could do. The game uses multipliers because a game needs a score, not because the numbers are known.</p>

  <h2 id="assumptions">Structural assumptions</h2>
  <div id="preamble"></div>

  <h2 id="parameters">All parameters</h2>
  <p class="small">Badges: <span class="badge badge-primary">Primary</span> read directly from an official publication; <span class="badge badge-derived">Derived</span> computed from primary figures (the derivation is in the popover); <span class="badge badge-assumption">Assumption</span> a modelling choice with a stated range and rationale. Tap a value for its popover.</p>
  <div id="param-sections"></div>

  <h2 id="ignored">What this game deliberately ignores</h2>
  <ul>
    <li>The Royal Navy and the Royal Air Force, entirely. The division is an Army problem; the sea and air enablers it would need are not modelled.</li>
    <li>The equipment industrial base beyond personal kit: vehicles, artillery, ammunition, communications.</li>
    <li>The physical capacity of the training estate: accommodation, ranges, simulators.</li>
    <li>Tooth-to-tail ratios and enablers. The target is a headcount of effective soldiers, not a force structure.</li>
    <li>Scotland and Northern Ireland population detail. A scaling factor of ${sourcedHtml(fmt('uk_population_scaling'), 'uk_population_scaling')} is applied to England and Wales.</li>
    <li>Women's role restrictions, which no longer exist in UK ground close combat but would affect a 1939-style schedule of reserved occupations.</li>
    <li>Officer generation. Sandhurst is not modelled; junior officers are counted in the leadership cadre and nowhere else.</li>
    <li>Non-voluntary regular outflow (time expiry, medical discharge), pay awards, and the 2027 pension-rate change.</li>
  </ul>

  <h2 id="sources">Principal sources</h2>
  <ul id="sources-list"></ul>

  <h2 id="update">Updating the numbers</h2>
  <p>When the next Service Personnel Statistics land (the 1 October 2026 release is due in December 2026), edit <code>src/data/parameters.json</code>: change <code>value</code>, <code>asOf</code> and the table reference in <code>source</code> for each SPS-derived entry, then run <code>npm run validate</code> and <code>npm run sim -- --all</code> to check the balance still holds. The README has the full list of which parameters come from which table.</p>
`;

// Structural assumptions: minimal markdown → HTML for the preamble's numbered list and bold.
document.getElementById('preamble')!.innerHTML = mdToHtml(preamble);

// Parameter tables by section.
const secEl = document.getElementById('param-sections')!;
for (const [sec, title] of Object.entries(SECTIONS)) {
  const rows = Object.entries(PARAMS).filter(([, p]) => p.section === sec);
  if (!rows.length) continue;
  const h = document.createElement('h3');
  h.textContent = title;
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.innerHTML = `<table class="param-table"><thead><tr><th>Parameter</th><th class="num">Value</th><th>Confidence</th><th>Source</th><th>As of</th></tr></thead><tbody>${rows
    .map(
      ([id, p]) =>
        `<tr><td>${escapeHtml(p.label)}<br><span class="small muted"><code>${escapeHtml(id)}</code></span></td><td class="num">${sourcedHtml(formatValue(p), id)}</td><td><span class="badge badge-${p.confidence}">${confidenceLabel(p.confidence)}</span></td><td class="small">${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.source)}</a>` : escapeHtml(p.source)}</td><td class="small">${escapeHtml(p.asOf)}</td></tr>`,
    )
    .join('')}</tbody></table>`;
  secEl.append(h, wrap);
}

// Sources list: unique source+url pairs from primary and derived parameters.
const seen = new Map<string, string>();
for (const p of Object.values(PARAMS)) {
  if (p.url && !seen.has(p.url)) seen.set(p.url, p.source);
}
document.getElementById('sources-list')!.innerHTML = [...seen.entries()]
  .map(([url, src]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(src)}</a></li>`)
  .join('');

function fmt(id: string): string {
  return formatValue(PARAMS[id]);
}
function pct(id: string): string {
  return `${Math.round(PARAMS[id].value * 100)}%`;
}
function effRow(label: string, id: string): string {
  const p = PARAMS[id];
  const range = p.range ? `${p.range[0]} – ${p.range[1]}` : '—';
  return `<tr><td>${escapeHtml(label)}</td><td class="num">${sourcedHtml(String(p.value), id)}</td><td>${range} <span class="badge badge-assumption">Assumption</span></td></tr>`;
}

/** Tiny markdown subset: paragraphs, numbered list items, **bold**, *em*, `code`. */
function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;
  let buf: string[] = [];
  const flush = () => {
    if (!buf.length) return;
    const text = inline(buf.join(' '));
    out.push(inList ? `<li>${text}</li>` : `<p>${text}</p>`);
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^##\s/.test(line)) {
      flush();
      if (inList) { out.push('</ol>'); inList = false; }
      continue; // section heading already rendered by the page
    }
    const m = /^(\d+)\.\s+(.*)$/.exec(line);
    if (m) {
      flush();
      if (!inList) { out.push('<ol>'); inList = true; }
      buf.push(m[2]);
      continue;
    }
    if (line === '') {
      flush();
      continue;
    }
    buf.push(line.trim());
  }
  flush();
  if (inList) out.push('</ol>');
  return out.join('\n');
}
function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
