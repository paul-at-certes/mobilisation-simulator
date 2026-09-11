/**
 * money.ts — the month's Treasury cost breakdown and GDP output loss
 * (spec §8).
 *
 * Regular pay is recorded in the breakdown for information but excluded from
 * the incremental "Treasury cost" the player is judged on (see DECISIONS.md).
 */
import type { GameState, Ledger } from '../types.js';
import { P, gdpAgeMultiplier } from './params.js';
import { conscriptsServing, conscriptsTrained, reservistsReported } from './pools.js';
import { civilianInstructorsActive } from './pipeline.js';

export interface MonthlyOneOffs {
  /** Heads that became equipped this month (charged once each). */
  newlyEquipped: number;
  /** £ of capacity purchases made during this turn's action phase. */
  capacityCost: number;
  /** One-off £ charged by events this turn. */
  eventCost: number;
}

export type CostBreakdown = Ledger['costBreakdown'];

export function monthlyCostBreakdown(s: GameState, oneOffs: MonthlyOneOffs): CostBreakdown {
  const employerMult = P.pension_employer_multiplier;
  const regularPay = (s.pools.regularTrained * P.regular_pay_annual * employerMult) / 12;
  const conscriptHeads = s.pools.conscriptInTraining + s.pools.holdingPool + conscriptsTrained(s.pools);
  const conscriptPay = (conscriptHeads * P.conscript_pay_annual * employerMult) / 12;
  let conscriptTraining = 0;
  for (const c of s.trainingCohorts) {
    const months = Math.max(1, c.graduationMonth - c.startMonth);
    conscriptTraining += (c.size * P.training_cost_per_recruit) / months;
  }
  const reservistAnnual =
    P.regular_pay_annual * employerMult + P.reservist_award_annual + P.employer_assistance_daily * 365;
  const reservistPay = (reservistsReported(s.pools) * reservistAnnual) / 12;
  const equipment = oneOffs.newlyEquipped * P.equipment_cost_per_head;
  const capacity = oneOffs.capacityCost;
  const civilianInstructors = civilianInstructorsActive(s) ? P.civilian_instructor_cost_annual / 12 : 0;
  const other = oneOffs.eventCost;
  return { regularPay, conscriptPay, conscriptTraining, reservistPay, equipment, capacity, civilianInstructors, other };
}

/** Incremental cost: everything except the regular Army's standing pay bill. */
export function incrementalCost(b: CostBreakdown): number {
  return b.conscriptPay + b.conscriptTraining + b.reservistPay + b.equipment + b.capacity + b.civilianInstructors + b.other;
}

/** GDP output lost this month from people removed from the civilian economy. */
export function monthlyGdpLoss(s: GameState): number {
  const conscripts = conscriptsServing(s.pools) * gdpAgeMultiplier(s.clauses.ageBand);
  const reservists = reservistsReported(s.pools);
  return ((conscripts + reservists) * P.output_per_worker_labour_share) / 12;
}
