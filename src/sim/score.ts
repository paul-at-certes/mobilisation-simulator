/**
 * score.ts — end-of-game scoring and the verdict (spec §11).
 *
 * Verdict templates come from src/data/verdicts.json through the content
 * registry; if none match (or the file is absent) a generic verdict is used.
 */
import type { GameState, LeadershipBand, QualityBand, Score, Verdict, VerdictVars } from '../types.js';
import { P } from './params.js';
import { getVerdicts } from './content.js';
import { computeForce } from './effectiveness.js';

export function qualityBand(q: number): QualityBand {
  if (q < 0.45) return 'low';
  if (q <= 0.65) return 'mid';
  return 'high';
}

export function leadershipBand(lf: number): LeadershipBand {
  if (lf < 0.6) return 'broken';
  if (lf <= 0.9) return 'strained';
  return 'intact';
}

/** Thousands separators without relying on the runtime locale. */
export function formatInt(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatVar(key: keyof VerdictVars, value: number): string {
  if (key === 'quality' || key === 'leadership') return value.toFixed(2);
  if (key === 'costBn' || key === 'gdpLossBn') return value.toFixed(1);
  return formatInt(value);
}

export function fillTemplate(template: string, vars: VerdictVars): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return formatVar(key as keyof VerdictVars, vars[key as keyof VerdictVars]);
    return m;
  });
}

const GENERIC_VERDICT: Verdict = {
  id: 'generic',
  met: 'any',
  quality: 'any',
  leadership: 'any',
  text:
    'You fielded {headcount} people and {ese} soldiers’ worth of fighting power against a target of {target}, in {months} months, at £{costBn}bn to the Treasury and £{gdpLossBn}bn of lost output.',
  oneLiner: '{ese} of {target} soldiers’ worth in {months} months.',
};

export function pickVerdict(met: boolean, quality: QualityBand, leadership: LeadershipBand, resigned: boolean): Verdict {
  for (const v of getVerdicts()) {
    if (v.met !== 'any' && v.met !== met) continue;
    if (v.quality !== 'any' && v.quality !== quality) continue;
    if (v.leadership !== 'any' && v.leadership !== leadership) continue;
    if (v.resigned != null && v.resigned !== resigned) continue;
    return v;
  }
  return GENERIC_VERDICT;
}

export function score(state: GameState): Score {
  const f = computeForce(state);
  const met = f.forceReady >= state.target;
  // A broken promise (scoring_pc_if_missed) lowers PC in the score only; if it
  // takes PC below zero the minister is treated as having resigned.
  const pcAtScore = state.politicalCapital + (met ? 0 : state.scoringPcIfMissed);
  const resigned = state.overReason === 'resigned' || pcAtScore < 0;
  const qBand = qualityBand(f.forceQuality);
  const lBand = leadershipBand(f.leadershipFactor);
  const cost = state.ledger.cumulativeCost;
  const gdpLoss = state.ledger.cumulativeGdpLoss;
  const shortfall = Math.max(0, state.target - f.forceReady);
  const vars: VerdictVars = {
    target: state.target,
    ese: f.forceReady,
    headcount: f.headcountCounted,
    months: state.turn,
    quality: f.forceQuality,
    leadership: f.leadershipFactor,
    costBn: cost / 1e9,
    gdpLossBn: gdpLoss / 1e9,
    conscripts: f.composition.conscripts.headcount,
    reservists: f.composition.reservists.headcount + f.composition.exRegulars.headcount + f.composition.strategic.headcount,
    regulars: f.composition.regulars.headcount,
    shortfall,
    surplus: Math.max(0, f.forceReady - state.target),
  };
  const verdict = pickVerdict(met, qBand, lBand, resigned);
  return {
    met,
    resigned,
    target: state.target,
    ese: f.forceReady,
    headcount: f.headcountCounted,
    shortfall,
    months: state.turn,
    quality: f.forceQuality,
    qualityBand: qBand,
    leadership: f.leadershipFactor,
    leadershipBand: lBand,
    composition: f.composition,
    cost,
    costPctDefenceBudget: (cost / P.defence_budget_2025) * 100,
    gdpLoss,
    gdpLossPctGdp: (gdpLoss / P.uk_gdp_2025) * 100,
    refused: state.conscriptsRefusedTotal,
    refusalBacklog: Number.isFinite(state.refusalCaseload) ? state.refusalCaseload : 0,
    verdictId: verdict.id,
    verdictText: fillTemplate(verdict.text, vars),
    verdictOneLiner: fillTemplate(verdict.oneLiner, vars),
    seedUrl: `?seed=${state.seed}&difficulty=${state.difficulty}`,
  };
}
