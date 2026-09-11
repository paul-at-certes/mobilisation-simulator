/**
 * outflow.ts — the bathtub's drain (spec §6a).
 *
 * The Army loses trade-trained soldiers every month to people choosing to
 * leave. Until this module the loss was a constant: `regular_voluntary_outflow_annual`
 * divided by twelve, the same number whatever the minister did, and nothing in
 * the event deck could touch it.
 *
 * It is now the product of two things that are measured separately:
 *
 *   intention   how many say they mean to go (AFCAS, 19% of the Army)
 *   conversion  how many of those actually go within the year (0.246)
 *
 * 70,951 x 19% x 0.246 / 12 = 276 a month, which is the figure the constant
 * carried — the split reproduces it rather than replacing it. What the split
 * buys is a lever: conversion is held fixed, because a minister cannot make
 * someone who wants to leave stay, and **intention** moves, because what a
 * minister does to Service life moves how many want to.
 */
import type { GameState } from '../types.js';
import { P } from './params.js';

/**
 * Current intention to leave, in points. Read through a helper so a game
 * saved before the field existed resumes at the survey baseline rather than
 * as NaN — the same guard `idleMonths` uses.
 */
export function outflowIntent(s: GameState): number {
  return Number.isFinite(s.outflowIntent) ? s.outflowIntent : P.regular_outflow_intent_pct;
}

/** Move intention, clamped to [0, outflow_intent_max_pct]. Returns the value after. */
export function addOutflowIntent(s: GameState, delta: number): number {
  s.outflowIntent = Math.min(P.outflow_intent_max_pct, Math.max(0, outflowIntent(s) + delta));
  return s.outflowIntent;
}

/**
 * Trade-trained regulars who leave this month.
 *
 * Proportional to the strength actually held, not a flat draw: the bathtub
 * drains more slowly as it empties, which is both truer and the reason a
 * do-nothing run flattens out rather than running to zero.
 *
 * Stop-loss does not stop it, it reduces it. Compulsion cannot reach medical
 * discharge, discharge on disciplinary grounds, or a commission the Crown
 * declines to extend — and because intention keeps rising while engagements
 * are held open (`stop_loss_intent_add_monthly`), what leaks grows month on
 * month. That is stop-loss's delayed cost, and it lands inside the run.
 */
export function monthlyOutflow(s: GameState): number {
  const annualRate = (outflowIntent(s) / 100) * P.regular_outflow_intent_conversion;
  const gross = (s.pools.regularTrained * annualRate) / 12;
  const net = s.stopLoss ? gross * P.stop_loss_leak_fraction : gross;
  return Math.max(0, Math.min(s.pools.regularTrained, net));
}
