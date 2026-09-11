/**
 * Entry point: routing between opening → turn loop → scoring.
 * State is kept in memory and mirrored to localStorage so a reload does not
 * lose a run. `?seed=&difficulty=` starts a fresh, replayable run.
 */
import './styles.css';
import type { Difficulty, GameEvent, GameState, TurnInput } from './types';
import { newGame, step } from './sim/step';
import { availableActions } from './sim/actions';
import { score as scoreGame } from './sim/score';
import { briefingText } from './ui/briefing';
import eventsFile from './data/events.json' with { type: 'json' };
import verdictsFile from './data/verdicts.json' with { type: 'json' };
import { setEvents, setVerdicts } from './sim/content';
import { initSourcedPopover } from './ui/components/sourced';
import { renderOpening } from './ui/screens/opening';
import { renderTurn } from './ui/screens/turn';
import { renderScoring } from './ui/screens/scoring';
import { clear } from './ui/dom';
import { STRATEGIES, type StrategyId } from './sim/strategies';

const EVENTS = eventsFile as GameEvent[];
setEvents(EVENTS);
setVerdicts(verdictsFile);
const STORAGE_KEY = 'mobilisation-minister:run';
const DIFFICULTIES: Difficulty[] = ['brigade', 'division', 'corps'];

const app = document.getElementById('app')!;
initSourcedPopover();

let state: GameState | null = null;

function siteUrl(): string {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  return u.toString().replace(/index\.html$/, '');
}

function save(): void {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode; ignore */
  }
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s && s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1e9) + 1;
}

function show(el: HTMLElement): void {
  clear(app);
  app.append(el);
  // The turn screen carries a fixed footer; the page has to end above it.
  document.body.classList.toggle('has-turnfoot', el.classList.contains('turn-screen'));
  window.scrollTo({ top: 0 });
  const heading = el.querySelector<HTMLElement>('h1, .turnbar');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: true });
}

function start(difficulty: Difficulty, seed: number): void {
  state = newGame(seed, difficulty);
  const u = new URL(window.location.href);
  u.searchParams.set('seed', String(seed));
  u.searchParams.set('difficulty', difficulty);
  history.replaceState(null, '', u.toString());
  save();
  renderCurrent();
}

function restart(): void {
  if (state && !state.over && !confirm('Abandon this run and start again?')) return;
  state = null;
  save();
  const u = new URL(window.location.href);
  u.search = '';
  history.replaceState(null, '', u.toString());
  renderCurrent();
}

function renderCurrent(): void {
  if (!state) {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('difficulty') as Difficulty | null;
    const seedParam = Number(params.get('seed'));
    show(
      renderOpening({
        defaultDifficulty: d && DIFFICULTIES.includes(d) ? d : 'division',
        seed: seedParam > 0 ? Math.floor(seedParam) : randomSeed(),
        onStart: start,
      }),
    );
    return;
  }
  if (state.over) {
    show(renderScoring({ state, score: scoreGame(state), siteUrl: siteUrl(), onRestart: restart }));
    return;
  }
  const s = state;
  const event = s.pendingEvent ? (EVENTS.find((e) => e.id === s.pendingEvent) ?? null) : null;
  show(
    renderTurn({
      state: s,
      availability: availableActions(s),
      event,
      briefing: briefingText(s, s.briefing),
      onEndTurn: (input: TurnInput) => {
        state = step(s, input);
        save();
        renderCurrent();
      },
      onRestart: restart,
    }),
  );
}

// Boot: a URL with seed+difficulty and no saved run starts fresh; otherwise resume.
(function boot() {
  const params = new URLSearchParams(window.location.search);
  const saved = load();
  const seed = Number(params.get('seed'));
  const d = params.get('difficulty') as Difficulty | null;
  if (saved && (!seed || (saved.seed === seed && saved.difficulty === d))) {
    state = saved;
  } else if (seed > 0 && d && DIFFICULTIES.includes(d)) {
    state = newGame(Math.floor(seed), d);
    // ?auto=<strategy> plays a scripted strategy to the end (for review and share-card checks).
    const auto = params.get('auto') as StrategyId | null;
    if (auto && auto in STRATEGIES) {
      let guard = 0;
      while (!state.over && guard++ < 60) state = step(state, STRATEGIES[auto](state));
    }
    save();
  }
  renderCurrent();
})();
