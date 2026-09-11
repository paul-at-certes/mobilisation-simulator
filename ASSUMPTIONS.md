# Assumptions

*Generated from `src/data/parameters.json` (v0.3.0) by `npm run assumptions` on 2026-09-11. Edit the JSON or `scripts/assumptions-preamble.md`, not this file.*

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

10. **Verification status.** Figures the design brief attributed to sources
    that could not be located were re-sourced or replaced: the £49,000
    training cost became the verified £47,800 Phase 1 figure (Phase 2 cost
    excluded); the ~20-week Phase 2 average became an assumption with the
    published 15–27 week range; the £3.5–5k personal-equipment cost stays an
    assumption because neither cited source could be found; the £53,000
    labour-share output became the ONS-derived £51,100. Details in
    `docs/source-verification.md`.

## Numerical assumptions

Every parameter tagged `assumption` in the game, with its plausible range and the one-line rationale shown in the source popover. Values were tuned only within these ranges during the balance pass.

### Regular Army (MoD Service Personnel Statistics, 1 July 2026)

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `outflow_intent_max_pct` · Ceiling on intention to leave | 40% | 30% – 60% | AFCAS has never recorded the Army outside 17-23 in twenty years of the series, so any figure here is an extrapolation beyond the evidence. 40 is a little over twice the baseline: bad enough to be a crisis, short of claiming the Army would dissolve. Nothing in the deck can reach it on its own; it is a guard against compounding. |
| `stop_loss_leak_fraction` · Outflow that stop-loss cannot stop | 0.25 | 0.1 – 0.5 | Compulsion does not reach medical discharge, discharge on disciplinary grounds, or a commission the Crown declines to extend, and AFCAS puts intention at 19% against 4.67% realised, so what stop-loss dams does not go away. A quarter is an assumption; the direction is not. |
| `stop_loss_intent_add_monthly` · Intention added each month under stop-loss | 0.5% | 0% – 1.5% | Of those who have put their notice in, 50% cite the impact of Service life on family and personal life, the most cited reason by some way (AFCAS 2026, Table FP.1). Being held past the end of an engagement is that factor exactly. Half a point a month is +6 over a division and +10 over a corps: enough to be felt late, not enough to decide the game. |
| `regular_deployable_fraction` · Deployable regular slice | 0.05 | 0.03 – 0.2 | The premise is that the division must be raised on top of the standing Army's current tasks: overseas commitments, the readiness cycle, the training organisation and the medically non-deployable leave only a thin uncommitted slice. The whole regular Army counts in the ledger but only this slice counts toward Force Ready. |

### Junior leadership cadre

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `instructor_ratio` · Recruits per instructor | 8 | 6 – 10 | Infantry section of eight soldiers under a corporal; Phase 1 training-platoon instructor ratios are similar. |
| `junior_leaders_spareable_fraction` · Spareable junior leaders | 0.3 | 0.2 – 0.4 | Regular battalions need most of their own corporals and sergeants. Stripping more than roughly a third hollows out the units that are supposed to be the core of the force; Russia's 2022 mobilisation showed what happens when mobilised men arrive without leaders. |

### Reserve forces

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `ex_regular_delay_months` · Ex-regular recall delay | 3 | 2 – 4 | Recall notices must be served at recorded addresses; the design brief gives 2–4 months. |
| `ex_regular_report_ceiling` · Ex-regulars who ever report | 0.5 | 0.3 – 0.52 | The MoD has acknowledged that address records for the Regular Reserve are incomplete; medical and age exemptions remove more. Now an upper bound rather than a central estimate: reserve_medical_fail_ex_regular puts the medical failure rate for ex-regulars who actually reported at 0.48 (HC 57 paragraph 119), so the medical alone leaves 0.52 before any allowance for records or age. Lowering it is a balance change and has not been made; see docs/design-review.md F11. |
| `ex_regular_report_rate_monthly` · Ex-regular monthly reporting rate | 0.2 | 0.1 – 0.35 | Geometric arrival; most of those who will report do so within six months. |
| `strategic_trace_delay_months` · Strategic Reserve trace time | 3 | 2 – 6 | Matching against HMRC, DWP and electoral records takes months and has never been exercised at scale. |
| `strategic_trace_yield_min` · Trace yield, low | 0.2 | 0.1 – 0.3 | Design brief range 20–50%. |
| `strategic_trace_yield_max` · Trace yield, high | 0.5 | 0.4 – 0.6 | Design brief range 20–50%. |
| `strategic_report_fraction` · Traced ex-regulars who report | 0.5 | 0.3 – 0.7 | Many will be over recall age or medically unfit; none have trained for years. |

