/**
 * Action menu. The player ticks up to two actions (free controls excepted);
 * actions with options expose selects/inputs inline. Returns a controller the
 * turn screen reads when the month ends.
 */
import type { Action, ActionAvailability, ActionId, AgeBand, BillClauses, BillProcedure, ExemptionRegime, GameState, MedicalStandard, ReserveNotice } from '../../types';
import { FREE_ACTIONS } from '../../types';
import { h, fmtInt, signed } from '../dom';
import { ACTION_COPY, GROUP_TITLES, type ActionGroup } from '../action-copy';
import { getParam } from './sourced';

const pcOf = (id: string): string => { const v = getParam(id)?.value ?? 0; return v > 0 ? `+${v}` : String(v); };
const mOf = (id: string): number => getParam(id)?.value ?? 0;

export interface ActionMenuController {
  element: HTMLElement;
  selectedActions(): Action[];
}

const ORDER: ActionId[] = [
  'call_out_reserve',
  'recall_ex_regular',
  'trace_strategic_reserve',
  'stop_loss',
  'introduce_bill',
  'amend_bill',
  'set_callup',
  'expand_capacity',
  'compress_syllabus',
  'contract_civilian_instructors',
  'equipment_buy',
  'junior_entry',
  'address_nation',
  'raise_spending',
  'blame_predecessors',
];

