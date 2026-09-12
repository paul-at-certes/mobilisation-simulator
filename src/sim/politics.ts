/**
 * politics.ts — monthly political-capital arithmetic (spec §9).
 *
 * `monthlyPcChanges` returns the list of reasons with deltas for the month
 * (baseline drain, the Treasury's cost penalty, the delivery credit, refusal
 * cases, and the penalty for a minister who has pulled no levers for months).
 * Action and event deltas are applied when they happen and merely listed
 * alongside.
 *
 * Cumulative output loss is reported on the scoring screen and charged
 * nowhere: the game never removes enough people from the workforce for a
 * penalty on a share of annual GDP to be in reach. See docs/design-review.md
 * F13, and §8 of the spec.
 */
import type { GameState } from '../types.js';
import { P, conscriptionWillingnessAdj } from './params.js';

export interface PcReason {
  label: string;
  delta: number;
}

/**
 * Willingness including the Bill's age band and any active boosts.
 *
 * The band matters because the people a Bill conscripts are the people who
 * object to it: YouGov puts support at 27% among 18-24s and 63% among the
 * over-65s, so widening the band dilutes the opposition (spec §10a). Boosts
 * with `until < turn` have expired and are ignored.
 */
export function effectiveWillingness(s: GameState): number {
  let w = s.willingness + conscriptionWillingnessAdj(s.clauses.ageBand);
  for (const b of s.willingnessBoosts) if (b.until >= s.turn) w += b.delta;
  return w;
}

/**
 * The cumulative cost the mobilisation may run up before the Treasury starts
 * charging.
 *
 * It is an allowance sized to the campaign, not a fixed sum: the Treasury votes
 * a budget for an operation, and a longer operation is voted a bigger one. Four
 * months buys GBP 0.6bn, twelve GBP 1.8bn, twenty-four GBP 3.6bn. A flat
 * threshold could not do this job, because it is charged every month on a total
 * that only grows: any threshold low enough to bite inside a Division run was
 * an order of magnitude heavier across a Corps one (design review F13).
 */
export function costPenaltyThreshold(s: GameState): number {
  const allowance = P.cost_pc_allowance_per_month * s.deadlineMonths;
  return allowance * (s.spendingRaised ? P.raise_spending_threshold_multiplier : 1);
}

export function costPenaltySteps(s: GameState): number {
  return Math.floor(chargeableCost(s) / costPenaltyThreshold(s));
}

/**
 * Cumulative cost the Treasury actually counts. Spending the Equipment Plan's
 * contingency on the mobilisation takes that much off the bill — which is the
 * whole benefit, and it is a one-off (spec §8a).
 */
export function chargeableCost(s: GameState): number {
  const absorbed = s.contingencyDrawn ? P.equipment_plan_contingency : 0;
  return Math.max(0, s.ledger.cumulativeCost - absorbed);
}

/**
 * Political capital charged per step of cumulative cost. Once the contingency
 * is gone there is nothing left to absorb an overrun, so every step costs more:
 * the draw buys headroom now and a steeper slope afterwards.
 */
export function costPenaltyPerStep(s: GameState): number {
  return P.cost_pc_penalty_per_step + (s.contingencyDrawn ? P.contingency_drawn_penalty_add : 0);
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
 * The refusal caseload, settled once a month.
 *
 * Conscripts who are called up and do not report go into a backlog; the courts
 * work through it, and every `pc_refusal_per_charge` cases cost one political
 * capital, capped at `pc_refusal_max` a month. What is left over stays in the
 * backlog and is charged later, so **no refusal is ever free** and the total
 * charged across a run is the total who refused divided by the rate — not a
 * monthly rounding that a small programme can sit underneath.
 *
 * That carry-over is the whole point, and it is what the first attempt at this
 * got wrong. An address to the nation moves the refusal rate by about a tenth.
 * Rounded off month by month, a tenth of a small number is nothing, and the
 * lever the change exists to make meaningful would have moved nothing at all —
 * the same insensitivity as the threshold it replaced (design review F15),
 * wearing different clothes. Accumulated, a tenth fewer refusals is a tenth
 * fewer points, exactly.
 *
 * It replaced a flat charge levied whenever willingness sat below a threshold —
 * a switch that the Bill's age band, and nothing else in the game, reliably
 * flipped. The cap is here because the charge is proportional and the call-up
 * is not bounded: a minister calling up several times the training estate's
 * spare intake would otherwise resign on the arithmetic rather than on a
 * decision. It also means a backlog can outlive the call-up that created it,
 * which is what a court list does.
 *
 * Mutates `s.refusalCaseload`, so it is called exactly once a month, from
 * `step`. `monthlyPcChanges` stays pure and is handed the result.
 */
export function settleRefusalCases(s: GameState, refused: number): number {
  const backlog = (Number.isFinite(s.refusalCaseload) ? s.refusalCaseload : 0) + Math.max(0, refused);
  const charged = Math.min(P.pc_refusal_max, Math.floor(backlog / P.pc_refusal_per_charge));
  s.refusalCaseload = backlog - charged * P.pc_refusal_per_charge;
  return charged;
}

/** What the month's refusal cases cost, and how many people they were. */
export interface RefusalCases {
  /** Called up this month and did not report. */
  people: number;
  /** Political capital charged, from `settleRefusalCases`. */
  points: number;
}

/**
 * The month's automatic PC movements. `delivered` is the headcount that reached
 * units this month (graduations plus arrivals); `refusals` is what the month's
 * refusal caseload cost, already settled by `settleRefusalCases`.
 */
export function monthlyPcChanges(s: GameState, delivered: number, refusals: RefusalCases = { people: 0, points: 0 }): PcReason[] {
  const reasons: PcReason[] = [];
  reasons.push({ label: 'The crisis grinds on', delta: -P.pc_baseline_drain });
  const costSteps = costPenaltySteps(s);
  if (costSteps > 0) {
    const label = s.contingencyDrawn
      ? 'Treasury pressure over cumulative cost, with no contingency left to absorb it'
      : 'Treasury pressure over cumulative cost';
    reasons.push({ label, delta: -costPenaltyPerStep(s) * costSteps });
  }
  const credit = deliveryCredit(delivered);
  if (credit > 0) {
    reasons.push({ label: `Soldiers reaching their units (${Math.round(delivered).toLocaleString('en-GB')})`, delta: credit });
  }
  if (refusals.points > 0) {
    const backlog = Math.floor(s.refusalCaseload ?? 0);
    const seen = refusals.people > 0
      ? `${Math.round(refusals.people).toLocaleString('en-GB')} refused`
      : `${backlog.toLocaleString('en-GB')} still on the list`;
    reasons.push({ label: `Refusal cases in the courts (${seen})`, delta: -refusals.points });
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
