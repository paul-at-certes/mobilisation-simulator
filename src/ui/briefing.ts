/**
 * briefing.ts — the Permanent Secretary's monthly note.
 *
 * `briefingText(state, facts)` returns two to four sentences, generated from
 * templates. Phrasing varies deterministically with the seed and the turn
 * number so that a replay from `?seed=` reads identically. No DOM access, no
 * use of the global random generator. Every number quoted from the parameter table comes through
 * `P`, never inlined.
 */
import type { BriefingFacts, GameState } from '../types.js';
import { type ParamId, P } from '../sim/params.js';

// Sourced helpers: every parameter-based number in a briefing carries its popover.
import { sourcedHtml } from './components/sourced';
function sv(id: ParamId): string {
  return sourcedHtml(formatInt(P[id]), id);
}
function svPct(id: ParamId): string {
  return sourcedHtml(formatPct(P[id]), id);
}
function svRatioPct(id: ParamId): string {
  return sourcedHtml(formatPct(P[id] * 100), id);
}

// ---------------------------------------------------------------------------
// Formatting helpers (shared with other UI modules)
// ---------------------------------------------------------------------------

/** 70951 → "70,951". Rounds to the nearest integer. */
export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const r = Math.round(n);
  const sign = r < 0 ? '−' : '';
  return sign + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A sum in pounds → "£12.3bn", or "£85m" below a billion. */
export function formatGbpBn(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs < 1e9) return `${sign}£${Math.round(abs / 1e6)}m`;
  if (abs < 100e9) return `${sign}£${(abs / 1e9).toFixed(1)}bn`;
  return `${sign}£${Math.round(abs / 1e9)}bn`;
}

/** A percentage number (43.2) → "43%". */
export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return 'n/a';
  return `${Math.round(n)}%`;
}

// ---------------------------------------------------------------------------
// Deterministic variety
// ---------------------------------------------------------------------------

/** Small integer hash of (seed, turn, salt); stable across runs. */
function hash(state: GameState, salt: number): number {
  let h = (state.seed >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (state.turn + 1), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (salt + 1), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function pick<T>(state: GameState, salt: number, options: readonly T[]): T {
  return options[hash(state, salt) % options.length];
}

/** Rotate a list by a deterministic offset so different months lead with different facts. */
function rotate<T>(state: GameState, salt: number, list: T[]): T[] {
  if (list.length < 2) return list;
  const k = hash(state, salt) % list.length;
  return list.slice(k).concat(list.slice(0, k));
}

function lowerFirst(s: string): string {
  if (/^(Army|Ex-|Strategic|NHS|Treasury|Phase|Chancellor|High Court|MoD|Prime|Parliament)/.test(s)) return s;
  return s.length ? s[0].toLowerCase() + s.slice(1) : s;
}

function months(n: number): string {
  const m = Math.max(0, Math.round(n));
  if (m === 0) return 'this month';
  if (m === 1) return 'next month';
  return `in ${m} months`;
}

function formationLabel(state: GameState): string {
  switch (state.difficulty) {
    case 'brigade':
      return 'a deployable brigade';
    case 'division':
      return 'a deployable division';
    case 'corps':
      return 'a corps';
  }
}

function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${formatInt(r)}`;
}

// ---------------------------------------------------------------------------
// The note
// ---------------------------------------------------------------------------

export function briefingText(state: GameState, facts: BriefingFacts): string[] {
  if (state.turn === 0) return openingNote(state);
  if (state.over || state.turn >= state.deadlineMonths) return finalNote(state);
  return monthlyNote(state, facts);
}

function openingNote(state: GameState): string[] {
  const target = sourcedHtml(formatInt(state.target), `target_${state.difficulty}`);
  const deadline = sourcedHtml(String(state.deadlineMonths), `deadline_${state.difficulty}`);
  const formation = formationLabel(state);

  const premise = pick(state, 1, [
    `Article 5 was invoked overnight. The Chief of the Defence Staff has told the Prime Minister that the United Kingdom's contribution must be ${formation}: ${target} effective soldiers with their enablers, ready to move in ${deadline} months.`,
    `A NATO ally has been attacked and Article 5 has been invoked. The Chief of the Defence Staff's advice to the Prime Minister is that the United Kingdom must field ${formation} of ${target} effective soldiers within ${deadline} months.`,
  ]);

  const strength = pick(state, 2, [
    `The Army's trade-trained strength this morning is ${sv('regular_trained_start')}; the training system produces ${sv('regular_gains_annual')} soldiers a year and loses ${sv('regular_voluntary_outflow_annual')} to voluntary outflow.`,
    `For reference: ${sv('regular_trained_start')} trade-trained regulars, a pipeline that graduates ${sv('regular_gains_annual')} a year, and ${sv('regular_voluntary_outflow_annual')} a year leaving of their own accord.`,
  ]);

  const point = pick(state, 3, [
    'Headcount is not the score. Trained, led and equipped soldiers are the score, and they take time.',
    'The score counts soldiers rather than bodies, and the difference between the two is the training estate and the sergeants to run it.',
  ]);

  const close = pick(state, 4, [
    `You may take ${sv('actions_per_turn')} actions a month. The Prime Minister has asked you to make it happen.`,
    `You have ${sv('actions_per_turn')} actions a month, and the Prime Minister's confidence for as long as the figures hold.`,
  ]);

  return [premise, strength, point, close];
}