### Conscription pool (ONS mid-2025) and public opinion

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `conscription_refusal_conversion` · Strong opponents who refuse the call-up | 0.25 | 0.1 – 0.5 | Saying you strongly oppose a policy is not the same as breaking the law when it applies to you, and most people comply. The nearest measurement the project has is HC 57: 25.5% of Army reservists served a compulsory call-out notice on Operation Telic did not report -- and those were volunteers who had signed up. A quarter of strong opponents gives 11-14% of a conscript intake failing to report, which is below that reservist figure and above zero. |
| `medical_pass_peacetime` · Medical pass rate, peacetime standard | 0.4 | 0.35 – 0.45 | Medical rejection is the single largest reason Army applicants fail; about half of adults say they would be ineligible. |
| `medical_pass_relaxed` · Medical pass rate, relaxed standard | 0.6 | 0.55 – 0.65 | Design brief. |
| `medical_pass_wartime` · Medical pass rate, wartime standard | 0.75 | 0.7 – 0.8 | Design brief. |
| `exemption_strict` · Exempted share, strict regime | 0.15 | 0.1 – 0.2 | Design brief. |
| `exemption_broad` · Exempted share, broad regime | 0.35 | 0.3 – 0.45 | Design brief. |
| `exemption_minimal` · Exempted share, minimal regime | 0.05 | 0.03 – 0.1 | Design brief. |

### Training pipeline

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `phase2_weeks` · Phase 2 training length, average | 20 | 15 – 27 | Mid-point of the published 15–27 week range. HL1629 gives no average; Phase 2 length varies by trade. |
| `phase1_weeks_compressed` · Phase 1, compressed | 10 | 8 – 12 | Design brief. |
| `phase2_weeks_compressed` · Phase 2, compressed | 12 | 8 – 16 | Design brief. |
| `compressed_effectiveness_penalty` · Compressed syllabus effectiveness penalty | 0.15 | 0.1 – 0.25 | Design brief. |
| `attrition_compressed_add` · Extra attrition, compressed syllabus | 0.05 | 0.03 – 0.1 | Design brief. |
| `attrition_wartime_medical_add` · Extra attrition, wartime medical standard | 0.1 | 0.05 – 0.15 | Design brief. |
| `attrition_relaxed_medical_add` · Extra attrition, relaxed medical standard | 0.04 | 0.02 – 0.08 | Interpolated between peacetime (+0) and wartime (+10pp). |
| `capacity_purchase_annual` · Capacity per purchase | 5,000 | 3,000 – 8,000 | Roughly one additional Phase 1 training centre. |
| `capacity_standup_months` · Capacity stand-up time | 2 | 1 – 4 | Design brief. |
| `civilian_instructor_capacity_annual` · Civilian instructor capacity | 2,000 | 1,000 – 4,000 | Design brief. |
| `civilian_instructor_delay_months` · Civilian instructor lead time | 3 | 2 – 6 | Design brief. |
| `equipment_lead_months` · Equipment lead time | 4 | 4 – 12 | Design brief. The NAO puts the evidence against it: a decade of "lean" stockpiles and "just in time" delivery of spares has left no buffer to draw on, the MoD has had to earmark more than GBP 5 billion over ten years to re-establish war holdings, and it records that "the lead time for replenishing stock and establishing war holdings presents challenges" (HC 315 para 2.20). The Army separately told the NAO that semiconductor lead times had gone from one to three weeks to more than fifty (para 2.5), though that is components rather than the clothing, body armour, helmet and rifle this parameter buys. Four months is therefore the optimistic end of the range, not the middle, and the range is widened upward to say so. Not raised, because moving it is a balance change and the NAO figures are not measurements of this quantity. |
| `vetting_throughput_monthly` · Vetting clearances a month | 2,000 | 1,000 – 4,000 | The share of UKSV throughput the Army could expect during a congestion, against a service that handles roughly fifteen thousand clearances a month across all of government. Sized so the ceiling is invisible on the baseline training estate (spare intake of a few dozen a month) and binding once capacity has been bought (spare intake 2,900-4,900). |
| `vetting_rescreen_throughput_monthly` · Vetting clearances a month while re-screening | 1,500 | 750 – 3,000 | Three-quarters of the ordinary congested throughput: re-screening work competes with new clearances for the same officers, so a review of past cases costs roughly a quarter of current capacity. |
| `contingency_equipment_delay_months` · Equipment slip after the contingency is spent | 3 | 1 – 6 | The contingency's first stated purpose is to fund new equipment projects (NAO 1.9); an emergency order for tens of thousands of sets is exactly that. Spent elsewhere, the order joins the queue rather than jumping it. Three months against an equipment_lead_months of four roughly doubles the wait, which is the right order of magnitude for losing your place in a programme the NAO already describes as delay-prone. |

