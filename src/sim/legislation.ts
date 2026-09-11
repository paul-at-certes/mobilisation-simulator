/**
 * legislation.ts — the National Service Bill clock and the eligible pool
 * (spec §4).
 */
import type { BillClauses, GameState } from '../types.js';
import { P, ewPopulation, ewPopulationFemale, exemptionShare, medicalPassRate } from './params.js';

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
