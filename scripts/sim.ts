/**
 * scripts/sim.ts — CLI balance runner (spec §13).
 *
 *   npm run sim -- --seed 42 --strategy reserves_only --difficulty division
 *   npm run sim -- --all [--seed 42]
 *
 * Runs under plain Node (`node --experimental-strip-types`). Node's loader
 * needs explicit file extensions, while the sources use the TypeScript
 * convention of importing `./x.js`; a small resolve hook maps those onto the
 * `.ts` files. Event and verdict content is read from src/data with fs and
 * injected into the sim's content registry (in the app, Vite does this).
 */
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^\.\.?\//.test(specifier) && specifier.endsWith('.js') && context.parentURL) {
      const ts = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(ts))) return nextResolve(ts.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { newGame, step } = await import('../src/sim/step.js');
const { score } = await import('../src/sim/score.js');
const { STRATEGIES, STRATEGY_IDS } = await import('../src/sim/strategies.js');
const { setEvents, setVerdicts, getEvents } = await import('../src/sim/content.js');
type Difficulty = import('../src/types.js').Difficulty;
type GameState = import('../src/types.js').GameState;
type StrategyId = import('../src/sim/strategies.js').StrategyId;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function loadJson(rel: string): unknown {
  const path = resolve(root, rel);
  if (!existsSync(path)) return [];
  try {
    const text = readFileSync(path, 'utf8').trim();
    return text ? JSON.parse(text) : [];
  } catch (err) {
    console.error(`warning: could not parse ${rel}: ${(err as Error).message}`);
    return [];
  }
}
setEvents(loadJson('src/data/events.json'));
setVerdicts(loadJson('src/data/verdicts.json'));

// --- args -------------------------------------------------------------------
const args = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
}
const DIFFICULTIES: Difficulty[] = ['brigade', 'division', 'corps'];
const seedArg = opt('seed', '42');
const strategyArg = opt('strategy', 'do_nothing') as StrategyId;
const difficultyArg = opt('difficulty', 'division') as Difficulty;
const runAll = args.includes('--all');

if (!runAll && !STRATEGY_IDS.includes(strategyArg)) {
  console.error(`Unknown strategy "${strategyArg}". Choose one of: ${STRATEGY_IDS.join(', ')}`);
  process.exit(2);
}
if (!runAll && !DIFFICULTIES.includes(difficultyArg)) {
  console.error(`Unknown difficulty "${difficultyArg}". Choose one of: ${DIFFICULTIES.join(', ')}`);
  process.exit(2);
}

// --- helpers ----------------------------------------------------------------
const bn = (gbp: number) => (gbp / 1e9).toFixed(2);
const k = (n: number) => Math.round(n).toLocaleString('en-GB');
const pad = (s: string | number, w: number) => String(s).padStart(w);

