/**
 * actions.ts — the levers (spec §3).
 *
 * `availableActions(state)` lists every ActionId with availability and the
 * PC delta the player will see. `applyAction(state, action)` validates and
 * applies one action to the state IN PLACE (step.ts clones first) and
 * returns { ok, reason }. PC costs are charged immediately; one-off £ charges
 * accumulate in `ledger.costBreakdown` and are folded into the month's cost.
 */
import type { Action, ActionAvailability, ActionId, ActionResult, BillClauses, GameState } from '../types.js';
import { P, ageBandClauseCost } from './params.js';
import { billMonths, recomputeEligible } from './legislation.js';
import { leadersSpareable, promotionCoursesRunning } from './effectiveness.js';
import { courseMonths, spareIntake } from './pipeline.js';
import { formatInt, signedInt } from '../format.js';
import type { Syllabus } from '../types.js';

// ---------------------------------------------------------------------------
// When a lever pays off
// ---------------------------------------------------------------------------

/**
 * Every lever in this game lands months after it is pulled, and the model has
 * always known when that month falls after the deadline: the holding pool
 * says so for the people already called, and the scripted strategies guard on
 * it. The action rows said nothing, so a player could run a cadre course in
 * month 11 of 12 and learn from the verdict that its instructors were out of
 * the line on the day (design review F19). These put the month on the face of
 * the row, and say "after the deadline" when it is.
 */
export function monthWord(s: GameState, month: number): string {
  return month > s.deadlineMonths ? `month ${month}, after the deadline` : `month ${month}`;
}

/**
 * The month a conscript called at the end of this turn graduates. The cohort
 * forms next month and runs the course in force then (§5), so this is the
 * figure the call-up row shows, and the Bill row shows it for the month the
 * Bill passes.
 */
export function graduationMonth(s: GameState, callupTurn: number, syllabus: Syllabus = s.syllabus): number {
  return callupTurn + 1 + courseMonths(syllabus);
}

/**
 * Whether a training place opening in `month` can graduate anybody before the
 * deadline: `'yes'` on the syllabus in force, `'compressed'` only on a
 * compressed one, `'no'` on either.
 */
export function placesOpeningIn(s: GameState, month: number): 'yes' | 'compressed' | 'no' {
  if (month + courseMonths(s.syllabus) <= s.deadlineMonths) return 'yes';
  if (month + courseMonths('compressed') <= s.deadlineMonths) return 'compressed';
  return 'no';
}

function placesNote(s: GameState, standsUp: number, what: string): string | undefined {
  switch (placesOpeningIn(s, standsUp)) {
    case 'yes':
      return undefined;
    case 'compressed':
      return `${what} in month ${standsUp}; on the ${courseMonths(s.syllabus)}-month course nobody it trains graduates before the deadline. A compressed syllabus would.`;
    case 'no':
      return `${what} in month ${standsUp}: too late for anybody it trains to graduate before the deadline.`;
  }
}

/**
 * The estate's spare intake once every purchase and contract already made has
 * stood up, and the month that happens. `null` when nothing is pending.
 */
export function spareIntakeWhenStoodUp(s: GameState): { month: number; spare: number } | null {
  const pending = s.capacityPurchaseMonths.filter((m) => m > s.turn);
  if (s.civilianInstructors && s.civilianInstructorsMonth != null && s.civilianInstructorsMonth > s.turn) pending.push(s.civilianInstructorsMonth);
  if (!pending.length) return null;
  const month = Math.max(...pending);
  return { month, spare: spareIntake({ ...s, turn: month }) };
}

function joinNotes(...notes: (string | undefined)[]): string | undefined {
  const out = notes.filter((n): n is string => !!n);
  return out.length ? out.join(' ') : undefined;
}