function finalNote(state: GameState): string[] {
  const g = state.gauges;
  const out: string[] = [];
  const resigned = state.overReason === 'resigned';

  if (resigned) {
    out.push(
      pick(state, 11, [
        `The Prime Minister accepted your resignation in month ${state.turn}.`,
        `Month ${state.turn}. Political capital is exhausted and the Prime Minister has accepted your resignation.`,
      ]),
    );
  } else {
    out.push(
      pick(state, 11, [
        `Month ${state.turn}: the deadline has arrived.`,
        `Month ${state.turn}, the date agreed with the ally.`,
      ]),
    );
  }

  out.push(
    `Force Ready stands at ${formatInt(g.forceReady)} against a target of ${formatInt(state.target)} (${formatPct(g.forceReadyPct)}), at quality ${g.forceQuality.toFixed(2)} from ${formatInt(g.headcountCounted)} personnel counted.`,
  );

  out.push(
    pick(state, 12, [
      `The Treasury has spent ${formatGbpBn(state.ledger.cumulativeCost)} and the economy has forgone ${formatGbpBn(state.ledger.cumulativeGdpLoss)} of output.`,
      `Cumulative cost to the Treasury is ${formatGbpBn(state.ledger.cumulativeCost)}; lost output is ${formatGbpBn(state.ledger.cumulativeGdpLoss)}.`,
    ]),
  );

  out.push("The general's assessment follows.");
  return out;
}