function run(seed: string, strategy: StrategyId, difficulty: Difficulty, verbose: boolean): GameState {
  let s = newGame(seed, difficulty);
  const rows: string[] = [];
  const header = [
    pad('turn', 4), pad('ESE', 8), pad('quality', 8), pad('leader', 7), pad('PC', 6), pad('holding', 9),
    pad('training', 9), pad('trained', 9), pad('cost£bn', 8), pad('GDP£bn', 8), '  event',
  ].join(' ');
  const row = (st: GameState) =>
    [
      pad(st.turn, 4), pad(k(st.gauges.forceReady), 8), pad(st.gauges.forceQuality.toFixed(2), 8),
      pad(st.gauges.leadershipFactor.toFixed(2), 7), pad(st.politicalCapital.toFixed(0), 6),
      pad(k(st.pools.holdingPool), 9), pad(k(st.pools.conscriptInTraining), 9),
      pad(k(st.pools.conscriptTrainedUnequipped + st.pools.conscriptTrainedEquipped), 9),
      pad(bn(st.ledger.cumulativeCost), 8), pad(bn(st.ledger.cumulativeGdpLoss), 8),
      '  ' + (st.pendingEvent ?? ''),
    ].join(' ');
  rows.push(row(s));
  let guard = 0;
  while (!s.over && guard++ < 1000) {
    s = step(s, STRATEGIES[strategy](s));
    rows.push(row(s));
  }
  if (verbose) {
    console.log(`\n# ${strategy} × ${difficulty}  (seed ${seed}, target ${k(s.target)}, deadline ${s.deadlineMonths} months, ${getEvents().length} events in deck)\n`);
    console.log(header);
    for (const r of rows) console.log(r);
    const sc = score(s);
    console.log(`\nResult: ${sc.met ? 'TARGET MET' : 'target missed'}${sc.resigned ? ' (resigned)' : ''} — over: ${s.overReason}`);
    console.log(`  ESE ${k(sc.ese)} / ${k(sc.target)} (shortfall ${k(sc.shortfall)}), headcount ${k(sc.headcount)}, quality ${sc.quality.toFixed(2)} (${sc.qualityBand}), leadership ${sc.leadership.toFixed(2)} (${sc.leadershipBand})`);
    console.log(`  cost £${bn(sc.cost)}bn (${sc.costPctDefenceBudget.toFixed(1)}% of defence budget), GDP loss £${bn(sc.gdpLoss)}bn (${sc.gdpLossPctGdp.toFixed(2)}% of GDP)`);
    const c = sc.composition;
    console.log(`  composition: regulars ${k(c.regulars.headcount)}/${k(c.regulars.ese)}, reservists ${k(c.reservists.headcount)}/${k(c.reservists.ese)}, ex-regulars ${k(c.exRegulars.headcount)}/${k(c.exRegulars.ese)}, strategic ${k(c.strategic.headcount)}/${k(c.strategic.ese)}, conscripts ${k(c.conscripts.headcount)}/${k(c.conscripts.ese)}`);
    console.log(`  verdict [${sc.verdictId}]: ${sc.verdictText}`);
    console.log(`  ${sc.seedUrl}`);
    if (s.eventLog.length) console.log(`  events: ${s.eventLog.map((e) => `${e.turn}:${e.eventId}${e.choice != null ? `[${e.choice}]` : ''}`).join(', ')}`);
  }
  return s;
}

if (runAll) {
  console.log(`# Summary matrix (seed ${seedArg}; ${getEvents().length} events in deck)\n`);
  const head = [pad('strategy', 28), pad('difficulty', 10), pad('met', 4), pad('over', 9), pad('turn', 4), pad('ESE', 8), pad('target', 7), pad('pct', 5), pad('qual', 5), pad('lead', 5), pad('PC', 5), pad('cost£bn', 8), pad('GDP£bn', 7), pad('holding', 8), pad('conscr', 8)].join(' ');
  console.log(head);
  for (const strategy of STRATEGY_IDS) {
    for (const difficulty of DIFFICULTIES) {
      const s = run(seedArg, strategy, difficulty, false);
      const sc = score(s);
      console.log(
        [
          pad(strategy, 28), pad(difficulty, 10), pad(sc.met ? 'yes' : 'no', 4), pad(s.overReason ?? '', 9), pad(s.turn, 4),
          pad(k(sc.ese), 8), pad(k(sc.target), 7), pad(((sc.ese / sc.target) * 100).toFixed(0) + '%', 5),
          pad(sc.quality.toFixed(2), 5), pad(sc.leadership.toFixed(2), 5), pad(s.politicalCapital.toFixed(0), 5),
          pad(bn(sc.cost), 8), pad(bn(sc.gdpLoss), 7), pad(k(s.pools.holdingPool), 8), pad(k(sc.composition.conscripts.headcount), 8),
        ].join(' '),
      );
    }
  }
} else {
  run(seedArg, strategyArg, difficultyArg, true);
}