/** Plain-English labels for briefing notes and the CLI. */
export const ACTION_LABELS: Record<ActionId, string> = {
  call_out_reserve: 'Called out the Army Reserve',
  recall_ex_regular: 'Recalled the Ex-Regular Reserve',
  trace_strategic_reserve: 'Ordered a trace of the Strategic Reserve',
  stop_loss: 'Imposed stop-loss',
  draw_contingency: "Spent the Equipment Plan's contingency",
  introduce_bill: 'Introduced the National Service Bill',
  amend_bill: 'Amended the National Service Bill',
  set_callup: 'Set the monthly call-up',
  expand_capacity: 'Expanded training capacity',
  accelerate_promotion: 'Ran an accelerated cadre course',
  compress_syllabus: 'Compressed the syllabus',
  contract_civilian_instructors: 'Contracted civilian instructors',
  junior_entry: 'Reinstated junior entry',
  equipment_buy: 'Placed the emergency equipment order',
  address_nation: 'Addressed the nation',
  raise_spending: 'Raised defence spending',
  blame_predecessors: 'Blamed the previous government',
};

export const ACTION_IDS: readonly ActionId[] = [
  'call_out_reserve',
  'recall_ex_regular',
  'trace_strategic_reserve',
  'stop_loss',
  'draw_contingency',
  'introduce_bill',
  'amend_bill',
  'set_callup',
  'expand_capacity',
  'accelerate_promotion',
  'compress_syllabus',
  'contract_civilian_instructors',
  'junior_entry',
  'equipment_buy',
  'address_nation',
  'raise_spending',
  'blame_predecessors',
];

/**
 * PC cost of the clauses that carry a cost, relative to `previous` (all clauses
 * if undefined).
 *
 * The age band is charged as a difference rather than as a flat cost, because
 * unlike the other three it is never absent: every Bill has a band, and the
 * default 18-30 is the zero. Amending from a dearer band to a cheaper one
 * therefore refunds, which is right — the Bill is being narrowed.
 */
export function clauseCosts(next: BillClauses, previous?: BillClauses): number {
  let pc = ageBandClauseCost(next.ageBand) - (previous ? ageBandClauseCost(previous.ageBand) : 0);
  if (!next.includeWomen && (!previous || previous.includeWomen)) pc += P.pc_cost_exclude_women;
  if (next.medical === 'relaxed' && (!previous || previous.medical !== 'relaxed')) pc += P.pc_cost_medical_relaxed;
  if (next.medical === 'wartime' && (!previous || previous.medical !== 'wartime')) pc += P.pc_cost_medical_wartime;
  if (next.exemptions === 'minimal' && (!previous || previous.exemptions !== 'minimal')) pc += P.pc_cost_exemptions_minimal;
  return pc;
}

export function addressPc(count: number): number {
  if (count === 0) return P.pc_address_first;
  if (count === 1) return P.pc_address_second;
  // A third address with nothing new in it costs, as blaming them again does.
  return P.pc_address_subsequent;
}

export function blamePc(count: number): number {
  return count === 0 ? P.pc_blame_first : P.pc_blame_subsequent;
}

/** Exact PC delta of a fully specified action against the current state. */
export function actionPcDelta(s: GameState, action: Action): number {
  switch (action.id) {
    case 'call_out_reserve':
      return P.pc_cost_call_out_reserve + (action.notice === 90 ? P.pc_cost_ninety_day_notice : 0);
    case 'recall_ex_regular':
      return P.pc_cost_recall_ex_regular;
    case 'trace_strategic_reserve':
      return P.pc_cost_trace_strategic;
    case 'stop_loss':
      return P.pc_cost_stop_loss;
    case 'draw_contingency':
      // Deliberately free. The whole point is that it costs no capital now and
      // makes every later Treasury step cost more (§8a).
      return 0;
    case 'introduce_bill':
      return (action.procedure === 'emergency' ? P.pc_cost_bill_emergency : P.pc_cost_bill_normal) + clauseCosts(action.clauses);
    case 'amend_bill':
      return clauseCosts({ ...s.clauses, ...action.clauses }, s.clauses);
    case 'set_callup':
      return 0;
    case 'expand_capacity':
      return P.pc_cost_expand_capacity;
    case 'accelerate_promotion':
      return P.pc_cost_accelerate_promotion;
    case 'compress_syllabus':
      return P.pc_cost_compress_syllabus;
    case 'contract_civilian_instructors':
      return P.pc_cost_civilian_instructors;
    case 'junior_entry':
      return P.pc_cost_junior_entry;
    case 'equipment_buy':
      return P.pc_cost_equipment_buy;
    case 'address_nation':
      return addressPc(s.addressCount);
    case 'raise_spending':
      return P.pc_cost_raise_spending;
    case 'blame_predecessors':
      return blamePc(s.blameCount);
  }
}

