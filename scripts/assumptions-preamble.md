## Structural assumptions

These are modelling choices rather than single numbers. Each is visible to the
player through the methodology page and, where a number is involved, through
the source popover on that number.

1. **Only a slice of the regular Army counts toward Force Ready.** The premise
   is that the new formation is raised on top of the standing Army's existing
   commitments. `regular_deployable_fraction` (default 5%, range 3–20%) of
   the trade-trained strength is counted at effectiveness 1.0. The whole
   regular Army is still paid, still drains through voluntary outflow, and
   still supplies the junior leaders.

2. **Junior leaders are the binding constraint.** The cadre is Corporals to
   Staff Sergeants plus Second Lieutenants to Captains (29,563 at 1 April
   2026). Only a spareable fraction (default 30%) can be taken out of regular
   units. The ratio at which soldiers need leaders is *derived* rather than
   assumed: the Army's 70,951 trade-trained soldiers are led by that cadre,
   which is one leader per 2.4 (SPS Tables 3a and 11a). It is a whole-Army
   manning ratio, staff and headquarters posts included, and is used because
   it is the rate at which the Army actually finds leaders for the soldiers it
   has. The ratio at which one leader can *instruct* recruits is a separate
   assumption (`instructor_ratio`, default 8, range 6-10) and governs only how
   many junior leaders each +5,000/yr block of training capacity diverts (625).
   The factor is charged for everyone raised on top of the standing Army who
   does not arrive in formed units: recalled ex-regulars, traced Strategic
   Reservists and conscripts. Mobilised volunteer reservists are not charged,
   because the Army Reserve's trained strength is held in sub-units with their
   own corporals and sergeants. A recall of ex-regulars both demands leadership
   and supplies it, returning junior leaders in the Army's own proportion,
   discounted for rust. When demand exceeds supply the leadership factor falls
   below 1 and scales the effectiveness of all three buckets.

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

10. **Verification status.** Where a figure was first written down with a
    citation that could not be located, it was re-sourced or replaced rather
    than kept: the £49,000 training cost became the verified £47,800 Phase 1
    figure (Phase 2 cost excluded); the ~20-week Phase 2 average became an
    assumption with the published 15–27 week range; the £3.5–5k
    personal-equipment cost stays an assumption because neither cited source
    could be found; the £53,000 labour-share output became the ONS-derived
    £51,100. Every figure now carries the source it is actually read from, and
    that source is on this page.