### Effectiveness multipliers (modelling assumptions)

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `eff_regular` · Effectiveness: regular, trade-trained | 1 | 1 – 1 | Definitional reference point. |
| `eff_reserve_volunteer` · Effectiveness: volunteer reservist | 0.8 | 0.7 – 0.9 | Trained, but with fewer collective-training days per year than regulars. |
| `eff_ex_regular` · Effectiveness: ex-regular, recalled | 0.6 | 0.5 – 0.7 | Formerly fully trained; skills fade and fitness declines over the years since leaving. |
| `eff_strategic` · Effectiveness: Strategic Reserve, traced | 0.5 | 0.4 – 0.6 | Longer out of service than the tracked reserve, on average. |
| `eff_conscript_normal_start` · Effectiveness: conscript at graduation, normal syllabus | 0.5 | 0.4 – 0.6 | Trade-trained but with no collective training and no experience. |
| `eff_conscript_normal_cap` · Effectiveness cap: conscript, normal syllabus | 0.7 | 0.6 – 0.8 | Design brief. |
| `eff_conscript_compressed_start` · Effectiveness: conscript at graduation, compressed syllabus | 0.35 | 0.25 – 0.45 | Normal-syllabus start less the compressed-syllabus penalty. |
| `eff_conscript_compressed_cap` · Effectiveness cap: conscript, compressed syllabus | 0.6 | 0.5 – 0.7 | Design brief. |
| `eff_conscript_growth_monthly` · Conscript effectiveness growth | 0.05 | 0.03 – 0.08 | Design brief. |
| `eff_conscript_unequipped` · Effectiveness: conscript, trained, unequipped | 0.25 | 0.15 – 0.35 | Design brief. |

### Money

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `capacity_purchase_cost` · Capacity purchase cost | £50m | £25m – £150m | Design brief; excludes the instructors, who are diverted rather than hired. |
| `civilian_instructor_cost_annual` · Civilian instructor contract cost | £15m | £8m – £30m | About 250 instructors at a fully loaded £60k each. |
| `equipment_cost_per_head` · Personal equipment per conscript | £4,000 | £2,500 – £6,000 | £2,000 of clothing plus body armour, helmet, rifle and load-carrying equipment; the brief's £3.5–5k range is retained as plausible. |
| `reservist_award_annual` · Reservist Award top-up | £8,000 | £4,000 – £15,000 | The award covers the gap between civilian and military pay; the average is not published. |