function availability(s: GameState, id: ActionId): ActionAvailability {
  switch (id) {
    case 'call_out_reserve':
      return s.reserveCalledOut
        ? { id, available: false, reason: 'The Army Reserve has already been called out.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason:
              s.turn + P.reserve_arrival_months_default > s.deadlineMonths
                ? `At ${P.reserve_notice_days_default} days' notice they arrive in ${monthWord(s, s.turn + P.reserve_arrival_months_default)}; at ${P.reserve_notice_days_amended} days, ${monthWord(s, s.turn + P.reserve_arrival_months_amended)} (${signedInt(P.pc_cost_ninety_day_notice)} PC more).`
                : `Legislating ${P.reserve_notice_days_amended}-day notice costs a further ${signedInt(P.pc_cost_ninety_day_notice)} PC.`,
            pcDelta: P.pc_cost_call_out_reserve,
          };
    case 'recall_ex_regular':
      return s.exRegularRecallActive
        ? { id, available: false, reason: 'Recall of the Ex-Regular Reserve is already under way.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason:
              s.turn + P.ex_regular_delay_months > s.deadlineMonths
                ? `The first reports arrive in ${monthWord(s, s.turn + P.ex_regular_delay_months)}.`
                : undefined,
            pcDelta: P.pc_cost_recall_ex_regular,
          };
    case 'trace_strategic_reserve':
      if (s.strategicTraceDone)
        return { id, available: false, reason: 'The Strategic Reserve trace has been completed.', pcDelta: 0, exhausted: true };
      if (s.strategicTraceMonth != null)
        return { id, available: false, reason: `A trace is in progress and reports in month ${s.strategicTraceMonth}.`, pcDelta: 0, exhausted: true };
      return {
        id,
        available: true,
        reason:
          s.turn + P.strategic_trace_delay_months > s.deadlineMonths
            ? `The trace reports in ${monthWord(s, s.turn + P.strategic_trace_delay_months)}.`
            : undefined,
        pcDelta: P.pc_cost_trace_strategic,
      };
    case 'stop_loss':
      return s.stopLoss
        ? { id, available: false, reason: 'Stop-loss is already in force.', pcDelta: 0, exhausted: true }
        : { id, available: true, pcDelta: P.pc_cost_stop_loss };
    case 'draw_contingency':
      return s.contingencyDrawn
        ? { id, available: false, reason: "The Equipment Plan's contingency has been spent.", pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason: s.equipmentOrdered && s.equipmentArrivalMonth != null && s.equipmentArrivalMonth > s.turn
              ? `The equipment order already placed would slip ${P.contingency_equipment_delay_months} months.`
              : undefined,
            pcDelta: 0,
          };
    case 'introduce_bill':
      return s.billStatus !== 'none'
        ? { id, available: false, reason: 'A National Service Bill has already been introduced.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            // The arithmetic the whole branch turns on: Bill plus course
            // against the deadline. It was nowhere on screen (F19).
            reason: billTimingNote(s),
            pcDelta: P.pc_cost_bill_normal,
          };
    case 'amend_bill':
      return s.billStatus === 'none'
        ? { id, available: false, reason: 'No Bill to amend.', pcDelta: 0 }
        : { id, available: true, reason: 'Clause costs are charged only for clauses that change.', pcDelta: 0 };
    case 'set_callup':
      return s.billStatus !== 'passed'
        ? { id, available: false, reason: 'The National Service Bill has not passed.', pcDelta: 0 }
        : { id, available: true, reason: callupNote(s), pcDelta: 0 };
    case 'expand_capacity': {
      const spare = leadersSpareable(s);
      const note =
        spare - P.leaders_per_capacity_purchase < 0
          ? `The spareable junior-leader cadre cannot cover another ${P.leaders_per_capacity_purchase} instructors; the leadership factor will fall.`
          : s.pools.regularTrained < P.leaders_per_capacity_purchase
            ? `Regular strength cannot spare ${P.leaders_per_capacity_purchase} instructors.`
            : undefined;
      return {
        id,
        available: true,
        reason: joinNotes(note, placesNote(s, s.turn + P.capacity_standup_months, 'Stands up')),
        pcDelta: P.pc_cost_expand_capacity,
      };
    }
    case 'accelerate_promotion': {
      // One course at a time: the battle school has one set of training areas
      // and one directing staff. This is the only thing bounding the rate, so
      // it is a rule of the model rather than a rule of thumb — without it a
      // minister can run a course a month and buy a cadre outright.
      const running = promotionCoursesRunning(s);
      if (running > 0) {
        const due = Math.min(...s.promotionCourseMonths.filter((m) => m > s.turn));
        return {
          id,
          available: false,
          reason: `A cadre course is already running; it finishes in month ${due}.`,
          pcDelta: 0,
        };
      }
      // The course needs instructors, and they come from the same cadre a
      // capacity purchase draws on. Warn when it cannot cover them: the course
      // still runs, and the leadership factor pays for it first.
      const instructors = P.promotion_cadre_size / P.instructor_ratio;
      const note =
        leadersSpareable(s) - instructors < 0
          ? `The spareable junior-leader cadre cannot cover another ${Math.round(instructors)} instructors; the leadership factor will fall further before it rises.`
          : undefined;
      const finishes = s.turn + P.promotion_course_months;
      const late =
        finishes > s.deadlineMonths
          ? `Finishes in ${monthWord(s, finishes)}: its instructors would still be out of the line on the day.`
          : undefined;
      return { id, available: true, reason: joinNotes(note, late), pcDelta: P.pc_cost_accelerate_promotion };
    }
    case 'compress_syllabus':
      return s.syllabus === 'compressed'
        ? { id, available: false, reason: 'The syllabus is already compressed.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason:
              graduationMonth(s, s.turn, 'compressed') > s.deadlineMonths
                ? `A course starting next month finishes in ${monthWord(s, graduationMonth(s, s.turn, 'compressed'))}.`
                : undefined,
            pcDelta: P.pc_cost_compress_syllabus,
          };
    case 'contract_civilian_instructors':
      return s.civilianInstructors
        ? { id, available: false, reason: 'Civilian instructors are already contracted.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason: placesNote(s, s.turn + P.civilian_instructor_delay_months, 'Starts teaching'),
            pcDelta: P.pc_cost_civilian_instructors,
          };
    case 'junior_entry':
      return s.juniorEntryTaken
        ? { id, available: false, reason: 'Junior entry has already been reinstated.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason: `Its first recruits reach deployable age in month ${s.turn + P.junior_entry_lead_months}; nothing from it counts before the deadline.`,
            pcDelta: P.pc_cost_junior_entry,
          };
    case 'equipment_buy':
      return s.equipmentOrdered
        ? { id, available: false, reason: 'The emergency equipment buy has been placed.', pcDelta: 0, exhausted: true }
        : {
            id,
            available: true,
            reason: equipmentNote(s),
            pcDelta: P.pc_cost_equipment_buy,
          };
    case 'address_nation':
      return {
        id,
        available: true,
        reason: s.addressCount >= 2 ? 'The public has stopped listening; going on television again will cost you.' : undefined,
        pcDelta: addressPc(s.addressCount),
      };
    case 'raise_spending':
      return s.spendingRaised
        ? { id, available: false, reason: 'Defence spending has already been raised.', pcDelta: 0, exhausted: true }
        : { id, available: true, pcDelta: P.pc_cost_raise_spending };
    case 'blame_predecessors':
      return {
        id,
        available: true,
        reason: s.blameCount > 0 ? 'Blaming them again will cost you.' : undefined,
        pcDelta: blamePc(s.blameCount),
      };
  }
}

