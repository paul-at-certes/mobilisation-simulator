/**
 * legislation.ts — the National Service Bill clock and the eligible pool
 * (spec §4).
 */
import type { BillClauses, GameState } from '../types.js';
import { P, ewPopulation, ewPopulationFemale, exemptionShare, medicalPassRate } from './params.js';
import { effectiveWillingness } from './politics.js';

/** Size of the eligible pool for a set of clauses, before any call-ups. */
export function eligiblePoolSize(clauses: BillClauses, multiplier = 1): number {
  const persons = ewPopulation(clauses.ageBand);
  const females = ewPopulationFemale(clauses.ageBand);
  const base = clauses.includeWomen ? persons : persons - females;
  return (
    base *
    P.uk_population_scaling *
    (1 - exemptionShare(clauses.exemptions)) *
    medicalPassRate(clauses.medical) *
    multiplier
  );
}

/** Set `conscriptEligible` from the current clauses, net of conscripts already called. */
export function recomputeEligible(s: GameState): void {
  const eligible = eligiblePoolSize(s.clauses, s.eligiblePoolMultiplier);
  s.pools.conscriptEligible = Math.max(0, eligible - s.conscriptsCalledTotal);
}

/** Advance the bill clock for the current turn; returns true if it passed this month. */
export function advanceBillClock(s: GameState): boolean {
  if (s.billStatus === 'in_progress' && s.billPassesMonth != null && s.turn >= s.billPassesMonth) {
    s.billStatus = 'passed';
    recomputeEligible(s);
    return true;
  }
  return false;
}

export function billMonths(procedure: 'emergency' | 'normal'): number {
  return procedure === 'emergency' ? P.bill_months_emergency : P.bill_months_normal;
}

/**
 * Share of a conscript intake who strongly oppose being conscripted, read off
 * public willingness (spec §10a).
 *
 * The relationship is fitted to YouGov's four age groups and is good there
 * (R² = 0.994), but the game's willingness runs well below the range the poll
 * observed, so this is an extrapolation — see the parameters' notes.
 */
export function strongOpposition(s: GameState): number {
  const raw = P.refusal_strong_opposition_intercept + P.refusal_strong_opposition_slope * effectiveWillingness(s);
  return Math.min(100, Math.max(0, raw));
}

/**
 * Share of those called up who do not report.
 *
 * This is the reason willingness exists. Before it, the only thing willingness
 * did anywhere in the model was trigger a political-capital penalty below a
 * threshold — it was political capital with extra steps (design review F6).
 * It now decides how many of the people you call actually arrive, which puts
 * it upstream of the training pipeline instead of downstream of nothing.
 *
 * Note where it bites: a minister calling up exactly the spare training intake
 * loses the refusers outright, while one calling up over capacity loses them
 * out of a surplus that was going to sit in the holding pool anyway. Calling
 * over capacity is insurance against refusal, and that is a real strategy
 * rather than an oversight.
 */
export function refusalRate(s: GameState): number {
  return (strongOpposition(s) / 100) * P.conscription_refusal_conversion;
}
