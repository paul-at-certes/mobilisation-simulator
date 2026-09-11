/**
 * Player-facing copy for each action: title, description (HTML with sourced
 * values), and group. Numbers come from parameters via sourcedHtml so every
 * one has a popover.
 */
import type { ActionId } from '../types';
import { sourcedHtml, getParam } from './components/sourced';

const v = (id: string): string => {
  const p = getParam(id);
  if (!p) return `?${id}`;
  const n = p.value;
  if (p.unit === 'gbp') return n >= 1e9 ? `£${(n / 1e9).toFixed(1)}bn` : n >= 1e6 ? `£${Math.round(n / 1e6)}m` : `£${n.toLocaleString('en-GB')}`;
  if (p.unit === 'pct') return `${n}%`;
  if (p.unit === 'ratio') return `${Math.round(n * 100)}%`;
  return n.toLocaleString('en-GB');
};
const s = (id: string, display?: string): string => sourcedHtml(display ?? v(id), id);
// Bare number, for cases where the sentence supplies the unit ("5 percentage points").
const n = (id: string): string => s(id, String(getParam(id)?.value ?? '?'));

export type ActionGroup = 'reserves' | 'conscription' | 'pipeline' | 'political';

export interface ActionCopy {
  title: string;
  html: string;
  group: ActionGroup;
}

export const ACTION_COPY: Record<ActionId, ActionCopy> = {
  call_out_reserve: {
    group: 'reserves',
    title: 'Call out the Army Reserve',
    html: `Reserve Forces Act 1996 s.52. Up to ${s('reserve_volunteer_trained')} trained volunteer reservists, of whom about ${s('reserve_volunteer_deployable_fraction')} should actually be available. They arrive ${s('reserve_arrival_months_default')} months after call-out at the standard ${s('reserve_notice_days_default')}-day notice, or ${s('reserve_arrival_months_amended')} months if you legislate ${s('reserve_notice_days_amended')} days. They count at effectiveness ${s('eff_reserve_volunteer')}.`,
  },
  recall_ex_regular: {
    group: 'reserves',
    title: 'Recall the Ex-Regular Reserve',
    html: `Sections 52 and 54. ${s('ex_regular_tracked')} former regulars appear on current records. At most ${s('ex_regular_report_ceiling')} of them will ever report. The first do so after ${s('ex_regular_delay_months')} months, and about ${s('ex_regular_report_rate_monthly')} of those still outstanding follow each month after that. Effectiveness ${s('eff_ex_regular')}.`,
  },
  trace_strategic_reserve: {
    group: 'reserves',
    title: 'Trace the Strategic Reserve',
    html: `Ministers claim a Strategic Reserve of ${s('strategic_reserve_claimed')}. Only the Ex-Regular Reserve is on record; the other ${s('strategic_reserve_untracked')} are not. A trace takes ${s('strategic_trace_delay_months')} months and finds between ${s('strategic_trace_yield_min')} and ${s('strategic_trace_yield_max')} of them. Half of those found report. Effectiveness ${s('eff_strategic')}.`,
  },
  stop_loss: {
    group: 'reserves',
    title: 'Stop-loss',
    html: `Extend engagements and suspend voluntary outflow. Removes the ${s('regular_voluntary_outflow_annual')} a year of trade-trained voluntary leavers, and the junior leaders among them. Immediate.`,
  },
  introduce_bill: {
    group: 'conscription',
    title: 'Introduce a National Service Bill',
    html: `Starts the legislative clock: ${s('bill_months_emergency')} months under emergency procedure or ${s('bill_months_normal')} under the normal timetable. The Bill's clauses set the age band, whether women are included (${s('women_included_support_pct')} of the public say yes), the medical standard and the exemptions regime. Nothing else in this section is available until it passes.`,
  },
  amend_bill: {
    group: 'conscription',
    title: 'Amend the Bill',
    html: `Change the age band, the inclusion of women, the medical standard or the exemptions. Costs an action and any political capital the new clause carries.`,
  },
  set_callup: {
    group: 'conscription',
    title: 'Monthly call-up',
    html: `How many to call each month. Anyone the training estate has no room for goes into a holding pool: paid, counted in GDP loss, producing nothing. The figure stays in force until you change it. Free: does not use an action slot.`,
  },
  expand_capacity: {
    group: 'pipeline',
    title: 'Expand training capacity',
    html: `Each purchase adds ${s('capacity_purchase_annual')} a year to trained output after ${s('capacity_standup_months')} months and costs ${s('capacity_purchase_cost')}. New places are filled from the holding pool and the month's call-up together. Each one pulls ${s('leaders_per_capacity_purchase')} junior leaders out of the field force as instructors. The Army has ${s('junior_leaders')} junior leaders; about ${s('junior_leaders_spareable_fraction')} of them can be spared before regular units stop working.`,
  },
  compress_syllabus: {
    group: 'pipeline',
    title: 'Compress the syllabus',
    html: `Phase 1 from ${s('phase1_weeks')} to ${s('phase1_weeks_compressed')} weeks, Phase 2 from an average ${s('phase2_weeks')} to ${s('phase2_weeks_compressed')}. Throughput ×${s('syllabus_throughput_multiplier')}; graduate effectiveness −${s('compressed_effectiveness_penalty')}; attrition +${s('attrition_compressed_add')} on a baseline of ${s('training_attrition')}. Immediate, for cohorts starting next month.`,
  },
  contract_civilian_instructors: {
    group: 'pipeline',
    title: 'Contract civilian instructors',
    html: `Adds ${s('civilian_instructor_capacity_annual')} a year of training capacity for non-combat trades, without drawing on junior leaders, after ${s('civilian_instructor_delay_months')} months, at ${s('civilian_instructor_cost_annual')} a year.`,
  },
  junior_entry: {
    group: 'pipeline',
    title: 'Reinstate Harrogate-style junior entry',
    html: `Enrol sixteen-year-olds. Non-completion at the Army Foundation College averaged ${s('junior_entry_attrition')} over 2018–2023 and nobody deploys before eighteen: a ${s('junior_entry_lead_months')}-month lead. The Permanent Secretary will explain why this does nothing.`,
  },
  equipment_buy: {
    group: 'pipeline',
    title: 'Emergency equipment buy',
    html: `Personal kit for conscripts at about ${s('equipment_cost_per_head')} a head, issued after ${s('equipment_lead_months')} months. Until it arrives, trained conscripts count at ${s('eff_conscript_unequipped')}.`,
  },
  address_nation: {
    group: 'political',
    title: 'Address the nation',
    html: `+${s('pc_address_first')} political capital the first time, +${s('pc_address_second')} the second. −${s('pc_address_subsequent', '5')} every time after that: there is only so much to announce. Willingness to serve rises ${n('address_willingness_boost_pct')} percentage points for ${s('address_willingness_months')} months each time. Willingness is currently polled at ${s('willingness_start_pct')}.`,
  },
  raise_spending: {
    group: 'political',
    title: 'Raise defence spending',
    html: `Doubles the cumulative cost at which the Treasury starts charging political capital (currently every ${s('cost_pc_penalty_threshold')} costs ${s('cost_pc_penalty_per_step')} a month).`,
  },
  blame_predecessors: {
    group: 'political',
    title: 'Blame the previous government',
    html: `+${s('pc_blame_first')} political capital the first time. −${s('pc_blame_subsequent', '5')} every time after that. The House has heard it before.`,
  },
};

export const GROUP_TITLES: Record<ActionGroup, string> = {
  reserves: 'Reserves (no new legislation)',
  conscription: 'Conscription (requires legislation)',
  pipeline: 'Training pipeline',
  political: 'Political',
};