function billTimingNote(s: GameState): string {
  const line = (procedure: 'emergency' | 'normal') => {
    const passes = s.turn + billMonths(procedure);
    const normal = graduationMonth(s, passes, 'normal');
    const compressed = graduationMonth(s, passes, 'compressed');
    const late = (m: number) => (m > s.deadlineMonths ? `${m}, after the deadline` : String(m));
    return `${procedure === 'emergency' ? 'Emergency' : 'Normal'}: Royal Assent month ${passes}; first conscripts graduate month ${late(normal)} (${late(compressed)} compressed).`;
  };
  return `${line('emergency')} ${line('normal')} Clause costs extra.`;
}

function callupNote(s: GameState): string {
  const now = Math.floor(spareIntake(s));
  const later = spareIntakeWhenStoodUp(s);
  const room =
    later && Math.floor(later.spare) !== now
      ? `The estate has room for ${formatInt(now)} a month now and ${formatInt(Math.floor(later.spare))} from month ${later.month}.`
      : `The estate has room for ${formatInt(now)} a month.`;
  const grad = graduationMonth(s, s.turn);
  const compressed = graduationMonth(s, s.turn, 'compressed');
  let when: string;
  if (compressed > s.deadlineMonths) {
    // Late on either course: say so once, not twice.
    when = `Called now, nobody graduates before the deadline: month ${compressed} at the earliest.`;
  } else if (s.syllabus === 'compressed' || compressed === grad) {
    when = `Called now, they graduate in ${monthWord(s, grad)}.`;
  } else {
    when = `Called now, they graduate in ${monthWord(s, grad)} (${monthWord(s, compressed)} compressed).`;
  }
  return `${room} ${when}`;
}

