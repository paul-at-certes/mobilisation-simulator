/**
 * rng.ts — deterministic pseudo-random numbers (mulberry32).
 *
 * The generator state is a 32-bit unsigned integer that lives inside
 * GameState, so every draw is replayable from the seed. All functions are
 * pure: they take a state and return the value together with the next state.
 */

const TWO_32 = 4294967296;

/** Normalise any number to a valid uint32 state. */
export function normaliseSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  return Math.floor(Math.abs(seed)) % TWO_32 >>> 0;
}

/** One mulberry32 step: a float in [0, 1) and the new state. */
export function next(state: number): { value: number; state: number } {
  const a = (normaliseSeed(state) + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / TWO_32;
  return { value, state: a };
}

/** Uniform float in [lo, hi). One draw. */
export function uniform(state: number, lo: number, hi: number): { value: number; state: number } {
  const r = next(state);
  return { value: lo + (hi - lo) * r.value, state: r.state };
}

/**
 * Weighted pick. One draw. Returns the chosen index, or -1 if the weights are
 * empty or sum to nothing (the draw is still consumed to keep the sequence
 * stable).
 */
export function pickWeighted(state: number, weights: readonly number[]): { index: number; state: number } {
  const r = next(state);
  let total = 0;
  for (const w of weights) total += Math.max(0, w) || 0;
  if (total <= 0) return { index: -1, state: r.state };
  let acc = 0;
  const x = r.value * total;
  for (let i = 0; i < weights.length; i++) {
    acc += Math.max(0, weights[i]) || 0;
    if (x < acc) return { index: i, state: r.state };
  }
  return { index: weights.length - 1, state: r.state };
}

/**
 * Turn a seed string into a uint32. Decimal strings map to their value;
 * anything else is hashed (FNV-1a) so `?seed=churchill` is stable.
 */
export function seedFromString(s: string | number): number {
  if (typeof s === 'number') return normaliseSeed(s);
  const trimmed = s.trim();
  if (/^\d+$/.test(trimmed)) return normaliseSeed(Number(trimmed));
  let h = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
