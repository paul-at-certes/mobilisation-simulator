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

/**
 * Junior leaders that can be taken out of regular units, after diversions and
 * events. This is the supply the training estate draws instructors from, and
 * `actions.ts` tests a capacity purchase against it.
 *
 * A cadre course running at the battle school is drawing on the same supply,
 * so it competes with a capacity purchase for the same corporals — which is
 * the honest arithmetic and not a penalty invented for the mechanic.
 */
export function leadersSpareable(s: GameState): number {
  return (
    leadersTotal(s) * P.junior_leaders_spareable_fraction
    - s.ledger.juniorLeadersDiverted
    + s.leadersSpareableAdjust
    - promotionInstructors(s)
  );
}

/** Cadre courses whose graduates are now leading. */
export function promotionCoursesCompleted(s: GameState): number {
  return (s.promotionCourseMonths ?? []).filter((m) => m <= s.turn).length;
}

/** Cadre courses still running, whose instructors are out of the line. */
export function promotionCoursesRunning(s: GameState): number {
  return (s.promotionCourseMonths ?? []).filter((m) => m > s.turn).length;
}

/**
 * Junior leaders made by accelerated promotion, discounted for the years in
 * rank they have not served.
 *
 * They are counted the way recalled ex-regulars are — a class of leader the
 * model already discounts — rather than added to the substantive cadre, so a
 * minister who promotes their way to a full establishment still commands a
 * worse one. Historically this is war-substantive and acting rank.
 */
export function leadersPromoted(s: GameState): number {
  return promotionCoursesCompleted(s) * P.promotion_cadre_size * P.eff_promoted_leader;
}

/**
 * Junior leaders held at the battle school to run the courses, at the same
 * ratio the training estate uses. You cannot make section commanders without
 * taking your best section commanders out of the line to teach them, so the
 * lever costs leadership before it pays it.
 */
export function promotionInstructors(s: GameState): number {
  return promotionCoursesRunning(s) * (P.promotion_cadre_size / P.instructor_ratio);
}

/**
 * Everyone raised on top of the standing Army who has to be given a chain of
 * command: recalled ex-regulars, traced Strategic Reservists and conscripts.
 *
 * Mobilised volunteer reservists are not here. The Army Reserve's trained
 * strength is counted in formed sub-units and contains its own corporals,
 * sergeants and subalterns, so it arrives led. The other three arrive as
 * individuals.
 */
export function ledPersonnel(s: GameState): number {
  return (
    s.pools.exRegularReported
    + s.pools.strategicTraced
    + s.pools.conscriptInTraining
    + conscriptsTrained(s.pools)
  );
}

/** Leaders the raised force needs at the Army's own ratio of 1 : junior_leader_ratio. */
export function leadersNeeded(s: GameState): number {
  return ledPersonnel(s) / P.junior_leader_ratio;
}

/**
 * The junior leaders inside the recalled ex-regular pool. A recall of former
 * regulars returns corporals and sergeants in the same proportion the Army
 * holds them, discounted for the same rust that discounts their soldiering.
 */
export function leadersRecalled(s: GameState): number {
  return (s.pools.exRegularReported / P.junior_leader_ratio) * P.eff_ex_regular;
}

/**
 * Leaders available to lead the raised force: the spareable cadre, what the
 * recall returned, and what accelerated promotion has made.
 */
export function leadersAvailable(s: GameState): number {
  return leadersSpareable(s) + leadersRecalled(s) + leadersPromoted(s);
}

export function leadershipFactor(s: GameState): number {
  const needed = leadersNeeded(s);
  if (needed <= 0) return 1;
  return clamp01(leadersAvailable(s) / needed);
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
  // The leadership factor applies to everyone counted in `ledPersonnel`: a
  // recalled ex-regular without a section commander is worth no more than a
  // conscript without one. Regulars are already led; volunteer reservists
  // bring their own cadre.
  const exRegulars = { headcount: s.pools.exRegularReported, ese: s.pools.exRegularReported * P.eff_ex_regular * lf };
  const strategic = { headcount: s.pools.strategicTraced, ese: s.pools.strategicTraced * P.eff_strategic * lf };
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
