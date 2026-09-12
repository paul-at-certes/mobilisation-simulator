/**
 * Mobilisation Minister — shared types.
 *
 * This file is the contract between the simulation (src/sim), the content
 * (src/data/events.json, verdicts.json) and the UI (src/ui). Keep it free of
 * DOM references.
 */

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

export type Confidence = 'primary' | 'derived' | 'assumption';

export interface Parameter {
  value: number;
  unit: string; // 'people' | 'gbp' | 'months' | 'weeks' | 'ratio' | 'pct' | 'per_year' | 'days' | 'pc' | 'multiplier'
  label: string;
  description: string;
  section: string;
  source: string;
  url: string; // may be '' for assumptions
  asOf: string; // ISO date
  confidence: Confidence;
  range?: [number, number]; // plausible range, for assumptions
  rationale?: string; // one-line rationale, required for assumptions
  derivation?: string; // how a derived figure was computed
}

export interface ParameterFile {
  version: string;
  generated: string;
  sections: Record<string, string>;
  parameters: Record<string, Parameter>;
}

// ---------------------------------------------------------------------------
// Game configuration
// ---------------------------------------------------------------------------

export type Difficulty = 'brigade' | 'division' | 'corps';
export type AgeBand = '18-25' | '18-30' | '26-40' | '18-65';
export type MedicalStandard = 'peacetime' | 'relaxed' | 'wartime';
export type ExemptionRegime = 'strict' | 'broad' | 'minimal';
export type Syllabus = 'normal' | 'compressed';
export type BillProcedure = 'emergency' | 'normal';
export type ReserveNotice = 180 | 90;

export interface BillClauses {
  ageBand: AgeBand;
  includeWomen: boolean;
  medical: MedicalStandard;
  exemptions: ExemptionRegime;
}

// ---------------------------------------------------------------------------
// Actions (the levers)
// ---------------------------------------------------------------------------

export type ActionId =
  | 'call_out_reserve'
  | 'recall_ex_regular'
  | 'trace_strategic_reserve'
  | 'stop_loss'
  | 'draw_contingency'
  | 'introduce_bill'
  | 'amend_bill'
  | 'set_callup'
  | 'expand_capacity'
  | 'accelerate_promotion'
  | 'compress_syllabus'
  | 'contract_civilian_instructors'
  | 'junior_entry'
  | 'equipment_buy'
  | 'address_nation'
  | 'raise_spending'
  | 'blame_predecessors';

export type Action =
  | { id: 'call_out_reserve'; notice: ReserveNotice }
  | { id: 'recall_ex_regular' }
  | { id: 'trace_strategic_reserve' }
  | { id: 'stop_loss' }
  | { id: 'draw_contingency' }
  | { id: 'introduce_bill'; procedure: BillProcedure; clauses: BillClauses }
  | { id: 'amend_bill'; clauses: Partial<BillClauses> }
  /** Free control: does not consume an action slot. */
  | { id: 'set_callup'; perMonth: number }
  | { id: 'expand_capacity' }
  | { id: 'accelerate_promotion' }
  | { id: 'compress_syllabus' }
  | { id: 'contract_civilian_instructors' }
  | { id: 'junior_entry' }
  | { id: 'equipment_buy' }
  | { id: 'address_nation' }
  | { id: 'raise_spending' }
  | { id: 'blame_predecessors' };

/** Actions that do not consume one of the two per-turn slots. */
export const FREE_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>(['set_callup']);

