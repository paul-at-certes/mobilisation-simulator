/**
 * effectiveness.ts — bucket effectiveness, leadership factor, ESE (Force
 * Ready), composition and Force Quality (spec §7).
 *
 * Pure: `computeForce(state)` reads state and returns the numbers; `derive`
 * in step.ts copies them into gauges/composition.
 */
import type { Composition, GameState, TrainedCohort } from '../types.js';
import { P } from './params.js';
import { conscriptsServing, conscriptsTrained } from './pools.js';

export interface ForceSummary {
  forceReady: number;
  headcountCounted: number;
  forceQuality: number;
  leadershipFactor: number;
  composition: Composition;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Junior leaders still in the Army (start cadre minus those lost to outflow). */
export function leadersTotal(s: GameState): number {
  return P.junior_leaders - s.ledger.juniorLeadersLostToOutflow;
}

/** Junior leaders that can be taken out of units, after diversions and events. */
export function leadersSpareable(s: GameState): number {
  return leadersTotal(s) * P.junior_leaders_spareable_fraction - s.ledger.juniorLeadersDiverted + s.leadersSpareableAdjust;
}

/** Leaders the conscript force needs at 1 : junior_leader_ratio. */
export function leadersNeeded(s: GameState): number {
  const conscripts = s.pools.conscriptInTraining + conscriptsTrained(s.pools);
  return conscripts / P.junior_leader_ratio;
}

export function leadershipFactor(s: GameState): number {
  const needed = leadersNeeded(s);
  if (needed <= 0) return 1;
  return clamp01(leadersSpareable(s) / needed);
}

/** Effectiveness of one trained conscript cohort at the given turn. */
export function cohortEffectiveness(cohort: TrainedCohort, turn: number, lf: number): number {
  if (!cohort.equipped) return P.eff_conscript_unequipped * lf;
  const start = cohort.syllabus === 'compressed' ? P.eff_conscript_compressed_start : P.eff_conscript_normal_start;
  const cap = cohort.syllabus === 'compressed' ? P.eff_conscript_compressed_cap : P.eff_conscript_normal_cap;
  const months = Math.max(0, turn - cohort.graduationMonth);
  return Math.min(cap, start + P.eff_conscript_growth_monthly * months) * lf;
}

export function computeForce(s: GameState): ForceSummary {
  const lf = leadershipFactor(s);
  const regularsHead = s.pools.regularTrained * P.regular_deployable_fraction;
  const regulars = { headcount: regularsHead, ese: regularsHead * P.eff_regular };
  const reservists = {
    headcount: s.pools.reserveVolunteerMobilised,
    ese: s.pools.reserveVolunteerMobilised * P.eff_reserve_volunteer,
  };
  const exRegulars = { headcount: s.pools.exRegularReported, ese: s.pools.exRegularReported * P.eff_ex_regular };
  const strategic = { headcount: s.pools.strategicTraced, ese: s.pools.strategicTraced * P.eff_strategic };
  let conscriptEse = 0;
  let conscriptHead = 0;
  for (const c of s.trainedCohorts) {
    conscriptHead += c.size;
    conscriptEse += c.size * cohortEffectiveness(c, s.turn, lf);
  }
  const conscripts = { headcount: conscriptHead, ese: conscriptEse };
  const composition: Composition = { regulars, reservists, exRegulars, strategic, conscripts };
  const headcountCounted = regulars.headcount + reservists.headcount + exRegulars.headcount + strategic.headcount + conscripts.headcount;
  const forceReady = regulars.ese + reservists.ese + exRegulars.ese + strategic.ese + conscripts.ese;
  const forceQuality = headcountCounted > 0 ? forceReady / headcountCounted : 0;
  return { forceReady, headcountCounted, forceQuality, leadershipFactor: lf, composition };
}

/** Conscripts on the books, exported here for the briefing/GDP callers. */
export { conscriptsServing };