### Political capital

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `willingness_low_threshold_pct` · Willingness threshold | 25% | 25% – 40% | Design brief gave 30. Lowered in the balance pass so that an address to the nation (+5 points on a base of 20) lifts willingness clear of the refusal-cases penalty for its duration; otherwise the penalty is a flat tax with no counter. |
| `bill_months_emergency` · National Service Bill, emergency procedure | 3 | 1 – 4 | Design brief. |
| `bill_months_normal` · National Service Bill, normal procedure | 6 | 4 – 9 | Design brief. |
| `cost_pc_penalty_threshold` · Cost penalty threshold | £5.0bn | £2.5bn – £10.0bn | Design brief. |
| `cost_pc_penalty_per_step` · Cost penalty per £5bn | 2 | 1 – 4 | Design brief. |
| `contingency_drawn_penalty_add` · Extra Treasury charge once the buffer is gone | 2 | 0 – 3 | The contingency exists to absorb unexpected cost increases (NAO 1.9). Spend it on the mobilisation and every subsequent overrun lands on the Plan instead of on the buffer, so the Treasury's tolerance narrows. Doubling cost_pc_penalty_per_step rather than adding one to it, because the crossover has to sit inside the spend the game actually produces: a full Corps run costs GBP 4.6-11.1bn, so at +1 the draw was better everywhere and the decision was no decision. At +2 the draw wins while it clears your only step of Treasury pressure and loses from the second step on — crossover at about GBP 9bn of cumulative cost, which sits between what a restrained Corps programme spends (6.8) and what max_effort spends (9.7). |
| `gdp_pc_penalty_step_pct` · GDP penalty step | 0.25% | 0.1% – 0.5% | Design brief. |
| `gdp_pc_penalty_per_step` · GDP penalty per step | 3 | 1 – 5 | Design brief. |
| `pc_start` · Starting political capital | 70 | 50 – 70 | Design brief gave 60. Raised to the top of the range in the balance pass so that a full programme of actions is feasible but tight (see DECISIONS.md). |
| `pc_baseline_drain` · Monthly drain | 1 | 0 – 2 | Design brief. |
| `pc_delivery_per_credit` · Soldiers per point of political credit | 500 | 250 – 1,500 | One point per 500 delivered is one point per month's worth of the Army's own trained-strength gain (regular_gains_annual, 5,933 a year, is 494 a month). The minister earns political credit at the rate at which the Army in peacetime produces soldiers, and only above it. Replaces pc_momentum_bonus / pc_momentum_threshold, which were a share of target and so unreachable at Corps scale (see DECISIONS.md and docs/design-review.md F6). |
| `pc_delivery_max` · Monthly cap on delivery credit | 3 | 2 – 5 | The same 3 as the momentum bonus it replaces, so the best possible month is no larger than before; what changes is that an ordinary delivering month can now reach it. Uncapped, the month the reserves arrive would pay for the rest of the game. |
| `pc_low_willingness_penalty` · Refusal-cases penalty | 2 | 1 – 4 | Design brief. |
| `pc_idle_grace_months` · Idle months tolerated | 2 | 1 – 4 | A minister may take a month to think and a second to consult. Beyond that, doing nothing visible reads as drift. |
| `pc_idle_penalty` · Penalty for a government seen to be doing nothing | 3 | 1 – 5 | Three times the baseline drain: visible inaction costs a government more than the crisis itself does. |
| `pc_cost_call_out_reserve` · Cost: call out the Army Reserve | -7 | -15 – -5 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_ninety_day_notice` · Cost: legislate 90-day notice | -4 | -8 – -3 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_recall_ex_regular` · Cost: recall the Ex-Regular Reserve | -6 | -12 – -4 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_trace_strategic` · Cost: trace the Strategic Reserve | -2 | -5 – -1 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_stop_loss` · Cost: stop-loss | -9 | -16 – -8 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_bill_emergency` · Cost: National Service Bill, emergency | -12 | -20 – -10 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_bill_normal` · Cost: National Service Bill, normal | -6 | -12 – -5 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_exclude_women` · Cost: exclude women | -5 | -8 – -3 | Design brief. |
| `pc_cost_medical_relaxed` · Cost: relaxed medical standard | -2 | -5 – -1 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_medical_wartime` · Cost: wartime medical standard | -6 | -12 – -5 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_exemptions_minimal` · Cost: minimal exemptions | -8 | -14 – -6 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_expand_capacity` · Cost: expand training capacity | -3 | -6 – -2 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_compress_syllabus` · Cost: compress the syllabus | -5 | -9 – -3 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_civilian_instructors` · Cost: contract civilian instructors | -2 | -4 – -1 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_cost_junior_entry` · Cost: reinstate junior entry | -1 | -2 – 0 | Design brief. |
| `pc_cost_equipment_buy` · Cost: emergency equipment buy | -2 | -5 – -1 | Design brief. Tuned in the balance pass (see DECISIONS.md). |
| `pc_address_first` · Address the nation, first | 8 | 5 – 12 | Design brief. |
| `pc_address_second` · Address the nation, second | 4 | 2 – 6 | Design brief. |
| `pc_address_subsequent` · Cost: third and later address | -5 | -8 – -2 | Mirrors pc_blame_subsequent. Set below the idle penalty (3) on purpose: an address with nothing in it must cost more than saying nothing, or it becomes a free way to look busy. |
| `address_willingness_boost_pct` · Address willingness boost | 5% | 3% – 8% | Design brief. |
| `address_willingness_months` · Address boost duration | 3 | 2 – 4 | Design brief. |
| `pc_cost_raise_spending` · Cost: raise defence spending | -6 | -9 – -3 | Design brief. |
| `raise_spending_threshold_multiplier` · Raise-spending effect | 2 | 1.5 – 3 | Interpretation of the brief's 'unlocks bigger £ budget'. |
| `pc_blame_first` · Blame the previous government, first | 3 | 2 – 5 | Design brief. |
| `pc_blame_subsequent` · Blame the previous government, again | -5 | -8 – -3 | Design brief. |
| `actions_per_turn` · Actions per month | 2 | 1 – 3 | Game pacing. |

### Difficulty settings

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `target_brigade` · Brigade target | 10,000 | 5,000 – 10,000 | A brigade group with enablers. The regulars' uncommitted slice covers under half of it. |
| `deadline_brigade` · Brigade deadline | 4 | 4 – 12 | Changed from the brief's 12 months in the balance pass: with 12 months the reserves alone make a brigade several times over. Five months means the Army Reserve's 180-day notice arrives too late; the puzzle is the 90-day amendment and the ex-regular recall. |
| `target_division` · Division target | 22,000 | 20,000 – 30,000 | A deployable division with enablers. |
| `deadline_division` · Division deadline | 12 | 9 – 18 | Design brief. |
| `target_corps` · Corps target | 45,000 | 40,000 – 80,000 | Changed from the brief's 60,000 in the balance pass: the best scripted run reached about 32,000 effective soldiers by month 15 before political capital ran out (see DECISIONS.md). |
| `deadline_corps` · Corps deadline | 24 | 12 – 24 | Changed from the brief's 18 months in the balance pass: 18 months does not allow enough conscript cohorts to graduate and mature for 60,000 to be reachable by any strategy (see DECISIONS.md). |

## Derived figures

Figures computed from primary sources, with the arithmetic.

| Parameter | Value | Derivation | Source |
|---|---|---|---|
| `regular_outflow_intent_conversion` · Intention converted to departure each year | 0.2456 | Realised outflow regular_voluntary_outflow_annual / regular_trained_start = 3311 / 70951 = 4.6666% a year. Intention regular_outflow_intent_pct = 19%. 4.6666 / 19 = 0.2456. Carried to four places because the split has to reconstruct the published annual figure: 70,951 x 19% x 0.2456 = 3,310.9 against the 3,311 the Army reports. | [Derived from MoD, UK Regular Armed Forces Continuous Attitude Survey Results 2026, published 28 May 2026, Annex B Table B12.1 (question A173), Army; MoD Service Personnel Statistics, 1 July 2026, Tables 4 and 5d](https://www.gov.uk/government/collections/armed-forces-continuous-attitude-survey-index) |
| `training_attrition` · Training attrition | 0.26 | 2022 / 7771 = 0.260 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Tables 5a and 5c](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `junior_leaders` · Junior leaders | 29,563 | 10752 (OR-4) + 7404 (OR-6) + 5099 (OR-7) + 2047 (OF-1) + 4261 (OF-2) = 29563 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 11a (rank structure at 1 April 2026)](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `junior_leader_ratio` · Soldiers per junior leader | 2.4 | regular_trained_start / junior_leaders = 70951 / 29563 = 2.4 | [Derived from MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Tables 3a and 11a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `leaders_per_capacity_purchase` · Instructors per capacity purchase | 625 | capacity_purchase_annual / instructor_ratio = 5000 / 8 = 625 | Derived from capacity_purchase_annual and instructor_ratio |
| `reserve_volunteer_deployable_fraction` · Reservists who actually deploy | 0.5 | Two stages. Structural: of 23,517 trained Army Reserve (SPS Table 6a), 1,720 are on full-time reserve service and 615 already mobilised, leaving 0.901 of the strength available to be served a notice. Empirical: reserve_mobilisation_acceptance_rate, 0.579 of notices served were accepted into service on Operation Telic 1. 0.901 x 0.579 = 0.522, held at 0.50. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves); MoD Service Personnel Statistics, 1 July 2026, Table 6a](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_mobilisation_acceptance_rate` · Reservists accepted per call-out notice | 0.579 | Operation Telic 1, Army, HC 57 Table 1: 3,787 accepted into service / 6,540 call-out notices served = 0.579. Tri-service the same table gives 5,221 / 8,492 = 0.615. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_exemption_application_rate` · Call-out notices contested | 0.247 | Operation Telic 1, HC 57 paragraph 113: 2,021 applications for exemption + 80 for deferral = 2,101, against 8,492 notices served (Table 1) = 0.247. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_exemption_employer_share` · Exemption applications made by employers | 0.455 | Operation Telic 1, HC 57 paragraph 113: of 2,021 applications for exemption, 920 were from employers and 1,101 from reservists. 920 / 2,021 = 0.455. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_notice_days_default` · Army Reserve call-out notice | 180 | Readiness category R9 = 180 days, as stated in the amendment text; the Act itself sets no fixed period. | [Armed Forces Bill 2026, amendment papers (Select Committee, 14–15 Apr 2026): Army Reserve Group A standard notice is readiness category R9 (180 days)](https://publications.parliament.uk/pa/bills/cbill/59-01/0367/amend/armedforces_day_sc_0414.pdf) |
| `reserve_notice_days_amended` · Amended call-out notice | 90 | Proposed amendment, not enacted; the Government's reply was that readiness levels are reviewed annually. | [Armed Forces Bill 2026, amendment 24 (Public Bill Committee, sixth sitting, 16 Apr 2026): proposed reduction to R8 (90 days)](https://hansard.parliament.uk/Commons/2026-04-16/debates/3430fe85-c68e-4e24-b43c-e53fbcad227c/ArmedForcesBill(SixthSitting)) |
| `reserve_arrival_months_default` · Reservist arrival, default notice | 6 | 180 days ≈ 6 months; refresher assumed to overlap with the notice period. | Derived from reserve_notice_days_default |
| `reserve_arrival_months_amended` · Reservist arrival, 90-day notice | 3 | 90 days ≈ 3 months. | Derived from reserve_notice_days_amended |
| `strategic_reserve_claimed` · Strategic Reserve, as claimed | 95,000 | Ministerial estimate as reported; the MoD's own impact assessment (27 Feb 2026) says efforts to improve contact information are under way. | [MoD press release, 15 Jan 2026 (recall age raised to 65) and Forces News, 15 Jan 2026: 'an estimated 95,000 people have a Strategic Reservist liability'](https://www.forcesnews.com/services/tri-service/strategic-reserve-age-limit-raised-65-so-more-can-be-recalled-should-war-loom) |
| `strategic_reserve_untracked` · Strategic Reserve not on record, Army share | 38,516 | (95000 - 34755) × (22221 / 34755) = 38516 | Derived from strategic_reserve_claimed, ex_regular_tracked_tri_service and ex_regular_tracked |
| `uk_population_scaling` · UK / England and Wales scaling | 1.1206 | 69,487,000 / 62,010,000 = 1.1206 | [ONS: UK mid-2025 provisional (69,487,000) and England and Wales mid-2025 (62,010,000)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/provisionalpopulationestimatefortheuk/mid2025) |
| `women_included_support_pct` · Public support for including women | 72% | 42 + 30 = 72 (n = 3,040 GB adults). | [YouGov daily results, 26 Jan 2024: should women be conscripted on the same basis as men (42%) or with some restrictions (30%)](https://yougov.com/en-gb/daily-results/20240126-2b544-3) |
| `willingness_start_pct` · Willingness to serve | 20% | 6 + 14 = 20. YouGov's own results page could not be located; figures are from secondary reporting. | [YouGov, July 2026, as reported 23 Jul 2026: 6% would volunteer, 14% would serve if conscripted](https://www.joe.co.uk/news/only-6-per-cent-of-brits-would-volunteer-to-fight-off-invasion-poll-reveals-539523) |
| `self_declared_ineligible_pct` · Self-declared ineligible | 52% | Secondary reporting; used for flavour only. | [YouGov, July 2026, as reported 23 Jul 2026: 52% say they would be ineligible on health or age grounds](https://www.joe.co.uk/news/only-6-per-cent-of-brits-would-volunteer-to-fight-off-invasion-poll-reveals-539523) |
| `conscription_willingness_adj_18_25` · Willingness adjustment, band 18-25 | -4% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 28.58% for 18-25, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `conscription_willingness_adj_18_30` · Willingness adjustment, band 18-30 | 0% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 32.84% for 18-30, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `conscription_willingness_adj_18_40` · Willingness adjustment, band 18-40 | 3% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 35.68% for 18-40, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `conscription_willingness_adj_18_65` · Willingness adjustment, band 18-65 | 9% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 42.16% for 18-65, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `refusal_strong_opposition_intercept` · Strong opposition at zero willingness | 66.2% | Least squares on YouGov's four age groups, (support%, strongly oppose%) = (27,45), (39,37), (53,24), (63,18): strongly_oppose = 66.206 - 0.7738 x support, R2 = 0.994. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `refusal_strong_opposition_slope` · Strong opposition per point of willingness | -0.7738 | Slope of the same least-squares fit as refusal_strong_opposition_intercept. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `phase1_weeks` · Phase 1 training length | 14 | Common Military Syllabus length as stated in the answer. | [House of Lords written question HL1629, answered 26 Feb 2020: Phase 1 at ATC Pirbright is 14 weeks](https://questions-statements.parliament.uk/written-questions/detail/2020-02-13/hl1629) |
| `syllabus_throughput_multiplier` · Compressed syllabus throughput | 1.5 | (14 + 20) / (10 + 12) = 1.55, rounded down to 1.5. | Derived from course lengths |
| `junior_entry_attrition` · Junior entry attrition | 0.34 | 2018–2023 average as reported. The course itself is 49 weeks (long) or 23 weeks (short); the two-year lead is set by the minimum deployment age. | [Forces News, 13 Nov 2025: AFC Harrogate non-completion averaged 34% over 2018–2023, the highest of any Army training establishment](https://www.forcesnews.com/services/gurkhas/gurkha-recruits-record-perfect-pass-rate-wider-army-dropout-figures-revealed) |
| `junior_entry_lead_months` · Junior entry lead time | 24 | UK policy: under-18s are not deployed on operations. Entry at 16 implies a two-year lead. | Derived from the minimum deployment age of 18 |
| `pension_employer_multiplier` · Pay to employer-cost multiplier | 1.735 | 1 + 0.735. The 2024 valuation reduces the rate to 52.3% from 1 April 2027. | [Armed Forces Pension Scheme annual accounts 2024–25: employer contributions paid at 73.5% of pensionable pay](https://www.gov.uk/government/publications/armed-forces-pension-scheme-annual-accounts-2024-to-2025) |
| `conscript_pay_annual` · Conscript pay | £24,800 | 12.71 × 37.5 × 52 = 24,784, rounded. | [National Living Wage, April 2026 (£12.71/hour)](https://www.gov.uk/national-minimum-wage-rates) |
| `training_cost_per_recruit` · Phase 1 training cost per recruit | £47,800 | Figure as reported; the parliamentary question reference could not be located. HL1629 gave £38,000 in 2020. | [Written answer (Luke Pollard MP to James Cartlidge MP), FY2023-24, as reported by UK Defence Journal, 22 Oct 2024](https://ukdefencejournal.org.uk/how-much-does-it-cost-to-train-a-british-army-recruit/) |
| `employer_assistance_daily` · Employer financial assistance | £110 | Cap on the employer's award as made; later amendments not checked. | [Reserve Forces (Call-out and Recall) (Financial Assistance) Regulations 2005, SI 2005/859, regulation 6(3)](https://www.legislation.gov.uk/uksi/2005/859/regulation/6/made) |
| `defence_budget_2025` · Defence budget 2025/26 | £62.3bn | 47,388.7 + 23,067.1 = £62,455.8m, reported as £62.3bn in the Commons Library briefing CBP-8175; the rounded figure is used. | [MoD Supplementary Estimate memorandum 2025-26: RDEL £47,388.7m + CDEL £23,067.1m](https://committees.parliament.uk/publications/51542/documents/286297/default/) |
| `output_per_worker_labour_share` · Output per worker, labour share | £51,100 | 1,511,529 / 29,590 ≈ £51,100 per employee. The brief's £53k could not be reproduced. | [ONS: compensation of employees 2025 (DTWM, £1,511.5bn) divided by employees (MGRN, 29.59m)](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/dtwm) |
| `output_per_worker_gross` · Output per worker, gross | £88,800 | 3,033,866 / 34,165 ≈ £88,800 per worker. | [ONS: GDP 2025 (YBHA, £3,033.9bn) divided by employment (MGRZ, 34.165m)](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ybha/pn2) |
| `gdp_age_multiplier_18_25` · Output multiplier, 18–25 | 0.407 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because output_per_worker_labour_share is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `gdp_age_multiplier_18_30` · Output multiplier, 18–30 | 0.547 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because output_per_worker_labour_share is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `gdp_age_multiplier_18_40` · Output multiplier, 18–40 | 0.717 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because output_per_worker_labour_share is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `gdp_age_multiplier_18_65` · Output multiplier, 18–65 | 0.762 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because output_per_worker_labour_share is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `strategic_reserve_untracked_tri_service` · Strategic Reserve not on record, all three Services | 60,245 | 95000 - 34755 = 60245 | Derived from strategic_reserve_claimed and ex_regular_tracked |

## Primary figures

| Parameter | Value | As of | Source |
|---|---|---|---|
| `regular_trained_start` · Army trade-trained strength | 70,951 | 2026-07-01 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 3a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `regular_untrained_start` · Army untrained strength | 3,111 | 2026-07-01 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 3e](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `regular_gains_annual` · Baseline training output | 5,933 | 2026-06-30 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 5b](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `regular_untrained_intake_annual` · Regular untrained intake | 7,771 | 2026-06-30 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 5a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `regular_voluntary_outflow_annual` · Trade-trained voluntary outflow | 3,311 | 2026-06-30 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Tables 4 and 5d](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `regular_outflow_intent_pct` · Army intending to leave early | 19% | 2026-05-28 | [MoD, UK Regular Armed Forces Continuous Attitude Survey Results 2026, published 28 May 2026, Annex B Table B12.1 (question A173), Army](https://www.gov.uk/government/collections/armed-forces-continuous-attitude-survey-index) |
| `reserve_volunteer_trained` · Army Reserve trained strength | 23,517 | 2026-07-01 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 6a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `reserve_medical_fail_ex_regular` · Ex-regulars failing the mobilisation medical | 0.48 | 2004-03-16 | [House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_medical_fail_volunteer` · Volunteer reservists failing the mobilisation medical | 0.14 | 2004-03-16 | [House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `ex_regular_tracked` · Army Regular Reserve on record | 22,221 | 2026-04-01 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 8a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `ew_pop_18_25` · England and Wales, aged 18–25 | 5,938,195 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_f_18_25` · England and Wales, women aged 18–25 | 2,898,703 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_18_30` · England and Wales, aged 18–30 | 10,039,824 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_f_18_30` · England and Wales, women aged 18–30 | 4,968,685 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_18_40` · England and Wales, aged 18–40 | 18,665,415 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_f_18_40` · England and Wales, women aged 18–40 | 9,419,482 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_18_65` · England and Wales, aged 18–65 | 38,201,921 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_f_18_65` · England and Wales, women aged 18–65 | 19,399,613 | 2025-06-30 | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `regular_pay_annual` · Regular soldier pay, entry rate | £27,282 | 2026-04-01 | [Armed Forces' Pay Review Body, Fifty-Fifth Report 2026, Appendix 1 Table 1.1](https://www.gov.uk/government/publications/armed-forces-pay-review-body-fifty-fifth-report-2026) |
| `equipment_plan_deficit` · Equipment Plan funding deficit | £16.9bn | 2023-12-04 | [NAO, The Equipment Plan 2023-2033, HC 315, Session 2023-24, 4 December 2023](https://www.nao.org.uk/reports/the-equipment-plan-2023-2033/) |
| `defence_budget_deficit_10yr` · Ten-year defence budget deficit | £42.5bn | 2023-12-04 | [NAO, The Equipment Plan 2023-2033, HC 315, Session 2023-24, 4 December 2023](https://www.nao.org.uk/reports/the-equipment-plan-2023-2033/) |
| `army_capability_gap` · The Army's own stated capability gap | £12.0bn | 2023-12-04 | [NAO, The Equipment Plan 2023-2033, HC 315, Session 2023-24, 4 December 2023](https://www.nao.org.uk/reports/the-equipment-plan-2023-2033/) |
| `equipment_plan_contingency` · Contingency held in the Equipment Plan | £4.1bn | 2023-12-04 | [NAO, The Equipment Plan 2023-2033, HC 315, Session 2023-24, 4 December 2023, paragraph 1.9](https://www.nao.org.uk/reports/the-equipment-plan-2023-2033/) |
| `uk_gdp_2025` · UK GDP 2025 | £3033.9bn | 2025-12-31 | [ONS, GDP at current market prices, 2025 (series YBHA)](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ybha/pn2) |
| `army_medical_rejections_jul24_jan26` · Army applications rejected on medical grounds | 45,680 | 2026-01-31 | [Written question 116544 (James Cartlidge MP), answered 9 Mar 2026](https://questions-statements.parliament.uk/written-questions/detail/2026-02-27/116544/) |
| `strategic_reserve_recall_age` · Strategic Reserve recall age limit | 65 | 2026-01-15 | [MoD press release, 15 Jan 2026](https://www.gov.uk/government/news/major-boost-to-pool-of-skilled-former-military-personnel-called-upon-in-crises-as-uk-strengthen-preparedness) |
| `ex_regular_tracked_tri_service` · Ex-Regular Reserve on record, all three Services | 34,755 | 2026-04-01 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 8a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |

