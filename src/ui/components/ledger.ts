/** Collapsible ledger: money, GDP, headcount by category, outflow. */
import type { GameState } from '../../types';
import { h } from '../dom';
import { sourced, getParam } from './sourced';
import { formatInt, gbpTabular, pctTabular } from '../../format';

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
      ...row('Treasury cost, cumulative (incremental)', gbpTabular(L.cumulativeCost)),
      ...row(['of the 2025/26 defence budget of ', sourced(gbpTabular(budget), 'defence_budget_2025')], pctTabular((L.cumulativeCost / budget) * 100)),
      ...row('This month', gbpTabular(L.monthlyCost)),
      ...row('GDP output lost, cumulative', gbpTabular(L.cumulativeGdpLoss)),
      ...row(['of 2025 GDP of ', sourced(gbpTabular(gdp), 'uk_gdp_2025')], pctTabular((L.cumulativeGdpLoss / gdp) * 100, 2)),
      ...row('Regular pay (paid anyway, not counted)', gbpTabular(L.costBreakdown.regularPay) + '/month'),
    ),
    h('h4', { class: 'small muted' }, 'Headcount'),
    h(
      'dl',
      { class: 'kv' },
      ...row('Regular, trade-trained', formatInt(p.regularTrained)),
      ...row(['of which counted (', sourced(`${Math.round((getParam('regular_deployable_fraction')?.value ?? 0) * 100)}%`, 'regular_deployable_fraction'), ' deployable slice)'], formatInt(state.composition.regulars.headcount)),
      ...row('Regular, untrained', formatInt(p.regularUntrained)),
      ...row('Volunteer reservists mobilised', formatInt(p.reserveVolunteerMobilised) + (p.reserveVolunteerPending > 0 ? ` (+${formatInt(p.reserveVolunteerPending)} pending)` : '')),
      ...row('Ex-regulars reported', formatInt(p.exRegularReported)),
      ...row('Strategic Reserve traced', formatInt(p.strategicTraced)),
      ...row('Conscripts, holding pool', formatInt(p.holdingPool), p.holdingPool > 0),
      ...row('Conscripts in training', formatInt(inTraining)),
      ...row('Conscripts trained, unequipped', formatInt(trainedUneq), trainedUneq > 0),
      ...row('Conscripts trained, equipped', formatInt(trainedEq)),
      ...row('Conscripts called to date', formatInt(state.conscriptsCalledTotal)),
    ),
    h('h4', { class: 'small muted' }, 'The bathtub'),
    h(
      'dl',
      { class: 'kv' },
      ...row(['Voluntary outflow to date (', sourced(formatInt(getParam('regular_voluntary_outflow_annual')?.value ?? 0), 'regular_voluntary_outflow_annual'), '/yr', state.stopLoss ? ', stopped' : '', ')'], formatInt(L.regularOutflowToDate), L.regularOutflowToDate > 0 && !state.stopLoss),
      ...row('Junior leaders lost to outflow', formatInt(L.juniorLeadersLostToOutflow), L.juniorLeadersLostToOutflow > 0),
      ...row('Junior leaders diverted to training', formatInt(L.juniorLeadersDiverted), L.juniorLeadersDiverted > 0),
      ...row('Leadership factor', state.gauges.leadershipFactor.toFixed(2), state.gauges.leadershipFactor < 1),
      ...row('Months elapsed', `${state.turn} of ${state.deadlineMonths}`),
    ),
  );

  const details = h('details', { class: 'ledger', open }, h('summary', {}, h('span', {}, 'Ledger'), h('span', { class: 'muted small' }, `${gbpTabular(L.cumulativeCost)} · GDP ${gbpTabular(L.cumulativeGdpLoss)}`)), body);
  return details;
}