export function renderActionMenu(state: GameState, availability: ActionAvailability[], onChange: () => void): ActionMenuController {
  const maxActions = getParam('actions_per_turn')?.value ?? 2;
  const avail = new Map(availability.map((a) => [a.id, a]));
  const selected = new Set<ActionId>();
  const optionState: Partial<{
    notice: ReserveNotice;
    procedure: BillProcedure;
    clauses: BillClauses;
    callup: number;
  }> = { notice: 180, procedure: 'emergency', clauses: { ...state.clauses }, callup: state.callupPerMonth };

  const counter = h('span', { class: 'muted small', 'aria-live': 'polite' });
  const updateCounter = () => {
    const used = [...selected].filter((id) => !FREE_ACTIONS.has(id)).length;
    counter.textContent = `${used} of ${maxActions} actions chosen`;
    // Disable unselected non-free checkboxes when the quota is used.
    root.querySelectorAll<HTMLInputElement>('input[type=checkbox][data-action]').forEach((cb) => {
      const id = cb.dataset.action as ActionId;
      if (FREE_ACTIONS.has(id)) return;
      const a = avail.get(id);
      cb.disabled = !a?.available || (!cb.checked && used >= maxActions);
    });
    onChange();
  };

  const groups: Record<ActionGroup, HTMLElement> = {
    reserves: h('div', { class: 'action-group' }, h('h4', {}, GROUP_TITLES.reserves)),
    conscription: h('div', { class: 'action-group' }, h('h4', {}, GROUP_TITLES.conscription)),
    pipeline: h('div', { class: 'action-group' }, h('h4', {}, GROUP_TITLES.pipeline)),
    political: h('div', { class: 'action-group' }, h('h4', {}, GROUP_TITLES.political)),
  };

  for (const id of ORDER) {
    const a = avail.get(id);
    if (!a) continue;
    const copy = ACTION_COPY[id];
    // Hide one-shots that are exhausted and free controls that are not yet unlocked.
    if (a.exhausted && id !== 'set_callup') {
      groups[copy.group].append(exhaustedRow(id, a));
      continue;
    }
    if (id === 'set_callup' && state.billStatus !== 'passed') continue;
    if (id === 'amend_bill' && state.billStatus === 'none') continue;
    groups[copy.group].append(actionRow(id, a));
  }

  const root = h('section', { class: 'actions', 'aria-label': 'Decisions' }, h('div', { class: 'actions-head' }, h('h2', {}, 'Decisions'), counter), groups.reserves, groups.conscription, groups.pipeline, groups.political);
  updateCounter();

  function exhaustedRow(id: ActionId, a: ActionAvailability): HTMLElement {
    return h('div', { class: 'action unavailable' }, h('div', { class: 'action-body' }, h('div', { class: 'action-title' }, ACTION_COPY[id].title, h('span', { class: 'action-pc' }, 'Done')), h('div', { class: 'action-desc' }, a.reason ?? '')));
  }

  function actionRow(id: ActionId, a: ActionAvailability): HTMLElement {
    const copy = ACTION_COPY[id];
    const isFree = FREE_ACTIONS.has(id);
    const cb = h('input', { type: 'checkbox', id: `act-${id}`, 'data-action': id, disabled: !a.available }) as HTMLInputElement;
    const row = h('div', { class: `action${a.available ? '' : ' unavailable'}` });
    const options = optionsFor(id);
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(id);
      else selected.delete(id);
      row.classList.toggle('selected', cb.checked);
      if (options) options.hidden = !cb.checked;
      updateCounter();
    });
    const pcText = isFree ? 'free' : id === 'introduce_bill' ? `${pcOf('pc_cost_bill_emergency')} to ${pcOf('pc_cost_bill_normal')} PC` : a.pcDelta === 0 ? '0 PC' : `${signed(a.pcDelta)} PC`;
    row.append(
      cb,
      h(
        'div',
        { class: 'action-body' },
        h('label', { for: `act-${id}`, class: 'action-title' }, copy.title, h('span', { class: 'action-pc' }, pcText)),
        h('div', { class: 'action-desc', html: copy.html }),
        a.reason && !a.exhausted ? h('div', { class: 'action-reason' }, a.reason) : null,
        options,
      ),
    );
    if (options) options.hidden = true;
    return row;
  }

  function optionsFor(id: ActionId): HTMLElement | null {
    const sel = <T extends string>(label: string, name: string, value: T, opts: [T, string][], onchange: (v: T) => void) => {
      const s = h('select', { 'aria-label': label, id: `opt-${id}-${name}` }) as HTMLSelectElement;
      for (const [v, l] of opts) s.append(h('option', { value: v, selected: v === value }, l));
      s.addEventListener('change', () => onchange(s.value as T));
      return h('span', { class: 'field' }, h('label', { for: `opt-${id}-${name}` }, label), s);
    };
    const clauseFields = (clauses: BillClauses, onchange: (c: BillClauses) => void) => [
      sel<AgeBand>('Age band', 'age', clauses.ageBand, [['18-25', '18–25'], ['18-30', '18–30'], ['18-40', '18–40'], ['18-65', '18–65']], (v) => onchange({ ...clauses, ageBand: (clauses.ageBand = v) })),
      sel<'yes' | 'no'>('Include women', 'women', clauses.includeWomen ? 'yes' : 'no', [['yes', 'Yes'], ['no', `No (${pcOf('pc_cost_exclude_women')} PC)`]], (v) => onchange({ ...clauses, includeWomen: (clauses.includeWomen = v === 'yes') })),
      sel<MedicalStandard>('Medical standard', 'medical', clauses.medical, [['peacetime', 'Peacetime'], ['relaxed', `Relaxed (${pcOf('pc_cost_medical_relaxed')} PC)`], ['wartime', `Wartime (${pcOf('pc_cost_medical_wartime')} PC)`]], (v) => onchange({ ...clauses, medical: (clauses.medical = v) })),
      sel<ExemptionRegime>('Exemptions', 'exempt', clauses.exemptions, [['strict', 'Strict (reserved occupations)'], ['broad', 'Broad (students, carers, key workers)'], ['minimal', `Minimal (${pcOf('pc_cost_exemptions_minimal')} PC)`]], (v) => onchange({ ...clauses, exemptions: (clauses.exemptions = v) })),
    ];
    switch (id) {
      case 'call_out_reserve':
        return h('div', { class: 'action-options' }, sel<'180' | '90'>('Notice period', 'notice', '180', [['180', `180 days (arrive in ${mOf('reserve_arrival_months_default')} months)`], ['90', `90 days, legislate (${pcOf('pc_cost_ninety_day_notice')} PC more, ${mOf('reserve_arrival_months_amended')} months)`]], (v) => (optionState.notice = Number(v) as ReserveNotice)));
      case 'introduce_bill':
        return h(
          'div',
          { class: 'action-options' },
          sel<BillProcedure>('Procedure', 'proc', 'emergency', [['emergency', `Emergency (${mOf('bill_months_emergency')} months, ${pcOf('pc_cost_bill_emergency')} PC)`], ['normal', `Normal (${mOf('bill_months_normal')} months, ${pcOf('pc_cost_bill_normal')} PC)`]], (v) => (optionState.procedure = v)),
          ...clauseFields(optionState.clauses!, (c) => (optionState.clauses = c)),
        );
      case 'amend_bill':
        return h('div', { class: 'action-options' }, ...clauseFields(optionState.clauses!, (c) => (optionState.clauses = c)));
      case 'set_callup': {
        const input = h('input', { type: 'number', min: 0, step: 500, value: String(Math.round(state.callupPerMonth)), id: `opt-${id}-n`, 'aria-label': 'Conscripts called per month' }) as HTMLInputElement;
        input.addEventListener('input', () => (optionState.callup = Math.max(0, Number(input.value) || 0)));
        return h('div', { class: 'action-options' }, h('span', { class: 'field' }, h('label', { for: `opt-${id}-n` }, `Per month (eligible pool ${fmtInt(state.pools.conscriptEligible)})`), input));
      }
      default:
        return null;
    }
  }

  return {
    element: root,
    selectedActions(): Action[] {
      const out: Action[] = [];
      for (const id of selected) {
        switch (id) {
          case 'call_out_reserve':
            out.push({ id, notice: optionState.notice ?? 180 });
            break;
          case 'introduce_bill':
            out.push({ id, procedure: optionState.procedure ?? 'emergency', clauses: { ...optionState.clauses! } });
            break;
          case 'amend_bill':
            out.push({ id, clauses: { ...optionState.clauses! } });
            break;
          case 'set_callup':
            out.push({ id, perMonth: optionState.callup ?? 0 });
            break;
          default:
            out.push({ id } as Action);
        }
      }
      return out;
    },
  };
}
