/**
 * pools.ts — the headcount pools and the sums derived from them.
 *
 * Pools are floats in state; the UI rounds for display. Cohort-backed pools
 * (conscriptInTraining, conscriptTrainedUnequipped, conscriptTrainedEquipped,
 * reserveVolunteerPending) are always re-summed from their cohorts by
 * `syncDerivedPools` so the two views never drift apart.
 */
import type { GameState, PoolKey } from '../types.js';

export const POOL_KEYS: readonly PoolKey[] = [
  'regularTrained',
  'regularUntrained',
  'reserveVolunteerAvailable',
  'reserveVolunteerPending',
  'reserveVolunteerMobilised',
  'exRegularTracked',
  'exRegularReported',
  'strategicUntracked',
  'strategicTraced',
  'conscriptEligible',
  'conscriptCalled',
  'holdingPool',
  'conscriptInTraining',
  'conscriptTrainedUnequipped',
  'conscriptTrainedEquipped',
];

/** Pools whose value is the sum of a cohort/arrival list rather than a free number. */
export const COHORT_BACKED_POOLS: ReadonlySet<PoolKey> = new Set<PoolKey>([
  'reserveVolunteerPending',
  'conscriptInTraining',
  'conscriptTrainedUnequipped',
  'conscriptTrainedEquipped',
]);

export function emptyPools(): Record<PoolKey, number> {
  const pools = {} as Record<PoolKey, number>;
  for (const k of POOL_KEYS) pools[k] = 0;
  return pools;
}

/** Recompute the cohort-backed pools from the cohort lists. */
export function syncDerivedPools(s: GameState): void {
  s.pools.conscriptInTraining = s.trainingCohorts.reduce((a, c) => a + c.size, 0);
  s.pools.conscriptTrainedUnequipped = s.trainedCohorts.filter((c) => !c.equipped).reduce((a, c) => a + c.size, 0);
  s.pools.conscriptTrainedEquipped = s.trainedCohorts.filter((c) => c.equipped).reduce((a, c) => a + c.size, 0);
  s.pools.reserveVolunteerPending = s.reserveArrivals.reduce((a, r) => a + r.size, 0);
}

/** Conscripts on the books (called, holding, training, trained). */
export function conscriptsServing(pools: Record<PoolKey, number>): number {
  return (
    pools.conscriptCalled +
    pools.holdingPool +
    pools.conscriptInTraining +
    pools.conscriptTrainedUnequipped +
    pools.conscriptTrainedEquipped
  );
}

/** Conscripts who have graduated (equipped or not). */
export function conscriptsTrained(pools: Record<PoolKey, number>): number {
  return pools.conscriptTrainedUnequipped + pools.conscriptTrainedEquipped;
}

/** Reservists of every kind who have actually reported for duty. */
export function reservistsReported(pools: Record<PoolKey, number>): number {
  return pools.reserveVolunteerMobilised + pools.exRegularReported + pools.strategicTraced;
}