function monthlyNote(state: GameState, facts: BriefingFacts): string[] {
  const g = state.gauges;
  const turn = state.turn;
  const remaining = state.deadlineMonths - turn;
  const ese = formatInt(g.forceReady);
  const target = formatInt(state.target);
  const pct = formatPct(g.forceReadyPct);
  const quality = g.forceQuality.toFixed(2);
  const pc = formatInt(g.politicalCapital);

  const status = pick(state, 21, [
    `Month ${turn} of ${state.deadlineMonths}: Force Ready ${ese} of ${target} (${pct}), quality ${quality}, political capital ${pc}.`,
    `Month ${turn}. Force Ready stands at ${ese} against ${target} (${pct}); quality ${quality}; political capital ${pc}.`,
    `${remaining} ${remaining === 1 ? 'month remains' : 'months remain'}. Force Ready ${ese} of ${target} (${pct}), quality ${quality}, political capital ${pc}.`,
  ]);

  const urgent: string[] = [];
  const changes: string[] = [];
  const colour: string[] = [];

  const conscriptsCounted =
    state.pools.conscriptInTraining + state.pools.conscriptTrainedUnequipped + state.pools.conscriptTrainedEquipped;

  // --- Urgent -------------------------------------------------------------
  const lf = facts.leadershipFactor;
  if (conscriptsCounted > 0 && lf < 0.6) {
    urgent.push(
      pick(state, 22, [
        `Leadership factor ${lf.toFixed(2)}: the conscript force has barely half the junior leaders it needs, and every conscript cohort is discounted accordingly.`,
        `The leadership factor has fallen to ${lf.toFixed(2)}; there are not enough corporals and sergeants to lead the conscripts, and their effectiveness is scaled down to match.`,
      ]),
    );
  } else if (conscriptsCounted > 0 && lf < 0.9) {
    urgent.push(
      pick(state, 22, [
        `Leadership factor ${lf.toFixed(2)}: the junior leadership cadre is stretched and every conscript cohort counts for less than it would.`,
        `The junior leaders are spread thin (leadership factor ${lf.toFixed(2)}); the conscript cohorts are discounted accordingly.`,
      ]),
    );
  }

  const idle = Number.isFinite(state.idleMonths) ? state.idleMonths : 0;
  if (idle > P.pc_idle_grace_months) {
    urgent.push(
      pick(state, 24, [
        `${formatInt(idle)} months have now passed without a decision from this Department. The lobby has begun writing that the Government has no plan, and the polling follows the lobby: ${formatInt(P.pc_idle_penalty)} political capital a month for as long as it lasts.`,
        `No lever has been pulled here for ${formatInt(idle)} months. The charge is not that the policy is wrong but that there is no policy, and it costs ${formatInt(P.pc_idle_penalty)} political capital a month until something is done.`,
      ]),
    );
  } else if (idle === P.pc_idle_grace_months) {
    urgent.push(
      pick(state, 25, [
        'Two months have passed without a decision from this Department. A third will be noticed outside it.',
        'Nothing has been decided here for two months. The Lobby has started to ask what the Department is for.',
      ]),
    );
  }

  if (facts.pcDelta <= -5) {
    const reasons = [...facts.pcReasons]
      .filter((r) => r.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 2)
      .map((r) => `${lowerFirst(r.label)} (${signed(r.delta)})`);
    const why = reasons.length ? `: ${reasons.join(', ')}` : '';
    urgent.push(`Political capital fell by ${formatInt(-facts.pcDelta)} this month${why}.`);
  }

  if (facts.holdingPoolDelta > 0 && state.pools.holdingPool > 0) {
    urgent.push(
      pick(state, 23, [
        `The holding pool grew by ${formatInt(facts.holdingPoolDelta)} to ${formatInt(state.pools.holdingPool)}: called up, paid, untrained and producing nothing.`,
        `${formatInt(facts.holdingPoolDelta)} more conscripts joined the holding pool this month, which now stands at ${formatInt(state.pools.holdingPool)}; they are paid and they are idle.`,
      ]),
    );
  }

  // --- Changes ------------------------------------------------------------
  const arrivals = facts.arrivals.filter((a) => a.count > 0);
  const grads = facts.graduations;
  if (arrivals.length || grads > 0) {
    const parts = arrivals.map((a) => `${formatInt(a.count)} ${lowerFirst(a.label)}`);
    if (grads > 0) parts.push(`${formatInt(grads)} conscripts completed training`);
    const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
    const verb = arrivals.length ? (grads > 0 ? '' : ' arrived') : '';
    changes.push(pick(state, 24, [`This month ${joined}${verb}.`, `Arrivals this month: ${joined}${verb}.`]));
  }

  if (facts.forceReadyDelta >= P.pc_momentum_threshold * state.target) {
    changes.push(`Force Ready rose by ${formatInt(facts.forceReadyDelta)}. Number Ten is calling it momentum.`);
  }

  const unequipped = state.pools.conscriptTrainedUnequipped;
  const equipmentDue = state.equipmentArrivalMonth;
  if (unequipped > 0 && (equipmentDue === null || equipmentDue > turn)) {
    if (state.equipmentOrdered && equipmentDue !== null) {
      changes.push(
        `${formatInt(unequipped)} trained conscripts are waiting on the equipment order, due ${months(equipmentDue - turn)}; until then each counts at ${svRatioPct('eff_conscript_unequipped')} of a soldier.`,
      );
    } else {
      changes.push(
        `${formatInt(unequipped)} trained conscripts have no personal equipment and no order has been placed; each counts at ${svRatioPct('eff_conscript_unequipped')} of a soldier.`,
      );
    }
  }

  if (state.billStatus === 'in_progress' && state.billPassesMonth !== null) {
    const m = state.billPassesMonth - turn;
    changes.push(
      m <= 1
        ? 'The National Service Bill receives Royal Assent next month.'
        : `The National Service Bill has ${m} months to run before it can be used.`,
    );
  } else if (state.billStatus === 'passed' && state.billPassesMonth === turn) {
    changes.push('The National Service Bill received Royal Assent this month; a monthly call-up may now be set.');
  } else if (state.billStatus === 'passed' && state.callupPerMonth === 0 && !state.conscriptionEverActive) {
    changes.push('The Act is in force and no call-up has been set.');
  }

  if (facts.holdingPoolDelta < 0) {
    changes.push(`The holding pool fell by ${formatInt(-facts.holdingPoolDelta)} as training places opened.`);
  }

  const pending = state.reserveArrivals.filter((a) => a.arrivalMonth > turn && a.size > 0);
  if (pending.length) {
    const soonest = pending.reduce((a, b) => (a.arrivalMonth <= b.arrivalMonth ? a : b));
    changes.push(`The Army Reserve call-out delivers ${formatInt(soonest.size)} reservists ${months(soonest.arrivalMonth - turn)}.`);
  }

  if (state.exRegularRecallActive && turn < state.exRegularRecallMonth + P.ex_regular_delay_months) {
    changes.push(
      `Ex-regular recall notices are out; the first reports are expected ${months(state.exRegularRecallMonth + P.ex_regular_delay_months - turn)}.`,
    );
  }

  if (state.strategicTraceMonth !== null && !state.strategicTraceDone) {
    changes.push(`The Strategic Reserve trace reports ${months(state.strategicTraceMonth - turn)}.`);
  }

  if (facts.pcDelta >= 3) {
    const best = [...facts.pcReasons].filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta)[0];
    changes.push(
      best
        ? `Political capital rose by ${formatInt(facts.pcDelta)}, chiefly ${lowerFirst(best.label)}.`
        : `Political capital rose by ${formatInt(facts.pcDelta)}.`,
    );
  }

  // --- Colour -------------------------------------------------------------
  if (facts.outflow > 0 && !state.stopLoss) {
    colour.push(
      pick(state, 25, [
        `${formatInt(facts.outflow)} trained regulars left voluntarily this month; nobody is obliged to stay.`,
        `Voluntary outflow took ${formatInt(facts.outflow)} trained regulars this month, as it does every month.`,
        `The bathtub continues to drain: ${formatInt(facts.outflow)} trained regulars left of their own accord.`,
      ]),
    );
  }

  if (state.conscriptionEverActive && state.willingness < P.willingness_low_threshold_pct) {
    colour.push(
      `Willingness to serve stands at ${formatPct(state.willingness)}; below ${svPct('willingness_low_threshold_pct')} the refusal cases keep coming.`,
    );
  }

  if (state.juniorEntryTaken && facts.notes.some((n) => /junior/i.test(n))) {
    colour.push(
      `Junior entry has been reopened. Its first recruits reach deployable age in ${sv('junior_entry_lead_months')} months, and ${svRatioPct('junior_entry_attrition')} of them will not complete. Nothing from it arrives before the deadline.`,
    );
  }

  if (turn % 3 === 0) {
    colour.push(
      `Cumulative Treasury cost is ${formatGbpBn(state.ledger.cumulativeCost)}; lost output ${formatGbpBn(state.ledger.cumulativeGdpLoss)}.`,
    );
  }

  const body = [...urgent.slice(0, 2), ...rotate(state, 26, changes), ...rotate(state, 27, colour)];
  const out = [status, ...body].slice(0, 4);
  if (out.length < 2) {
    out.push(
      pick(state, 28, [
        'Nothing changed this month that will show in the figures.',
        'No arrivals, no graduations, no news; the deadline is a month closer.',
      ]),
    );
  }
  return out;
}