export interface ActionAvailability {
  id: ActionId;
  available: boolean;
  /** Why it is unavailable, or a note (e.g. "already active"). */
  reason?: string;
  /** Political-capital cost shown to the player (negative = cost). */
  pcDelta: number;
  /** Whether the action has already been taken and is a one-shot. */
  exhausted?: boolean;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Keys that event triggers may test. The simulation computes all of these in
 * `conditionVars(state)`. Content authors must use only these keys.
 */
export type ConditionKey =
  | 'turn' // months elapsed (0 = Day 0 briefing turn)
  | 'turns_remaining' // deadline - turn
  | 'reserve_called_out' // 0/1
  | 'reserve_notice' // 180 | 90 | 0 (not called out)
  | 'reserve_mobilised' // headcount arrived
  | 'ex_regular_recall_active' // 0/1
  | 'ex_regular_reported' // headcount
  | 'strategic_traced' // 0/1 (trace attempted)
  | 'stop_loss' // 0/1
  | 'contingency_drawn' // 0/1
  | 'outflow_intent'
  | 'bill_status' // 0 none, 1 in progress, 2 passed
  | 'conscription_active' // 0/1 (bill passed and callup > 0 at least once)
  | 'medical_standard' // 0 peacetime, 1 relaxed, 2 wartime
  | 'exemptions' // 0 strict, 1 broad, 2 minimal
  | 'include_women' // 0/1
  | 'willingness' // pct
  | 'capacity_purchases' // count
  | 'civilian_instructors' // 0/1
  | 'syllabus_compressed' // 0/1
  | 'equipment_buy_active' // 0/1 (ordered)
  | 'equipment_arrived' // 0/1
  | 'holding_pool' // headcount
  | 'conscripts_in_training' // headcount
  | 'conscripts_trained' // headcount (equipped + unequipped)
  | 'cumulative_cost' // gbp
  | 'cumulative_gdp_loss' // gbp
  | 'political_capital'
  | 'force_ready' // ESE
  | 'force_ready_pct' // ESE / target * 100
  | 'force_quality'
  | 'leadership_factor'
  | 'address_count'
  | 'blame_count'
  | 'spending_raised' // 0/1
  | 'callup_cap' // the monthly ceiling on the call-up, or -1 when there is none
  | 'vetting_priority_months' // months since military applicants were given priority; -1 if never
  | 'vetting_relaxed_months'; // months since the vetting standard was relaxed; -1 if never

export type ConditionOp = '>=' | '<=' | '==' | '>' | '<' | '!=';

export interface Condition {
  key: ConditionKey;
  op: ConditionOp;
  value: number;
}

export interface EventTrigger {
  minTurn?: number;
  maxTurn?: number;
  /** Fire only when turns_remaining equals this. */
  turnsRemaining?: number;
  conditions?: Condition[];
  /** If true the event can fire more than once. Default false. */
  repeatable?: boolean;
  /** Repeatable events only: months that must pass before it can fire again. */
  cooldownMonths?: number;
  /** Repeatable events only: how many times it may fire in one game. */
  maxFires?: number;
}

export type Effect =
  | { type: 'pc'; delta: number }
  | { type: 'willingness'; delta: number; durationMonths?: number }
  | { type: 'pool'; pool: PoolKey; delta: number }
  | { type: 'pool_pct'; pool: PoolKey; pct: number }
  | { type: 'reserve_arrival_shift'; months: number } // negative = sooner
  | { type: 'reserve_deployable_fraction_add'; delta: number }
  | { type: 'ex_regular_ceiling_add'; delta: number }
  | { type: 'trace_strategic' }
  | { type: 'capacity_purchases'; delta: number }
  | { type: 'capacity_multiplier'; factor: number; durationMonths?: number }
  | { type: 'leaders_spareable_add'; delta: number }
  | { type: 'outflow_intent_add'; delta: number }
  | { type: 'medical_standard'; standard: MedicalStandard }
  | { type: 'exemptions'; regime: ExemptionRegime }
  | { type: 'eligible_pool_pct'; pct: number }
  /**
   * Ceiling on conscripts called per month, named as a parameter id so the
   * magnitude stays in parameters.json with its range and rationale. Expires
   * after `durationMonths`, or never if absent.
   */
  | { type: 'callup_cap'; param: string; durationMonths?: number }
  /** Give (or withdraw) the military first claim on the security vetting teams. */
  | { type: 'vetting_priority'; military: boolean }
  /** Lower (or restore) the vetting standard applied to those called up. */
  | { type: 'vetting_relax'; relaxed: boolean }
  | { type: 'equipment_delay'; months: number }
  | { type: 'cost'; gbp: number }
  | { type: 'flag'; flag: string; value: boolean }
  | { type: 'scoring_pc_if_missed'; delta: number }
  | { type: 'end_game'; reason: string }
  | { type: 'random'; chance: number; then: Effect[]; else: Effect[] };

export interface EventChoice {
  label: string;
  /** One-sentence consequence shown before choosing, in civil-service register. */
  summary: string;
  effects: Effect[];
}

export interface GameEvent {
  id: string;
  title: string;
  /** 2–4 sentences. May reference sourced numbers only via `source`. */
  text: string;
  trigger: EventTrigger;
  weight: number;
  /** Empty array = informational event, no choice. */
  choices: EventChoice[];
  /** Required if `text` quotes a number as fact. */
  source?: { name: string; url: string; paramIds?: string[] };
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export type QualityBand = 'low' | 'mid' | 'high'; // <0.45, 0.45–0.65, >0.65
export type LeadershipBand = 'broken' | 'strained' | 'intact'; // <0.6, 0.6–0.9, >0.9
/**
 * How far from the target the run finished, as a share of it, in whichever
 * direction: `near` is within `MARGIN_NEAR_FRACTION`, `clear` is anything
 * wider. The direction is carried by `met`, so `near` is a close-run thing
 * either way and `clear` is a comfortable win or a plain failure. The band
 * exists because both of those are two quite different endings wearing one
 * verdict — see design review F18.
 */
export type MarginBand = 'near' | 'clear';
/**
 * Why the leadership factor broke: `diverted` if returning the junior leaders
 * sent to run the training estate would lift it out of the broken band,
 * `swamped` if it would not — the cadre was outnumbered by what was raised and
 * no amount of recalling instructors would have helped (§7b).
 *
 * **Only meaningful where leadership is `broken`,** which is what both verdicts
 * selecting on it require. A healthy run reports `diverted` and means nothing
 * by it. See design review F18.
 */
export type CadreBand = 'diverted' | 'swamped';

export interface Verdict {
  id: string;
  met: boolean | 'any';
  quality: QualityBand | 'any';
  leadership: LeadershipBand | 'any';
  resigned?: boolean;
  /** Omitted means either band; see MarginBand. */
  margin?: MarginBand;
  /** Omitted means either band; see CadreBand. Pair it with `leadership: 'broken'`. */
  cadre?: CadreBand;
  /** Template with {placeholders}: see VerdictVars. */
  text: string;
  /** One line for the share card, same placeholders. */
  oneLiner: string;
}

export interface VerdictVars {
  target: number;
  ese: number;
  headcount: number;
  months: number;
  quality: number;
  leadership: number;
  costBn: number;
  gdpLossBn: number;
  conscripts: number;
  reservists: number;
  regulars: number;
  shortfall: number;
  surplus: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type PoolKey =
  | 'regularTrained'
  | 'regularUntrained'
  | 'reserveVolunteerAvailable'
  | 'reserveVolunteerPending'
  | 'reserveVolunteerMobilised'
  | 'exRegularTracked'
  | 'exRegularReported'
  | 'strategicUntracked'
  | 'strategicTraced'
  | 'conscriptEligible'
  | 'conscriptCalled'
  | 'holdingPool'
  | 'conscriptInTraining'
  | 'conscriptTrainedUnequipped'
  | 'conscriptTrainedEquipped';

export interface TrainingCohort {
  size: number;
  startMonth: number;
  graduationMonth: number;
  syllabus: Syllabus;
  medical: MedicalStandard;
  /**
   * The Bill's age band when the cohort entered training. Held on the cohort
   * rather than read from the Bill, for the same reason `medical` is: amending
   * the Bill cannot change who is already on the course. Optional because a
   * cohort saved before the field existed has none, and is then charged no
   * age adjustment.
   */
  ageBand?: AgeBand;
}

export interface TrainedCohort {
  size: number;
  graduationMonth: number;
  syllabus: Syllabus;
  equipped: boolean;
}

export interface ScheduledArrival {
  size: number;
  arrivalMonth: number;
}

export interface Ledger {
  cumulativeCost: number; // gbp
  cumulativeGdpLoss: number; // gbp
  monthlyCost: number;
  monthlyGdpLoss: number;
  costBreakdown: {
    regularPay: number;
    conscriptPay: number;
    conscriptTraining: number;
    reservistPay: number;
    equipment: number;
    capacity: number;
    civilianInstructors: number;
    other: number;
  };
  regularOutflowToDate: number;
  juniorLeadersLostToOutflow: number;
  juniorLeadersDiverted: number;
}

export interface Gauges {
  forceReady: number; // ESE
  forceReadyPct: number; // 0–100+
  forceQuality: number; // 0–1
  politicalCapital: number;
  leadershipFactor: number;
  headcountCounted: number;
}

export interface Composition {
  regulars: { headcount: number; ese: number };
  reservists: { headcount: number; ese: number };
  exRegulars: { headcount: number; ese: number };
  strategic: { headcount: number; ese: number };
  conscripts: { headcount: number; ese: number };
}

export interface BriefingFacts {
  turn: number;
  forceReadyDelta: number;
  forceQualityDelta: number;
  pcDelta: number;
  pcReasons: { label: string; delta: number }[];
  arrivals: { label: string; count: number }[];
  graduations: number;
  outflow: number;
  holdingPoolDelta: number;
  leadershipFactor: number;
  notes: string[]; // machine-generated facts (not prose) for templating
}

export interface GameState {
  version: 3;
  seed: number;
  rngState: number;
  difficulty: Difficulty;
  target: number;
  deadlineMonths: number;
  turn: number; // 0 at Day 0
  over: boolean;
  overReason?: 'deadline' | 'resigned' | 'event';

