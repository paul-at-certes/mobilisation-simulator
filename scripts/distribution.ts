/**
 * scripts/distribution.ts — outcome distributions across many seeds.
 *
 *   npm run dist                    # 40 seeds, all three difficulties
 *   npm run dist -- 100 division    # 100 seeds, Division only
 *
 * `npm run sim -- --all` reports one seed, which is enough to see a mechanic
 * fire and not enough to balance against: at Division the spread between the
 * 10th and 90th percentile is around 2,000 effective soldiers, which is most
 * of the margin the difficulty is tuned to. This runs every scripted strategy
 * over N seeds and prints percentiles, the share of runs that met the target
 * and the share that ended in resignation.
 *
 * The benchmark table in docs/design-review.md is this command's output. When
 * a change moves those numbers, update that table in the same commit.
 *
 * Same loader shim as scripts/sim.ts: Node needs explicit extensions, the
 * sources import `./x.js` by TypeScript convention.
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
const { STRATEGIES, STRATEGY_IDS } = await import('../src/sim/strategies.js');
const { setEvents, setVerdicts } = await import('../src/sim/content.js');
type Difficulty = import('../src/types.js').Difficulty;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
setEvents(JSON.parse(readFileSync(resolve(root, 'src/data/events.json'), 'utf8')));
setVerdicts(JSON.parse(readFileSync(resolve(root, 'src/data/verdicts.json'), 'utf8')));

const ALL: Difficulty[] = ['brigade', 'division', 'corps'];
const args = process.argv.slice(2);
const seeds = Number(args.find((a) => /^\d+$/.test(a)) ?? 40);
const only = args.find((a) => (ALL as string[]).includes(a)) as Difficulty | undefined;

/** Guard against a strategy that never ends the game; no difficulty runs past 24 months. */
const MAX_MONTHS = 60;

for (const difficulty of only ? [only] : ALL) {
  const target = newGame(1, difficulty).target;
  console.log(`\n## ${difficulty} — target ${target.toLocaleString('en-GB')}, ${seeds} seeds`);
  console.log('strategy                        p10  median     p90     max    met%  resign%  lead(med)');
  for (const id of STRATEGY_IDS) {
    const ese: number[] = [];
    const lead: number[] = [];
    let resigned = 0;
    let met = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      let s = newGame(seed, difficulty);
      let guard = 0;
      while (!s.over && guard++ < MAX_MONTHS) s = step(s, STRATEGIES[id](s));
      ese.push(s.gauges.forceReady);
      lead.push(s.gauges.leadershipFactor);
      if (s.overReason === 'resigned') resigned += 1;
      if (s.gauges.forceReady >= target) met += 1;
    }
    ese.sort((a, b) => a - b);
    lead.sort((a, b) => a - b);
    const at = (p: number) => ese[Math.min(ese.length - 1, Math.floor(p * ese.length))];
    const col = (n: number) => String(Math.round(n)).padStart(8);
    const pct = (n: number) => String(Math.round((100 * n) / seeds)).padStart(7);
    console.log(
      id.padEnd(28) + col(at(0.1)) + col(at(0.5)) + col(at(0.9)) + col(ese[ese.length - 1])
      + pct(met) + pct(resigned) + lead[Math.floor(seeds / 2)].toFixed(2).padStart(10),
    );
  }
}
