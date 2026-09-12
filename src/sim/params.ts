/**
 * params.ts — the single gateway to src/data/parameters.json.
 *
 * `P` is a typed map of parameter id → numeric value; `param(id)` returns the
 * full Parameter record (label, source, confidence …) for the UI popovers.
 * Nothing else in src/sim should read parameters.json directly, and no
 * simulation number should ever be inlined when it exists here.
 */
import paramsFile from '../data/parameters.json' with { type: 'json' };
import type { AgeBand, ExemptionRegime, MedicalStandard, Parameter, ParameterFile } from '../types.js';

export type ParamId = keyof typeof paramsFile.parameters;

export const PARAMETER_FILE: ParameterFile = paramsFile as unknown as ParameterFile;

/** Numeric value of every parameter, keyed by id. */
export const P: Readonly<Record<ParamId, number>> = Object.freeze(
  Object.fromEntries(
    Object.entries(paramsFile.parameters).map(([id, p]) => [id, (p as { value: number }).value]),
  ) as Record<ParamId, number>,
);

/** Full parameter record for popovers and the methodology page. */
export function param(id: ParamId): Parameter {
  return paramsFile.parameters[id] as unknown as Parameter;
}

export function isParamId(id: string): id is ParamId {
  return Object.prototype.hasOwnProperty.call(paramsFile.parameters, id);
}

// ---------------------------------------------------------------------------
// Typed accessors for the parameter families that are keyed by an enum value.
// ---------------------------------------------------------------------------

const BAND_SUFFIX: Record<AgeBand, string> = {
  '18-25': '18_25',
  '18-30': '18_30',
  '26-40': '26_40',
  '18-65': '18_65',
};

function lookup(id: string): number {
  if (!isParamId(id)) throw new Error(`Unknown parameter id: ${id}`);
  return P[id];
}

/** England and Wales population of the band (all sexes). */
export function ewPopulation(band: AgeBand): number {
  return lookup(`ew_pop_${BAND_SUFFIX[band]}`);
}

/** England and Wales female population of the band. */
export function ewPopulationFemale(band: AgeBand): number {
  return lookup(`ew_pop_f_${BAND_SUFFIX[band]}`);
}

/** Points added to public willingness by conscripting this band (spec §10a). */
export function conscriptionWillingnessAdj(band: AgeBand): number {
  return lookup(`conscription_willingness_adj_${BAND_SUFFIX[band]}`);
}

/**
 * Political capital charged for a Bill that conscripts this band, relative to
 * the default 18-30 (spec §3.1). The band is the one clause whose cost the
 * player cannot read off the poll: a wider or older band is *more* popular in
 * the abstract and harder to legislate, because it reaches into employment.
 */
export function ageBandClauseCost(band: AgeBand): number {
  return lookup(`pc_cost_band_${BAND_SUFFIX[band]}`);
}

/** Extra training attrition for conscripts raised under this band (spec §5). */
export function ageBandAttritionAdd(band: AgeBand): number {
  return lookup(`attrition_age_add_${BAND_SUFFIX[band]}`);
}

/** GDP output multiplier for the conscript age band. */
export function gdpAgeMultiplier(band: AgeBand): number {
  return lookup(`gdp_age_multiplier_${BAND_SUFFIX[band]}`);
}

/** Medical pass rate for a standard. */
export function medicalPassRate(standard: MedicalStandard): number {
  return lookup(`medical_pass_${standard}`);
}

/** Share of the pool exempted under a regime. */
export function exemptionShare(regime: ExemptionRegime): number {
  return lookup(`exemption_${regime}`);
}
