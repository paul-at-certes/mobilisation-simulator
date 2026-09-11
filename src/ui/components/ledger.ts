/** Collapsible ledger: money, GDP, headcount by category, outflow. */
import type { GameState } from '../../types';
import { h, fmtInt, fmtBn, fmtPct } from '../dom';
import { sourced, getParam } from './sourced';

export function renderLedger(state: GameState, open = false): HTMLElement {
  const L = state.ledger;
  const p = state.pools;
  const gdp = getParam('uk_gdp_2025')?.value ?? 1;
  const budget = getParam('defence_budget_2025')?.value ?? 1;
  const inTraining = state.trainingCohorts.reduce((a, c) => a + c.size, 0);
  const trainedUneq = state.trainedCohorts.filter((c) => !c.equipped).reduce((a, c) => a + c.size, 0);
  const trainedEq = state.trainedCohorts.filter((c) => c.equipped).reduce((a, c) => a + c.size, 0);

  const row = (k: Node | string | (Node | string)[], v: string, neg = false) => [h('dt', {}, ...(Array.isArray(k) ? k : [k])), h('dd', { class: neg ? 'neg' : '' }, v)];

  const body = h(
    'div',
    { class: 'ledger-body' },
    h('h4', { class: 'small muted' }, 'Money'),
    h(
      'dl',
      { class: 'kv' },
      ...row('Treasury cost, cumulative (incremental)', fmtBn(L.cumulativeCost)),
      ...row(['of the 2025/26 defence budget of ', sourced(fmtBn(budget), 'defence_budget_2025')], fmtPct((L.cumulativeCost / budget) * 100)),
      ...row('This month', fmtBn(L.monthlyCost)),
      ...row('GDP output lost, cumulative', fmtBn(L.cumulativeGdpLoss)),
      ...row(['of 2025 GDP of ', sourced(fmtBn(gdp), 'uk_gdp_2025')], fmtPct((L.cumulativeGdpLoss / gdp) * 100, 2)),
      ...row('Regular pay (paid anyway, not counted)', fmtBn(L.costBreakdown.regularPay) + '/month'),
    ),
    h('h4', { class: 'small muted' }, 'Headcount'),
    h(
      'dl',
      { class: 'kv' },
      ...row('Regular, trade-trained', fmtInt(p.regularTrained)),
      ...row(['of which counted (', sourced(`${Math.round((getParam('regular_deployable_fraction')?.value ?? 0) * 100)}%`, 'regular_deployable_fraction'), ' deployable slice)'], fmtInt(state.composition.regulars.headcount)),
      ...row('Regular, untrained', fmtInt(p.regularUntrained)),
      ...row('Volunteer reservists mobilised', fmtInt(p.reserveVolunteerMobilised) + (p.reserveVolunteerPending > 0 ? ` (+${fmtInt(p.reserveVolunteerPending)} pending)` : '')),
      ...row('Ex-regulars reported', fmtInt(p.exRegularReported)),
      ...row('Strategic Reserve traced', fmtInt(p.strategicTraced)),
      ...row('Conscripts, holding pool', fmtInt(p.holdingPool), p.holdingPool > 0),
      ...row('Conscripts in training', fmtInt(inTraining)),
      ...row('Conscripts trained, unequipped', fmtInt(trainedUneq), trainedUneq > 0),
      ...row('Conscripts trained, equipped', fmtInt(trainedEq)),
      ...row('Conscripts called to date', fmtInt(state.conscriptsCalledTotal)),
    ),
    h('h4', { class: 'small muted' }, 'The bathtub'),
    h(
      'dl',
      { class: 'kv' },
      ...row(['Voluntary outflow to date (', sourced(fmtInt(getParam('regular_voluntary_outflow_annual')?.value ?? 0), 'regular_voluntary_outflow_annual'), '/yr', state.stopLoss ? ', stopped' : '', ')'], fmtInt(L.regularOutflowToDate), L.regularOutflowToDate > 0 && !state.stopLoss),
      ...row('Junior leaders lost to outflow', fmtInt(L.juniorLeadersLostToOutflow), L.juniorLeadersLostToOutflow > 0),
      ...row('Junior leaders diverted to training', fmtInt(L.juniorLeadersDiverted), L.juniorLeadersDiverted > 0),
      ...row('Leadership factor', state.gauges.leadershipFactor.toFixed(2), state.gauges.leadershipFactor < 1),
      ...row('Months elapsed', `${state.turn} of ${state.deadlineMonths}`),
    ),
  );

  const details = h('details', { class: 'ledger', open }, h('summary', {}, h('span', {}, 'Ledger'), h('span', { class: 'muted small' }, `${fmtBn(L.cumulativeCost)} · GDP ${fmtBn(L.cumulativeGdpLoss)}`)), body);
  return details;
}
