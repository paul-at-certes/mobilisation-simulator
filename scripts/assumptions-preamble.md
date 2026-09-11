## Structural assumptions

These are modelling choices rather than single numbers. Each is visible to the
player through the methodology page and, where a number is involved, through
the source popover on that number.

1. **Only a slice of the regular Army counts toward Force Ready.** The premise
   is that the new formation is raised on top of the standing Army's existing
   commitments. `regular_deployable_fraction` (default 10%, range 5–25%) of
   the trade-trained strength is counted at effectiveness 1.0. The whole
   regular Army is still paid, still drains through voluntary outflow, and
   still supplies the junior leaders.

2. **Junior leaders are the binding constraint.** The cadre is Corporals to
   Staff Sergeants plus Second Lieutenants to Captains (29,563 at 1 April
   2026). Only a spareable fraction (default 30%) can be taken out of regular
   units. Each +5,000/yr block of training capacity diverts 625 of them as
   instructors; every eight conscripts in training or fielded need one more.
   When demand exceeds supply the leadership factor falls below 1 and scales
   the effectiveness of every conscript bucket. Reservists and ex-regulars
   bring their own rank structure and are not scaled.

3. **The training estate is one estate.** Regular recruiting continues at its
   2025/26 rate and uses the baseline pipeline first. Conscripts can only use
   spare capacity. At baseline there is almost none.

4. **Effectiveness multipliers are assumptions, not measurements.** They are
   ordinal judgements (a recalled ex-regular is worth less than a serving
   reservist, who is worth less than a serving regular) with plausible
   ranges. The literature on quantifying combat effectiveness is contested:
   Dupuy's multipliers (Numbers, Predictions and War, 1979) are the
   best-known attempt; Biddle (Military Power, 2004) argues that force
   employment, not headcount or equipment, explains outcomes; Brown (British
   Logistics on the Western Front, 1998) shows how far logistics rather than
   manpower governed what a force could do. The game uses multipliers because
   a game needs a score, not because the numbers are known.

5. **Reservist turnout is discounted.** The trained Army Reserve counts
   everyone who has completed Phase 1, including those already mobilised or
   on full-time service. A deployable fraction (default 60%) is applied.
   Ex-regulars report geometrically after a delay, up to a ceiling (default
   50% of the tracked pool). The untracked Strategic Reserve yields a random
   20–50% on tracing, of whom half report.

6. **Treasury cost is incremental.** The regular Army's pay is recorded in
   the ledger for information but excluded from the cumulative cost that
   feeds political capital, because it is spent whether or not the player
   does anything.

7. **GDP loss uses the labour share of output**, not gross output per
   worker, on the argument that a conscript's employer loses the value of
   their labour rather than the whole of the output they were associated
   with. The gross figure (£88,800) is shown as the alternative in the
   popover.

8. **Political capital is a game abstraction.** Its starting value, drains,
   penalties and action costs are design choices in the ranges listed below.
   They were tuned so that a careless player resigns and a careful one does
   not; they measure nothing real.

9. **Deliberately ignored:** the Royal Navy and RAF; the equipment industrial
   base beyond personal kit; the training estate's physical capacity
   (accommodation, ranges); tooth-to-tail ratios and enablers; Scotland and
   Northern Ireland population detail (a scaling factor is used); women's
   role restrictions; officer generation; non-voluntary regular outflow
   (time expiry, medical discharge); pay increases and the 2027 pension-rate
   change.

10. **Verification status.** Figures the design brief attributed to sources
    that could not be located were re-sourced or replaced: the £49,000
    training cost became the verified £47,800 Phase 1 figure (Phase 2 cost
    excluded); the ~20-week Phase 2 average became an assumption with the
    published 15–27 week range; the £3.5–5k personal-equipment cost stays an
    assumption because neither cited source could be found; the £53,000
    labour-share output became the ONS-derived £51,100. Details in
    `docs/source-verification.md`.
