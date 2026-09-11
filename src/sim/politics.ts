/**
 * politics.ts — monthly political-capital arithmetic (spec §9).
 *
 * `monthlyPcChanges` returns the list of reasons with deltas for the month
 * (baseline drain, cost and GDP penalties, the delivery credit, refusal cases,
 * and the penalty for a minister who has pulled no levers for months). Action
 * and event deltas are applied when they happen and merely listed alongside.
 */
import type { GameState } from '../types.js';
import { P } from './params.js';

export interface PcReason {
  label: string;
  delta: number;
}

/** Willingness including any active boosts (boosts with until < turn are ignored). */
export function effectiveWillingness(s: GameState): number {
  let w = s.willingness;
  for (const b of s.willingnessBoosts) if (b.until >= s.turn) w += b.delta;
  return w;
}

export function costPenaltySteps(s: GameState): number {
  const threshold = P.cost_pc_penalty_threshold * (s.spendingRaised ? P.raise_spending_threshold_multiplier : 1);
  return Math.floor(s.ledger.cumulativeCost / threshold);
}

export function gdpPenaltySteps(s: GameState): number {
  const pct = (s.ledger.cumulativeGdpLoss / P.uk_gdp_2025) * 100;
  return Math.floor(pct / P.gdp_pc_penalty_step_pct);
}

/**
 * Political capital earned for the month's delivery: one point per
 * `pc_delivery_per_credit` soldiers who actually reached their units, capped
 * at `pc_delivery_max`.
 *
 * Two properties are deliberate. It counts **headcount, not effectiveness**:
 * the credit is what a minister can announce, and the gap between what can be
 * announced and what can fight is the whole subject of the game. And it counts
 * only people the minister moved — reservists mobilised, ex-regulars and the
 * Strategic Reserve reporting, conscripts graduating — never the regular
 * pipeline's own monthly gain, which arrives whatever the minister does and
 * would be an idle income.
 */
export function deliveryCredit(delivered: number): number {
  if (!(delivered > 0)) return 0;
  return Math.min(P.pc_delivery_max, Math.floor(delivered / P.pc_delivery_per_credit));
}

/**
 * The month's automatic PC movements. `delivered` is the headcount that
 * reached units this month (graduations plus arrivals).
 */
export function monthlyPcChanges(s: GameState, delivered: number): PcReason[] {
  const reasons: PcReason[] = [];
  reasons.push({ label: 'The crisis grinds on', delta: -P.pc_baseline_drain });
  const costSteps = costPenaltySteps(s);
  if (costSteps > 0) reasons.push({ label: 'Treasury pressure over cumulative cost', delta: -P.cost_pc_penalty_per_step * costSteps });
  const gdpSteps = gdpPenaltySteps(s);
  if (gdpSteps > 0) reasons.push({ label: 'Economic damage from lost output', delta: -P.gdp_pc_penalty_per_step * gdpSteps });
  const credit = deliveryCredit(delivered);
  if (credit > 0) {
    reasons.push({ label: `Soldiers reaching their units (${Math.round(delivered).toLocaleString('en-GB')})`, delta: credit });
  }
  if (s.conscriptionEverActive && effectiveWillingness(s) < P.willingness_low_threshold_pct) {
    reasons.push({ label: 'Refusal cases in the courts', delta: -P.pc_low_willingness_penalty });
  }
  if (idleMonths(s) > P.pc_idle_grace_months) {
    reasons.push({ label: `A government seen to be doing nothing (${idleMonths(s)} months)`, delta: -P.pc_idle_penalty });
  }
  return reasons.filter((r) => r.delta !== 0);
}

/**
 * Consecutive months in which no action was taken. Read through a helper so
 * that a saved game from before the field existed counts as active rather
 * than as NaN.
 */
export function idleMonths(s: GameState): number {
  return Number.isFinite(s.idleMonths) ? s.idleMonths : 0;
}

/** Drop boosts that have expired at this turn. */
export function expireWillingnessBoosts(s: GameState): void {
  s.willingnessBoosts = s.willingnessBoosts.filter((b) => b.until >= s.turn);
}