  pools: Record<PoolKey, number>;
  trainingCohorts: TrainingCohort[];
  trainedCohorts: TrainedCohort[];
  reserveArrivals: ScheduledArrival[];

  // Reserve levers
  reserveCalledOut: boolean;
  reserveNotice: ReserveNotice | 0;
  reserveDeployableFraction: number;
  exRegularRecallActive: boolean;
  exRegularRecallMonth: number;
  exRegularCeiling: number;
  strategicTraceMonth: number | null; // month the trace completes
  strategicTraceDone: boolean;
  stopLoss: boolean;
  /** The Equipment Plan's contingency has been spent on the mobilisation (spec §8a). */
  contingencyDrawn: boolean;
  /** Intention to leave, in points; starts at `regular_outflow_intent_pct` (spec §6a). */
  outflowIntent: number;

  // Legislation and conscription settings
  billStatus: 'none' | 'in_progress' | 'passed';
  billPassesMonth: number | null;
  clauses: BillClauses;
  callupPerMonth: number;
  /** Vetting ceiling on the monthly call-up; null when the queue is not the binding constraint. */
  callupCapPerMonth: number | null;
  /** Parameter the ceiling came from, so the UI can show its source popover. */
  callupCapParam: string | null;
  /** Last month the ceiling applies; null means it does not expire. */
  callupCapUntil: number | null;
  /** The month the military were given priority for vetting; null if they never were. */
  vettingPriorityMonth: number | null;
  /** The month the vetting standard was lowered; null if it never was. */
  vettingRelaxedMonth: number | null;
  conscriptionEverActive: boolean;
  conscriptsCalledTotal: number;
  /** Called up and did not report (spec §10a). */
  conscriptsRefusedTotal: number;
  /**
   * Refusal cases not yet charged. The courts work through the backlog at
   * `pc_refusal_per_charge` cases per political capital (§9), and the
   * remainder carries to next month so that no refusal is ever free.
   */
  refusalCaseload: number;
  eligiblePoolMultiplier: number; // event-driven adjustments to the eligible pool

