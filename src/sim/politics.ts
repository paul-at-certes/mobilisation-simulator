/**
 * politics.ts — monthly political-capital arithmetic (spec §9).
 *
 * `monthlyPcChanges` returns the list of reasons with deltas for the month
 * (baseline drain, cost and GDP penalties, momentum, refusal cases). Action
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
 * The month's automatic PC movements. `forceReady` is the new ESE and
 * `previousForceReady` the ESE at the start of the step.
 */
export function monthlyPcChanges(s: GameState, forceReady: number, previousForceReady: number): PcReason[] {
  const reasons: PcReason[] = [];
  reasons.push({ label: 'The crisis grinds on', delta: -P.pc_baseline_drain });
  const costSteps = costPenaltySteps(s);
  if (costSteps > 0) reasons.push({ label: 'Treasury pressure over cumulative cost', delta: -P.cost_pc_penalty_per_step * costSteps });
  const gdpSteps = gdpPenaltySteps(s);
  if (gdpSteps > 0) reasons.push({ label: 'Economic damage from lost output', delta: -P.gdp_pc_penalty_per_step * gdpSteps });
  if (forceReady - previousForceReady >= P.pc_momentum_threshold * s.target) {
    reasons.push({ label: 'Visible momentum on Force Ready', delta: P.pc_momentum_bonus });
  }
  if (s.conscriptionEverActive && effectiveWillingness(s) < P.willingness_low_threshold_pct) {
    reasons.push({ label: 'Refusal cases in the courts', delta: -P.pc_low_willingness_penalty });
  }
  return reasons.filter((r) => r.delta !== 0);
}

/** Drop boosts that have expired at this turn. */
export function expireWillingnessBoosts(s: GameState): void {
  s.willingnessBoosts = s.willingnessBoosts.filter((b) => b.until >= s.turn);
}