function equipmentNote(s: GameState): string | undefined {
  const arrives = s.turn + P.equipment_lead_months + (s.contingencyDrawn ? P.contingency_equipment_delay_months : 0);
  if (arrives > s.deadlineMonths) return `Arrives in ${monthWord(s, arrives)}.`;
  if (s.contingencyDrawn) return `Arrives in month ${arrives}, ${P.contingency_equipment_delay_months} months later than it would have: the contingency has been spent.`;
  return undefined;
}

export function availableActions(s: GameState): ActionAvailability[] {
  return ACTION_IDS.map((id) => availability(s, id));
}

export function isActionAvailable(s: GameState, id: ActionId): boolean {
  return availability(s, id).available;
}

function reserveArrivalMonths(notice: 180 | 90): number {
  return notice === 90 ? P.reserve_arrival_months_amended : P.reserve_arrival_months_default;
}

/**
 * Apply one action to the state in place. Returns ok=false (state untouched)
 * if the action is not available or malformed.
 */
export function applyAction(s: GameState, action: Action): ActionResult {
  if (!action || typeof action !== 'object' || !ACTION_IDS.includes(action.id)) {
    return { ok: false, reason: 'Unknown action.' };
  }
  const avail = availability(s, action.id);
  if (!avail.available) return { ok: false, reason: avail.reason ?? 'Not available.' };

  switch (action.id) {
    case 'call_out_reserve': {
      if (action.notice !== 180 && action.notice !== 90) return { ok: false, reason: 'Notice must be 180 or 90 days.' };
      s.reserveCalledOut = true;
      s.reserveNotice = action.notice;
      const size = s.pools.reserveVolunteerAvailable * s.reserveDeployableFraction;
      s.pools.reserveVolunteerAvailable -= size;
      s.pools.reserveVolunteerPending += size;
      s.reserveArrivals.push({ size, arrivalMonth: s.turn + reserveArrivalMonths(action.notice) });
      s.politicalCapital += actionPcDelta(s, action);
      return { ok: true };
    }
    case 'recall_ex_regular':
      s.exRegularRecallActive = true;
      s.exRegularRecallMonth = s.turn;
      s.politicalCapital += P.pc_cost_recall_ex_regular;
      return { ok: true };
    case 'trace_strategic_reserve':
      s.strategicTraceMonth = s.turn + P.strategic_trace_delay_months;
      s.politicalCapital += P.pc_cost_trace_strategic;
      return { ok: true };
    case 'stop_loss':
      s.stopLoss = true;
      s.politicalCapital += P.pc_cost_stop_loss;
      return { ok: true };
    case 'draw_contingency':
      s.contingencyDrawn = true;
      // An order already placed loses its place in the programme it was
      // competing with; one placed later is quoted the longer lead time when
      // it is bought (see equipment_buy).
      if (s.equipmentArrivalMonth != null && s.equipmentArrivalMonth > s.turn) {
        s.equipmentArrivalMonth += P.contingency_equipment_delay_months;
      }
      return { ok: true };
    case 'introduce_bill': {
      if (action.procedure !== 'emergency' && action.procedure !== 'normal') return { ok: false, reason: 'Unknown procedure.' };
      if (!isClauses(action.clauses)) return { ok: false, reason: 'Malformed clauses.' };
      s.billStatus = 'in_progress';
      s.billPassesMonth = s.turn + billMonths(action.procedure);
      s.clauses = { ...action.clauses };
      s.politicalCapital += actionPcDelta(s, action);
      return { ok: true };
    }
    case 'amend_bill': {
      const merged: BillClauses = { ...s.clauses, ...stripUndefined(action.clauses ?? {}) };
      if (!isClauses(merged)) return { ok: false, reason: 'Malformed clauses.' };
      const pc = clauseCosts(merged, s.clauses);
      s.clauses = merged;
      if (s.billStatus === 'passed') recomputeEligible(s);
      s.politicalCapital += pc;
      return { ok: true };
    }
    case 'set_callup': {
      if (typeof action.perMonth !== 'number' || !Number.isFinite(action.perMonth)) return { ok: false, reason: 'Call-up must be a number.' };
      s.callupPerMonth = Math.max(0, action.perMonth);
      return { ok: true };
    }
    case 'expand_capacity': {
      const diverted = Math.min(P.leaders_per_capacity_purchase, Math.max(0, s.pools.regularTrained));
      s.capacityPurchases += 1;
      s.capacityPurchaseMonths.push(s.turn + P.capacity_standup_months);
      s.pools.regularTrained -= diverted;
      s.ledger.juniorLeadersDiverted += diverted;
      s.ledger.costBreakdown.capacity += P.capacity_purchase_cost;
      s.politicalCapital += P.pc_cost_expand_capacity;
      return { ok: true };
    }
    case 'accelerate_promotion':
      s.promotionCourseMonths.push(s.turn + P.promotion_course_months);
      s.politicalCapital += P.pc_cost_accelerate_promotion;
      return { ok: true };
    case 'compress_syllabus':
      s.syllabus = 'compressed';
      s.politicalCapital += P.pc_cost_compress_syllabus;
      return { ok: true };
    case 'contract_civilian_instructors':
      s.civilianInstructors = true;
      s.civilianInstructorsMonth = s.turn + P.civilian_instructor_delay_months;
      s.politicalCapital += P.pc_cost_civilian_instructors;
      return { ok: true };
    case 'junior_entry':
      s.juniorEntryTaken = true;
      s.politicalCapital += P.pc_cost_junior_entry;
      return { ok: true };
    case 'equipment_buy':
      s.equipmentOrdered = true;
      s.equipmentArrivalMonth =
        s.turn + P.equipment_lead_months + (s.contingencyDrawn ? P.contingency_equipment_delay_months : 0);
      s.politicalCapital += P.pc_cost_equipment_buy;
      return { ok: true };
    case 'address_nation':
      s.politicalCapital += addressPc(s.addressCount);
      s.addressCount += 1;
      s.willingnessBoosts.push({ delta: P.address_willingness_boost_pct, until: s.turn + P.address_willingness_months });
      return { ok: true };
    case 'raise_spending':
      s.spendingRaised = true;
      s.politicalCapital += P.pc_cost_raise_spending;
      return { ok: true };
    case 'blame_predecessors':
      s.politicalCapital += blamePc(s.blameCount);
      s.blameCount += 1;
      return { ok: true };
  }
}

const AGE_BANDS = ['18-25', '18-30', '26-40', '18-65'];
const MEDICALS = ['peacetime', 'relaxed', 'wartime'];
const EXEMPTIONS = ['strict', 'broad', 'minimal'];

export function isClauses(c: unknown): c is BillClauses {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  return (
    AGE_BANDS.includes(o.ageBand as string) &&
    typeof o.includeWomen === 'boolean' &&
    MEDICALS.includes(o.medical as string) &&
    EXEMPTIONS.includes(o.exemptions as string)
  );
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}
