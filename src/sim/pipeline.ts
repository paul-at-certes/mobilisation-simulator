/**
 * pipeline.ts — training-estate arithmetic (spec §5).
 *
 * Annual capacity, monthly intake cap, the spare intake left for conscripts
 * after regular recruiting, course length by syllabus and the attrition rate
 * a cohort suffers. Pure functions of state; nothing here mutates.
 */
import type { GameState, MedicalStandard, Syllabus } from '../types.js';
import { P } from './params.js';

export function purchasedCapacityActive(s: GameState): number {
  return s.capacityPurchaseMonths.filter((m) => m <= s.turn).length;
}

export function civilianInstructorsActive(s: GameState): boolean {
  return s.civilianInstructors && s.civilianInstructorsMonth != null && s.civilianInstructorsMonth <= s.turn;
}

export function equipmentArrived(s: GameState): boolean {
  return s.equipmentArrivalMonth != null && s.equipmentArrivalMonth <= s.turn;
}

/** Graduates per year the estate can produce. */
export function annualCapacity(s: GameState): number {
  const base =
    P.regular_gains_annual +
    purchasedCapacityActive(s) * P.capacity_purchase_annual +
    (civilianInstructorsActive(s) ? P.civilian_instructor_capacity_annual : 0);
  const syllabusMult = s.syllabus === 'compressed' ? P.syllabus_throughput_multiplier : 1;
  return base * syllabusMult * s.capacityMultiplier;
}

export function monthlyCapacity(s: GameState): number {
  return annualCapacity(s) / 12;
}

/** Attrition suffered by a regular recruit on the standard course. */
export function regularAttrition(): number {
  return P.training_attrition;
}

/** Entrants per month the estate can take. */
export function monthlyIntakeCap(s: GameState): number {
  return monthlyCapacity(s) / (1 - regularAttrition());
}

export function regularMonthlyIntake(): number {
  return P.regular_untrained_intake_annual / 12;
}

/** Monthly entrants left over for conscripts after regular recruiting. */
export function spareIntake(s: GameState): number {
  return Math.max(0, monthlyIntakeCap(s) - regularMonthlyIntake());
}

/** Course length in months for a syllabus: round(weeks × 12 / 52). */
export function courseMonths(syllabus: Syllabus): number {
  const weeks =
    syllabus === 'compressed'
      ? P.phase1_weeks_compressed + P.phase2_weeks_compressed
      : P.phase1_weeks + P.phase2_weeks;
  return Math.max(1, Math.round((weeks * 12) / 52));
}

export function medicalAttritionAdd(medical: MedicalStandard): number {
  if (medical === 'relaxed') return P.attrition_relaxed_medical_add;
  if (medical === 'wartime') return P.attrition_wartime_medical_add;
  return 0;
}

/** Attrition rate for a conscript cohort. */
export function cohortAttrition(syllabus: Syllabus, medical: MedicalStandard): number {
  const a =
    P.training_attrition + (syllabus === 'compressed' ? P.attrition_compressed_add : 0) + medicalAttritionAdd(medical);
  return Math.min(1, Math.max(0, a));
}