  // Pipeline levers
  capacityPurchases: number;
  capacityPurchaseMonths: number[]; // months each purchase becomes active
  /**
   * Month each accelerated cadre course finishes. While a course runs its
   * instructors are out of the line; when it finishes its graduates lead, at
   * `eff_promoted_leader` of a substantive junior leader (§7c).
   */
  promotionCourseMonths: number[];
  capacityMultiplier: number;
  capacityMultiplierUntil: number | null;
  civilianInstructors: boolean;
  civilianInstructorsMonth: number | null;
  syllabus: Syllabus;
  equipmentOrdered: boolean;
  equipmentArrivalMonth: number | null;
  juniorEntryTaken: boolean;
  leadersSpareableAdjust: number;

  // Politics
  politicalCapital: number;
  willingness: number; // pct
  willingnessBoosts: { delta: number; until: number }[];
  addressCount: number;
  blameCount: number;
  /** Consecutive months in which the minister took no action at all. */
  idleMonths: number;
  spendingRaised: boolean;
  scoringPcIfMissed: number;
  flags: Record<string, boolean>;

  // Events
  firedEvents: string[];
  pendingEvent: string | null;
  eventLog: { turn: number; eventId: string; choice: number | null }[];

  ledger: Ledger;
  gauges: Gauges;
  composition: Composition;
  briefing: BriefingFacts;
  history: { turn: number; gauges: Gauges; ledger: Pick<Ledger, 'cumulativeCost' | 'cumulativeGdpLoss'> }[];
}

export interface TurnInput {
  actions: Action[];
  /** Index into pendingEvent.choices; null if the event has no choices. */
  eventChoice: number | null;
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface Score {
  met: boolean;
  resigned: boolean;
  target: number;
  ese: number;
  headcount: number;
  shortfall: number; // max(0, target - ese)
  months: number;
  quality: number;
  qualityBand: QualityBand;
  leadership: number;
  leadershipBand: LeadershipBand;
  marginBand: MarginBand;
  cadreBand: CadreBand;
  composition: Composition;
  cost: number;
  costPctDefenceBudget: number;
  gdpLoss: number;
  gdpLossPctGdp: number;
  /** Conscripts prosecuted for not reporting, across the whole run. */
  refused: number;
  /**
   * Refusal cases the courts had not reached when the run ended. The charge is
   * capped at `pc_refusal_max` a month (§9), so a minister who calls up far
   * over the training estate's capacity leaves a list that outlives the
   * government — which is the honest consequence, and the one the cap would
   * otherwise hide.
   */
  refusalBacklog: number;
  verdictId: string;
  verdictText: string;
  verdictOneLiner: string;
  seedUrl: string;
}
