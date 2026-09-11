/**
 * content.ts — registry for the authored content the simulation consumes:
 * the event deck (src/data/events.json) and the verdict templates
 * (src/data/verdicts.json).
 *
 * Both files are authored separately and may be missing or empty at build
 * time, so they are loaded defensively. Under Vite (the app and vitest) they
 * are picked up automatically through `import.meta.glob`, which yields an
 * empty map when the file does not exist. Under plain Node (the CLI runner)
 * `import.meta.glob` is unavailable; the CLI reads the files with `fs` and
 * injects them through `setEvents` / `setVerdicts`.
 */
import type { GameEvent, Verdict } from '../types.js';

let events: GameEvent[] = [];
let verdicts: Verdict[] = [];

function coerceArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    // Accept { events: [...] } / { verdicts: [...] } wrappers as well.
    const obj = value as Record<string, unknown>;
    for (const key of ['events', 'verdicts', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function setEvents(list: unknown): void {
  events = coerceArray<GameEvent>(list).filter((e) => e && typeof e.id === 'string');
}

export function setVerdicts(list: unknown): void {
  verdicts = coerceArray<Verdict>(list).filter((v) => v && typeof v.id === 'string');
}

export function getEvents(): readonly GameEvent[] {
  return events;
}

export function getVerdicts(): readonly Verdict[] {
  return verdicts;
}

// Auto-load under Vite. `import.meta.glob` is a Vite compile-time feature; in
// Node it is simply undefined and the CLI injects content instead.
const meta = import.meta as unknown as { glob?: (pattern: string, opts: Record<string, unknown>) => Record<string, unknown> };
if (typeof meta.glob === 'function') {
  const found = meta.glob('../data/{events,verdicts}.json', { eager: true, import: 'default' });
  for (const [path, value] of Object.entries(found)) {
    if (path.endsWith('events.json')) setEvents(value);
    else if (path.endsWith('verdicts.json')) setVerdicts(value);
  }
}
