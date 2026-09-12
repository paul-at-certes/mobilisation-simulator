# Assumptions

*Generated from `src/data/parameters.json` (v0.4.0, revised 2026-09-12) by `npm run assumptions`. Edit the JSON or `scripts/assumptions-preamble.md`, not this file.*

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

## Numerical assumptions

Every parameter tagged `assumption` in the game, with its plausible range and the one-line rationale shown in the source popover. Values were tuned only within these ranges during the balance pass.

### Regular Army (MoD Service Personnel Statistics, 1 July 2026)

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `outflow_intent_max_pct` · Ceiling on intention to leave | 40% | 30% – 60% | AFCAS has never recorded the Army outside 17-23 in twenty years of the series, so any figure here is an extrapolation beyond the evidence. 40 is a little over twice the baseline: bad enough to be a crisis, short of claiming the Army would dissolve. Nothing in the deck can reach it on its own; it is a guard against compounding. |
| `stop_loss_leak_fraction` · Outflow that stop-loss cannot stop | 0.25 (25%) | 0.1 – 0.5 | Compulsion does not reach medical discharge, discharge on disciplinary grounds, or a commission the Crown declines to extend, and AFCAS puts intention at 19% against 4.67% realised, so what stop-loss dams does not go away. A quarter is an assumption; the direction is not. |
| `stop_loss_intent_add_monthly` · Intention added each month under stop-loss | 0.5% | 0% – 1.5% | Of those who have put their notice in, 50% cite the impact of Service life on family and personal life, the most cited reason by some way (AFCAS 2026, Table FP.1). Being held past the end of an engagement is that factor exactly. Half a point a month is +6 over a division and +10 over a corps: enough to be felt late, not enough to decide the game. |
| `regular_deployable_fraction` · Deployable regular slice | 0.05 (5%) | 0.03 – 0.2 | The premise is that the division must be raised on top of the standing Army's current tasks: overseas commitments, the readiness cycle, the training organisation and the medically non-deployable leave only a thin uncommitted slice. The whole regular Army counts in the ledger but only this slice counts toward Force Ready. |

### Junior leadership cadre

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `instructor_ratio` · Recruits per instructor | 8 | 6 – 10 | Infantry section of eight soldiers under a corporal; Phase 1 training-platoon instructor ratios are similar. |
| `eff_promoted_leader` · Effectiveness of an accelerated junior leader | 0.6 (60%) | 0.35 – 0.8 | The one frank assumption in this mechanic, in the way the refusal conversion is in the refusal model: no figure for the effectiveness of accelerated promotion exists or is likely to. What is being discounted is narrow, which argues for a high value rather than a low one - the soldier has passed the same 8-week course as anyone else, and what they lack is the years in rank behind it, not the training. Set level with the recalled ex-regular's 0.6, which discounts them by the same order for the mirror-image problem: the ex-regular had the experience and lost it, the accelerated corporal has the course and has not yet earned it. The range runs from a third, at which the promotion is a fiction, to four fifths, at which time in rank hardly matters and the Army would have no reason not to promote everyone early. |
| `junior_leaders_spareable_fraction` · Spareable junior leaders | 0.3 (30%) | 0.2 – 0.4 | Regular battalions need most of their own corporals and sergeants. Stripping more than roughly a third hollows out the units that are supposed to be the core of the force; Russia's 2022 mobilisation showed what happens when mobilised men arrive without leaders. |

### Reserve forces

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `ex_regular_delay_months` · Ex-regular recall delay | 3 | 2 – 4 | Recall notices must be served at recorded addresses; the game allows 2–4 months. |
| `ex_regular_report_ceiling` · Ex-regulars who ever report | 0.5 (50%) | 0.3 – 0.52 | The MoD has acknowledged that address records for the Regular Reserve are incomplete; medical and age exemptions remove more. Now an upper bound rather than a central estimate: the medical failure rate for ex-regulars who actually reported is 0.48 (HC 57 paragraph 119), so the medical alone leaves 0.52 before any allowance for records or age. Lowering it would be a balance change, and has not been made. |
| `ex_regular_report_rate_monthly` · Ex-regular monthly reporting rate | 0.2 (20%) | 0.1 – 0.35 | Geometric arrival; most of those who will report do so within six months. |
| `strategic_trace_delay_months` · Strategic Reserve trace time | 3 | 2 – 6 | Matching against HMRC, DWP and electoral records takes months and has never been exercised at scale. |
| `strategic_trace_yield_min` · Trace yield, low | 0.2 (20%) | 0.1 – 0.3 | Game design, within a 20–50% range. |
| `strategic_trace_yield_max` · Trace yield, high | 0.5 (50%) | 0.4 – 0.6 | Game design, within a 20–50% range. |
| `strategic_report_fraction` · Traced ex-regulars who report | 0.5 (50%) | 0.3 – 0.7 | Many will be over recall age or medically unfit; none have trained for years. |

### Conscription pool (ONS mid-2025) and public opinion

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `conscription_refusal_conversion` · Strong opponents who refuse the call-up | 0.25 (25%) | 0.1 – 0.5 | Saying you strongly oppose a policy is not the same as breaking the law when it applies to you, and most people comply. The nearest measurement the project has is HC 57: 25.5% of Army reservists served a compulsory call-out notice on Operation Telic did not report -- and those were volunteers who had signed up. A quarter of strong opponents gives 11-14% of a conscript intake failing to report, which is below that reservist figure and above zero. |
| `medical_pass_peacetime` · Medical pass rate, peacetime standard | 0.4 (40%) | 0.35 – 0.45 | Medical rejection is the single largest reason Army applicants fail; about half of adults say they would be ineligible. |
| `medical_pass_relaxed` · Medical pass rate, relaxed standard | 0.6 (60%) | 0.55 – 0.65 | Game design. |
| `medical_pass_wartime` · Medical pass rate, wartime standard | 0.75 (75%) | 0.7 – 0.8 | Game design. |
| `exemption_strict` · Exempted share, strict regime | 0.15 (15%) | 0.1 – 0.2 | Game design. |
| `exemption_broad` · Exempted share, broad regime | 0.35 (35%) | 0.3 – 0.45 | Game design. |
| `exemption_minimal` · Exempted share, minimal regime | 0.05 (5%) | 0.03 – 0.1 | Game design. |

### Training pipeline

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `phase2_weeks` · Phase 2 training length, average | 20 | 15 – 27 | Mid-point of the published 15–27 week range. HL1629 gives no average; Phase 2 length varies by trade. |
| `phase1_weeks_compressed` · Phase 1, compressed | 10 | 8 – 12 | Game design. |
| `phase2_weeks_compressed` · Phase 2, compressed | 12 | 8 – 16 | Game design. |
| `compressed_effectiveness_penalty` · Compressed syllabus effectiveness penalty | 0.15 (15%) | 0.1 – 0.25 | Game design. |
| `attrition_compressed_add` · Extra attrition, compressed syllabus | 0.05 (5%) | 0.03 – 0.1 | Game design. |
| `attrition_wartime_medical_add` · Extra attrition, wartime medical standard | 0.1 (10%) | 0.05 – 0.15 | Game design. |
| `attrition_relaxed_medical_add` · Extra attrition, relaxed medical standard | 0.04 (4%) | 0.02 – 0.08 | Interpolated between peacetime (+0) and wartime (+10pp). |
| `attrition_age_add_18_25` · Extra attrition, age band 18-25 | 0 | 0 – 0.02 | Basic training is designed around entrants of this age, and the training attrition rate is measured on an intake that is overwhelmingly this age, so the default band carries no adjustment. Zero as the reference. |
| `attrition_age_add_18_30` · Extra attrition, age band 18-30 | 0 | 0 – 0.02 | The default band, and the reference point. The training attrition rate (0.26) is measured on the Army's actual untrained intake, which sits inside it. Zero by construction. |
| `attrition_age_add_26_40` · Extra attrition, age band 26-40 | 0.05 (5%) | 0 – 0.1 | No figure for British Army training attrition by age at entry is published: the quarterly service personnel statistics give untrained intake and outflow but do not break either by age, so this is a frank assumption rather than a derivation, in the way the refusal conversion is. What it stands for is real and one-directional - a recruit in their thirties is more likely to be injured, medically downgraded or to leave for reasons outside training than one at 19 - and it is set at 5 points against a base of 26 because that is the same order as the relaxed medical standard's 4 points and below the wartime standard's 10, which are the two comparable adjustments already in the model. It exists because it is the only place an older band's cost can actually land: it charges throughput, where the medical standard and the exemptions regime only resize an eligible pool that never binds. Replace it if attrition by age at entry is ever published. |
| `attrition_age_add_18_65` · Extra attrition, age band 18-65 | 0.03 (3%) | 0 – 0.08 | The same assumption as the 26-40 band's, weighted down because this band is mostly younger people: two thirds of the 18-65 population is under 45, so the band's mean age at entry is below 26-40's even though its upper bound is far higher. |
| `capacity_purchase_annual` · Capacity per purchase | 5,000 | 3,000 – 8,000 | Roughly one additional Phase 1 training centre. |
| `capacity_standup_months` · Capacity stand-up time | 2 | 1 – 4 | Game design. |
| `civilian_instructor_capacity_annual` · Civilian instructor capacity | 2,000 | 1,000 – 4,000 | Game design. |
| `civilian_instructor_delay_months` · Civilian instructor lead time | 3 | 2 – 6 | Game design. |
| `equipment_lead_months` · Equipment lead time | 4 | 4 – 12 | Game design. The NAO puts the evidence against it: a decade of "lean" stockpiles and "just in time" delivery of spares has left no buffer to draw on, the MoD has had to earmark more than £5 billion over ten years to re-establish war holdings, and it records that "the lead time for replenishing stock and establishing war holdings presents challenges" (HC 315 para 2.20). The Army separately told the NAO that semiconductor lead times had gone from one to three weeks to more than fifty (para 2.5), though that is components rather than the clothing, body armour, helmet and rifle this parameter buys. Four months is therefore the optimistic end of the range, not the middle, and the range is widened upward to say so. Not raised, because moving it is a balance change and the NAO figures are not measurements of this quantity. |
| `vetting_throughput_monthly` · Vetting clearances a month | 2,000 | 1,000 – 4,000 | The share of UKSV throughput the Army could expect during a congestion, against a service that handles roughly fifteen thousand clearances a month across all of government. Sized so the ceiling is invisible on the baseline training estate (spare intake of a few dozen a month) and binding once capacity has been bought (spare intake 2,900-4,900). |
| `vetting_rescreen_throughput_monthly` · Vetting clearances a month while re-screening | 1,500 | 750 – 3,000 | Three-quarters of the ordinary congested throughput: re-screening work competes with new clearances for the same officers, so a review of past cases costs roughly a quarter of current capacity. |
| `contingency_equipment_delay_months` · Equipment slip after the contingency is spent | 3 | 1 – 6 | The contingency's first stated purpose is to fund new equipment projects (NAO 1.9); an emergency order for tens of thousands of sets is exactly that. Spent elsewhere, the order joins the queue rather than jumping it. Three months against an equipment lead time of four roughly doubles the wait, which is the right order of magnitude for losing your place in a programme the NAO already describes as delay-prone. |

### Effectiveness multipliers (modelling assumptions)

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `eff_regular` · Effectiveness: regular, trade-trained | 1 (100%) | 1 – 1 | Definitional reference point. |
| `eff_reserve_volunteer` · Effectiveness: volunteer reservist | 0.8 (80%) | 0.7 – 0.9 | Trained, but with fewer collective-training days per year than regulars. |
| `eff_ex_regular` · Effectiveness: ex-regular, recalled | 0.6 (60%) | 0.5 – 0.7 | Formerly fully trained; skills fade and fitness declines over the years since leaving. |
| `eff_strategic` · Effectiveness: Strategic Reserve, traced | 0.5 (50%) | 0.4 – 0.6 | Longer out of service than the tracked reserve, on average. |
| `eff_conscript_normal_start` · Effectiveness: conscript at graduation, normal syllabus | 0.5 (50%) | 0.4 – 0.6 | Trade-trained but with no collective training and no experience. |
| `eff_conscript_normal_cap` · Effectiveness cap: conscript, normal syllabus | 0.7 (70%) | 0.6 – 0.8 | Game design. |
| `eff_conscript_compressed_start` · Effectiveness: conscript at graduation, compressed syllabus | 0.35 (35%) | 0.25 – 0.45 | Normal-syllabus start less the compressed-syllabus penalty. |
| `eff_conscript_compressed_cap` · Effectiveness cap: conscript, compressed syllabus | 0.6 (60%) | 0.5 – 0.7 | Game design. |
| `eff_conscript_growth_monthly` · Conscript effectiveness growth | 0.05 (5%) | 0.03 – 0.08 | Game design. |
| `eff_conscript_unequipped` · Effectiveness: conscript, trained, unequipped | 0.25 (25%) | 0.15 – 0.35 | Game design. |

### Money

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `capacity_purchase_cost` · Capacity purchase cost | £50m | £25m – £150m | Game design; excludes the instructors, who are diverted rather than hired. |
| `civilian_instructor_cost_annual` · Civilian instructor contract cost | £15m | £8m – £30m | About 250 instructors at a fully loaded £60k each. |
| `equipment_cost_per_head` · Personal equipment per conscript | £4,000 | £2,500 – £6,000 | £2,000 of clothing plus body armour, helmet, rifle and load-carrying equipment; a £3.5–5k range is retained as plausible. |
| `reservist_award_annual` · Reservist Award top-up | £8,000 | £4,000 – £15,000 | The award covers the gap between civilian and military pay; the average is not published. |

### Political capital

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `bill_months_emergency` · National Service Bill, emergency procedure | 3 | 1 – 4 | Game design. |
| `bill_months_normal` · National Service Bill, normal procedure | 6 | 4 – 9 | Game design. |
| `cost_pc_allowance_per_month` · Treasury allowance per month of the campaign | £200m | £100m – £400m | Replaces a flat £5bn threshold that could not fire at Brigade or Division and fired once at Corps. The Treasury's tolerance is a budget voted for an operation, and a longer operation is voted a bigger one, so the allowance is sized to the campaign rather than fixed: 4 months buys £0.8bn, 12 months £2.4bn, 24 months £4.8bn. The level is anchored on the defence budget: £200m is 3.9% of one month of the 2025/26 defence budget (£5.19bn), the order of in-year flexibility a department can absorb before the Treasury takes an interest; the range runs 1.9% to 7.7% of a month's defence budget. A flat threshold cannot do this job at all, because it is charged every month against a total that only grows: measured over 40 seeds, lowering the flat figure far enough to charge the sensible strategy 6 political capital across a Division run charged it 36 across a Corps one. Two properties fixed the level inside the range. Below about £175m Corps gets materially harder than it is meant to be: a maximum-effort programme resigns on 35-40% of seeds rather than 18%. And the Equipment Plan's contingency must stay worth less than one whole step at Corps (£4.1bn against an allowance of £4.8bn = 0.85 steps, where the old flat £5bn gave 0.82), or drawing the contingency wins everywhere and the fork that action exists for closes. Above about £250m the mechanic is dormant at every rung, which is where it was. |
| `cost_pc_penalty_per_step` · Cost penalty per allowance step | 2 | 1 – 4 | Game design. The quantity it multiplies changed from a flat £5bn threshold to an allowance sized to the campaign; the charge per step did not. |
| `contingency_drawn_penalty_add` · Extra Treasury charge once the buffer is gone | 2 | 0 – 3 | The contingency exists to absorb unexpected cost increases (NAO 1.9). Spend it on the mobilisation and every subsequent overrun lands on the Plan instead of on the buffer, so the Treasury's tolerance narrows. Doubling the charge per step rather than adding one to it, because the crossover has to sit inside the spend the game actually produces: a full Corps run costs £4.6-11.1bn, so at +1 the draw was better everywhere and the decision was no decision. At +2 the draw wins while it clears your only step of Treasury pressure and loses from the second step on — crossover at about £9bn of cumulative cost, which sits between what a restrained Corps programme spends (6.8) and what an all-out one spends (9.7). |
| `pc_start` · Starting political capital | 70 | 50 – 70 | Started at 60 and was raised to the top of the range, so that a full programme of actions is feasible but tight. |
| `pc_baseline_drain` · Monthly drain | 1 | 0 – 2 | Game design. |
| `pc_delivery_per_credit` · Soldiers per point of political credit | 500 | 250 – 1,500 | One point per 500 delivered is one point per month's worth of the Army's own trained-strength gain (5,933 a year is 494 a month). The minister earns political credit at the rate at which the Army in peacetime produces soldiers, and only above it. It replaces an earlier bonus that was a share of the target and so unreachable at Corps scale. |
| `pc_delivery_max` · Monthly cap on delivery credit | 3 | 2 – 5 | The same 3 as the momentum bonus it replaces, so the best possible month is no larger than before; what changes is that an ordinary delivering month can now reach it. Uncapped, the month the reserves arrive would pay for the rest of the game. |
| `pc_refusal_per_charge` · Refusal cases per point of political capital | 200 | 100 – 600 | The mirror of the credit for delivery, and deliberately steeper: a soldier who arrives is a line in a statistical return, a conscript who refuses is a prosecution with a name. It replaced a flat 2 a month levied whenever willingness sat below a threshold - a switch that the Bill's age band, and nothing else in the game, reliably flipped. Cases carry over: what is not charged this month stays on the list, so no refusal is ever free and the total charged across a run is the total who refused divided by this figure. The carry-over is load-bearing rather than tidy. An address to the nation moves the refusal rate by about a tenth; rounded off month by month a tenth of a small number is nothing, and the first attempt at this charge left the address worth exactly zero in the scripted test runs - the same insensitivity as the threshold it replaced, in different clothes. The level holds the benchmark where the previous pass left it: at 1 per 200, a reserves-first programme pays 16 across a Corps run against the 12 the threshold charged it, and resigns on 35% of seeds, which is the figure unchanged. Above about 400 a restrained programme pays almost nothing and Corps falls to 5% resignations; below about 150 the programmes that conscript at scale are wiped out. Tuned over batches of 40 scripted runs. |
| `pc_refusal_max` · Refusal cases chargeable in a month | 1 | 1 – 4 | Court throughput, not a safety valve. However many refuse, only so many can be prosecuted in a month, so the charge is a standing drip rather than a spike - and because the remainder carries over, calling up more people makes the list run for longer instead of costing more per month. A minister who calls up several times the training estate's spare intake ends the run with a backlog the courts have not reached, which is reported and is the honest consequence: the government ends, the cases do not. The value is 1 because the step to 2 is the difference between a maximum-effort programme resigning on 28% of Corps seeds and on 90% of them, against the 20% the previous pass left it at; there is nothing between them, political capital being an integer currency. The cost of that choice: a programme that conscripts far past the training estate's capacity refuses fourteen times as many people as a restrained one and is charged the same 1 a month, so at Division it resigns on 45% of seeds where the flat threshold resigned it on 95%. It still fails the target by four fifths and still resigns on every Corps seed. |
| `pc_idle_grace_months` · Idle months tolerated | 2 | 1 – 4 | A minister may take a month to think and a second to consult. Beyond that, doing nothing visible reads as drift. |
| `pc_idle_penalty` · Penalty for a government seen to be doing nothing | 3 | 1 – 5 | Three times the baseline drain: visible inaction costs a government more than the crisis itself does. |
| `pc_cost_call_out_reserve` · Cost: call out the Army Reserve | -7 | -15 – -5 | Game design, tuned for balance. |
| `pc_cost_ninety_day_notice` · Cost: legislate 90-day notice | -4 | -8 – -3 | Game design, tuned for balance. |
| `pc_cost_recall_ex_regular` · Cost: recall the Ex-Regular Reserve | -6 | -12 – -4 | Game design, tuned for balance. |
| `pc_cost_trace_strategic` · Cost: trace the Strategic Reserve | -2 | -5 – -1 | Game design, tuned for balance. |
| `pc_cost_stop_loss` · Cost: stop-loss | -9 | -16 – -8 | Game design, tuned for balance. |
| `pc_cost_bill_emergency` · Cost: National Service Bill, emergency | -12 | -20 – -10 | Game design, tuned for balance. |
| `pc_cost_bill_normal` · Cost: National Service Bill, normal | -6 | -12 – -5 | Game design, tuned for balance. |
| `pc_cost_exclude_women` · Cost: exclude women | -5 | -8 – -3 | Game design. |
| `pc_cost_medical_relaxed` · Cost: relaxed medical standard | -2 | -5 – -1 | Game design, tuned for balance. |
| `pc_cost_medical_wartime` · Cost: wartime medical standard | -6 | -12 – -5 | Game design, tuned for balance. |
| `pc_cost_exemptions_minimal` · Cost: minimal exemptions | -8 | -14 – -6 | Game design, tuned for balance. |
| `pc_cost_band_18_25` · Cost: age band 18-25 | 0 | -4 – 0 | The narrowest band the Bill offers, and the one Parliament is least likely to resist: it conscripts the group that objects most loudly (18-24s, 45% strongly opposed) but the fewest people, almost none of them settled in work. Held at zero as the reference alongside the default band; the ladder above it prices the reach of the wider ones. |
| `pc_cost_band_18_30` · Cost: age band 18-30 | 0 | -4 – 0 | The default band, and the reference point for the other three. Zero by construction. |
| `pc_cost_band_26_40` · Cost: age band 26-40 | -8 | -14 – -4 | The first band whose lower bound is not 18, and the one the polling most favours: it is 6 points more willing than the default and has a quarter more people in it. What the poll cannot see is who is being taken. Every one of them is settled in work at or near peak earnings (their output per head is the highest of the four bands, 0.862), so the resistance is not the conscripts' but their employers' and their MPs'. Sized against the willingness gain it buys: crossing the willingness threshold stops a standing 2 a month, which is worth about 22 over a Division run, so 8 up front is a real price and not a prohibitive one. Tuned over batches of 40 scripted runs. |
| `pc_cost_band_18_65` · Cost: age band 18-65 | -14 | -22 – -8 | Legislating to conscript 38 million people, up to and including pensioners, is a far larger parliamentary undertaking than any of the other three, and it reaches every employer in the country at once. Priced above 26-40 because it is the widest reach and because, like 26-40, it clears the willingness threshold and so buys a standing monthly saving; without a price it was the strictly best band in the Bill, which is a clause that decides itself. |
| `pc_cost_expand_capacity` · Cost: expand training capacity | -3 | -6 – -2 | Game design, tuned for balance. |
| `pc_cost_compress_syllabus` · Cost: compress the syllabus | -5 | -9 – -3 | Game design, tuned for balance. |
| `pc_cost_civilian_instructors` · Cost: contract civilian instructors | -2 | -4 – -1 | Game design, tuned for balance. |
| `pc_cost_junior_entry` · Cost: reinstate junior entry | -1 | -2 – 0 | Game design. |
| `pc_cost_equipment_buy` · Cost: emergency equipment buy | -2 | -5 – -1 | Game design, tuned for balance. |
| `pc_address_first` · Address the nation, first | 8 | 5 – 12 | Game design. |
| `pc_address_second` · Address the nation, second | 4 | 2 – 6 | Game design. |
| `pc_address_subsequent` · Cost: third and later address | -5 | -8 – -2 | Mirrors the cost of blaming your predecessors again. Set below the idle penalty (3) on purpose: an address with nothing in it must cost more than saying nothing, or it becomes a free way to look busy. |
| `address_willingness_boost_pct` · Address willingness boost | 5% | 3% – 8% | Game design. |
| `address_willingness_months` · Address boost duration | 3 | 2 – 4 | Game design. |
| `pc_cost_raise_spending` · Cost: raise defence spending | -6 | -9 – -3 | Game design. |
| `raise_spending_threshold_multiplier` · Raise-spending effect | 2 | 1.5 – 3 | Game design: what 'unlocks a bigger budget' is taken to mean. |
| `pc_blame_first` · Blame the previous government, first | 3 | 2 – 5 | Game design. |
| `pc_blame_subsequent` · Blame the previous government, again | -5 | -8 – -3 | Game design. |
| `actions_per_turn` · Actions per month | 2 | 1 – 3 | Game pacing. |
| `pc_cost_accelerate_promotion` · Cost: accelerate promotion | -1 | -4 – -1 | Cheap, because a cadre course buys no buildings and no contracts: it is an internal personnel decision the Army can largely take for itself, where expanding the training estate (-3) cannot. It is not free, because a lever with no price is a lever with no decision. An escalating price was tried - the shape the repeated address to the nation uses - and abandoned, because political capital is abundant at Division and scarce at Corps: charging more for later courses left the Division ceiling where it was (55% to 58% of seeds meeting the target) and took an all-out Corps programme from 28% resignations to 65%. It priced the rung that did not need it and missed the one that did. What bounds this lever is the course length and the one-course-at-a-time rule, not its price. |

### Difficulty settings

| Parameter | Value | Range | Rationale |
|---|---|---|---|
| `target_brigade` · Brigade target | 10,000 | 5,000 – 10,000 | A brigade group with enablers. The regulars' uncommitted slice covers under half of it. |
| `deadline_brigade` · Brigade deadline | 4 | 4 – 12 | Set below 12 months: with 12 months the reserves alone make a brigade several times over. Five months means the Army Reserve's 180-day notice arrives too late; the puzzle is the 90-day amendment and the ex-regular recall. |
| `target_division` · Division target | 22,000 | 20,000 – 30,000 | A deployable division with enablers. |
| `deadline_division` · Division deadline | 12 | 9 – 18 | Game design. |
| `target_corps` · Corps target | 45,000 | 40,000 – 80,000 | Set below the 60,000 first asked for: the best scripted run reached about 32,000 effective soldiers by month 15 before political capital ran out. |
| `deadline_corps` · Corps deadline | 24 | 12 – 24 | Set above the 18 months first asked for: 18 months does not allow enough conscript cohorts to graduate and mature for 60,000 to be reachable by any strategy. |

## Derived figures

Figures computed from primary sources, with the arithmetic.

| Parameter | Value | Derivation | Source |
|---|---|---|---|
| `regular_outflow_intent_conversion` · Intention converted to departure each year | 0.2456 (25%) | Realised outflow over trade-trained strength = 3,311 / 70,951 = 4.6666% a year. Intention to leave early = 19%. 4.6666 / 19 = 0.2456. Carried to four places because the split has to reconstruct the published annual figure: 70,951 x 19% x 0.2456 = 3,310.9 against the 3,311 the Army reports. | [Derived from MoD, UK Regular Armed Forces Continuous Attitude Survey Results 2026, published 28 May 2026, Annex B Table B12.1 (question A173), Army; MoD Service Personnel Statistics, 1 July 2026, Tables 4 and 5d](https://www.gov.uk/government/collections/armed-forces-continuous-attitude-survey-index) |
| `training_attrition` · Training attrition | 0.26 (26%) | 2022 / 7771 = 0.260 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Tables 5a and 5c](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `junior_leaders` · Junior leaders | 29,563 | 10752 (OR-4) + 7404 (OR-6) + 5099 (OR-7) + 2047 (OF-1) + 4261 (OF-2) = 29563 | [MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Table 11a (rank structure at 1 April 2026)](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `junior_leader_ratio` · Soldiers per junior leader | 2.4 | Trade-trained strength over the junior-leader cadre = 70,951 / 29,563 = 2.4 | [Derived from MoD, UK armed forces quarterly service personnel statistics: 1 July 2026, Tables 3a and 11a](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `promotion_course_months` · Junior-leader cadre course | 2 | The paper's abstract states it assessed 'the British Army's 8-week Platoon Sergeant and Section Commander Battle Courses (PSBC, SCBC)'. Converted with the same weeks-to-months rounding the conscript course uses (section 5): round(8 x 12 / 52) = 2. | [Maroni TD, Myers SD, Draper J, Ashdown KM, Walker FS, Alexander B, Blacker SD (2025), 'An ergonomic assessment of British Army Infantry career training courses to identify opportunities for evidence-based interventions to enhance role-related physical fitness', Ergonomics 69(2), pp. 206-220](https://doi.org/10.1080/00140139.2025.2456538) |
| `promotion_cadre_size` · Junior leaders per cadre course | 206 | One course pulls forward about one month of the Army's own promotion output. Junior leaders are 29,563 of the 70,951 trade-trained, 41.67%; in a steady state the cadre holds its share, so the flow into it is 41.67% of the 5,933 a year the pipeline graduates = 2,472 a year, or 206 a month. | [Derived from MoD, UK armed forces quarterly service personnel statistics, Tables 3a and 11a (trained strength and junior-leader strength) and the Army's annual trained output](https://www.gov.uk/government/statistics/quarterly-service-personnel-statistics-2026/quarterly-service-personnel-statistics-1-july-2026) |
| `leaders_per_capacity_purchase` · Instructors per capacity purchase | 625 | Capacity bought per purchase over the instructor ratio = 5,000 / 8 = 625 | Derived from the capacity bought per purchase and the instructor ratio |
| `reserve_volunteer_deployable_fraction` · Reservists who actually deploy | 0.5 (50%) | Two stages. Structural: of 23,517 trained Army Reserve (SPS Table 6a), 1,720 are on full-time reserve service and 615 already mobilised, leaving 0.901 of the strength available to be served a notice. Empirical: 0.579 of notices served were accepted into service on Operation Telic 1. 0.901 x 0.579 = 0.522, held at 0.50. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves); MoD Service Personnel Statistics, 1 July 2026, Table 6a](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_mobilisation_acceptance_rate` · Reservists accepted per call-out notice | 0.579 (58%) | Operation Telic 1, Army, HC 57 Table 1: 3,787 accepted into service / 6,540 call-out notices served = 0.579. Tri-service the same table gives 5,221 / 8,492 = 0.615. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_exemption_application_rate` · Call-out notices contested | 0.247 (25%) | Operation Telic 1, HC 57 paragraph 113: 2,021 applications for exemption + 80 for deferral = 2,101, against 8,492 notices served (Table 1) = 0.247. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_exemption_employer_share` · Exemption applications made by employers | 0.455 (46%) | Operation Telic 1, HC 57 paragraph 113: of 2,021 applications for exemption, 920 were from employers and 1,101 from reservists. 920 / 2,021 = 0.455. | [Derived from House of Commons Defence Committee, Lessons of Iraq, Third Report of Session 2003-04, HC 57-I, chapter 5 (Use of Reserves)](https://publications.parliament.uk/pa/cm200304/cmselect/cmdfence/57/5709.htm) |
| `reserve_notice_days_default` · Army Reserve call-out notice | 180 | Readiness category R9 = 180 days, as stated in the amendment text; the Act itself sets no fixed period. | [Armed Forces Bill 2026, amendment papers (Select Committee, 14–15 Apr 2026): Army Reserve Group A standard notice is readiness category R9 (180 days)](https://publications.parliament.uk/pa/bills/cbill/59-01/0367/amend/armedforces_day_sc_0414.pdf) |
| `reserve_notice_days_amended` · Amended call-out notice | 90 | Proposed amendment, not enacted; the Government's reply was that readiness levels are reviewed annually. | [Armed Forces Bill 2026, amendment 24 (Public Bill Committee, sixth sitting, 16 Apr 2026): proposed reduction to R8 (90 days)](https://hansard.parliament.uk/Commons/2026-04-16/debates/3430fe85-c68e-4e24-b43c-e53fbcad227c/ArmedForcesBill(SixthSitting)) |
| `reserve_arrival_months_default` · Reservist arrival, default notice | 6 | 180 days ≈ 6 months; refresher assumed to overlap with the notice period. | Derived from the standard call-out notice period |
| `reserve_arrival_months_amended` · Reservist arrival, 90-day notice | 3 | 90 days ≈ 3 months. | Derived from the amended call-out notice period |
| `strategic_reserve_claimed` · Strategic Reserve, as claimed | 95,000 | Ministerial estimate as reported; the MoD's own impact assessment (27 Feb 2026) says efforts to improve contact information are under way. | [MoD press release, 15 Jan 2026 (recall age raised to 65) and Forces News, 15 Jan 2026: 'an estimated 95,000 people have a Strategic Reservist liability'](https://www.forcesnews.com/services/tri-service/strategic-reserve-age-limit-raised-65-so-more-can-be-recalled-should-war-loom) |
| `strategic_reserve_untracked` · Strategic Reserve not on record, Army share | 38,516 | (95000 - 34755) × (22221 / 34755) = 38516 | Derived from the claimed Strategic Reserve and the Ex-Regular Reserve on record |
| `ew_pop_26_40` · England and Wales, aged 26–40 | 12,727,220 | England and Wales aged 18-40 minus aged 18-25 = 18,665,415 - 5,938,195 = 12,727,220. Both are inclusive of their end years, so removing 18-25 from 18-40 leaves exactly 26-40; no figure outside the two already in this file is used. Checked against the ONS mid-2025 single-year-of-age table (MYE2): the subtraction matches the summed single years exactly. | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `ew_pop_f_26_40` · England and Wales, women aged 26–40 | 6,520,779 | Women in England and Wales aged 18-40 minus aged 18-25 = 9,419,482 - 2,898,703 = 6,520,779. Checked against the ONS mid-2025 single-year-of-age table (MYE2): the subtraction matches the summed single years exactly. | [ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/datasets/estimatesofthepopulationforenglandandwales) |
| `uk_population_scaling` · UK / England and Wales scaling | 1.1206 | 69,487,000 / 62,010,000 = 1.1206 | [ONS: UK mid-2025 provisional (69,487,000) and England and Wales mid-2025 (62,010,000)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/provisionalpopulationestimatefortheuk/mid2025) |
| `women_included_support_pct` · Public support for including women | 72% | 42 + 30 = 72 (n = 3,040 GB adults). | [YouGov daily results, 26 Jan 2024: should women be conscripted on the same basis as men (42%) or with some restrictions (30%)](https://yougov.com/en-gb/daily-results/20240126-2b544-3) |
| `willingness_start_pct` · Willingness to serve | 20% | 6 + 14 = 20. YouGov's own results page could not be located; figures are from secondary reporting. | [YouGov, July 2026, as reported 23 Jul 2026: 6% would volunteer, 14% would serve if conscripted](https://www.joe.co.uk/news/only-6-per-cent-of-brits-would-volunteer-to-fight-off-invasion-poll-reveals-539523) |
| `self_declared_ineligible_pct` · Self-declared ineligible | 52% | Secondary reporting; used for flavour only. | [YouGov, July 2026, as reported 23 Jul 2026: 52% say they would be ineligible on health or age grounds](https://www.joe.co.uk/news/only-6-per-cent-of-brits-would-volunteer-to-fight-off-invasion-poll-reveals-539523) |
| `conscription_willingness_adj_18_25` · Willingness adjustment, band 18-25 | -4% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 28.58% for 18-25, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `conscription_willingness_adj_18_30` · Willingness adjustment, band 18-30 | 0% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 32.84% for 18-30, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `conscription_willingness_adj_26_40` · Willingness adjustment, band 26-40 | 6% | Every single year of age from 26 to 40 falls inside YouGov's 25-49 group, so the population-weighted support for this band is that group's figure exactly: 39.0%, against 32.84% for 18-30. Difference 6.15, rounded to whole points. Checked against the other bands by subtraction: (35.68 x 18,665,415 - 28.58 x 5,938,195) / 12,727,220 = 38.99%, which is the same figure. This is the only band the Bill offers whose lower bound is not 18, and therefore the only one that does not contain the most hostile age group (18-24, 27% support, 45% strongly opposed). | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `conscription_willingness_adj_18_65` · Willingness adjustment, band 18-65 | 9% | Support (strongly + somewhat) by YouGov age group -- 18-24: 27%, 25-49: 39%, 50-64: 53%, 65+: 63% -- weighted by the England and Wales population of each single year of age inside the band gives 42.16% for 18-65, against 32.84% for 18-30. Difference rounded to whole points. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"; ONS, Estimates of the population for England and Wales, mid-2025 (MYE2)](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `refusal_strong_opposition_intercept` · Strong opposition at zero willingness | 66.2% | Least squares on YouGov's four age groups, (support%, strongly oppose%) = (27,45), (39,37), (53,24), (63,18): strongly oppose = 66.206 - 0.7738 x support, R2 = 0.994. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `refusal_strong_opposition_slope` · Strong opposition per point of willingness | -0.7738 | Slope of the same least-squares fit as the intercept above. | [Derived from YouGov, 4,205 GB adults, 28 May 2024: "Would you support or oppose it being made compulsory for all young people to either serve in the military for a year or spend one weekend every month for a year community volunteering?"](https://yougov.co.uk/politics/articles/49555-would-britons-support-a-return-to-national-service) |
| `phase1_weeks` · Phase 1 training length | 14 | Common Military Syllabus length as stated in the answer. | [House of Lords written question HL1629, answered 26 Feb 2020: Phase 1 at ATC Pirbright is 14 weeks](https://questions-statements.parliament.uk/written-questions/detail/2020-02-13/hl1629) |
| `syllabus_throughput_multiplier` · Compressed syllabus throughput | 1.5 | (14 + 20) / (10 + 12) = 1.55, rounded down to 1.5. | Derived from course lengths |
| `junior_entry_attrition` · Junior entry attrition | 0.34 (34%) | 2018–2023 average as reported. The course itself is 49 weeks (long) or 23 weeks (short); the two-year lead is set by the minimum deployment age. | [Forces News, 13 Nov 2025: AFC Harrogate non-completion averaged 34% over 2018–2023, the highest of any Army training establishment](https://www.forcesnews.com/services/gurkhas/gurkha-recruits-record-perfect-pass-rate-wider-army-dropout-figures-revealed) |
| `junior_entry_lead_months` · Junior entry lead time | 24 | UK policy: under-18s are not deployed on operations. Entry at 16 implies a two-year lead. | Derived from the minimum deployment age of 18 |
| `pension_employer_multiplier` · Pay to employer-cost multiplier | 1.735 | 1 + 0.735. The 2024 valuation reduces the rate to 52.3% from 1 April 2027. | [Armed Forces Pension Scheme annual accounts 2024–25: employer contributions paid at 73.5% of pensionable pay](https://www.gov.uk/government/publications/armed-forces-pension-scheme-annual-accounts-2024-to-2025) |
| `conscript_pay_annual` · Conscript pay | £24,800 | 12.71 × 37.5 × 52 = 24,784, rounded. | [National Living Wage, April 2026 (£12.71/hour)](https://www.gov.uk/national-minimum-wage-rates) |
| `training_cost_per_recruit` · Phase 1 training cost per recruit | £47,800 | Figure as reported; the parliamentary question reference could not be located. HL1629 gave £38,000 in 2020. | [Written answer (Luke Pollard MP to James Cartlidge MP), FY2023-24, as reported by UK Defence Journal, 22 Oct 2024](https://ukdefencejournal.org.uk/how-much-does-it-cost-to-train-a-british-army-recruit/) |
| `employer_assistance_daily` · Employer financial assistance | £110 | Cap on the employer's award as made; later amendments not checked. | [Reserve Forces (Call-out and Recall) (Financial Assistance) Regulations 2005, SI 2005/859, regulation 6(3)](https://www.legislation.gov.uk/uksi/2005/859/regulation/6/made) |
| `defence_budget_2025` · Defence budget 2025/26 | £62.3bn | 47,388.7 + 23,067.1 = £62,455.8m, reported as £62.3bn in the Commons Library briefing CBP-8175; the rounded figure is used. | [MoD Supplementary Estimate memorandum 2025-26: RDEL £47,388.7m + CDEL £23,067.1m](https://committees.parliament.uk/publications/51542/documents/286297/default/) |
| `output_per_worker_labour_share` · Output per worker, labour share | £51,100 | 1,511,529 / 29,590 ≈ £51,100 per employee. The brief's £53k could not be reproduced. | [ONS: compensation of employees 2025 (DTWM, £1,511.5bn) divided by employees (MGRN, 29.59m)](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/dtwm) |
| `output_per_worker_gross` · Output per worker, gross | £88,800 | 3,033,866 / 34,165 ≈ £88,800 per worker. | [ONS: GDP 2025 (YBHA, £3,033.9bn) divided by employment (MGRZ, 34.165m)](https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/ybha/pn2) |
| `gdp_age_multiplier_18_25` · Output multiplier, 18–25 | 0.407 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because the output-per-worker figure it scales is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `gdp_age_multiplier_18_30` · Output multiplier, 18–30 | 0.547 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because the output-per-worker figure it scales is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `gdp_age_multiplier_26_40` · Output multiplier, 26–40 | 0.862 | The same per-year quantity as the other bands (employment rate x mean gross weekly pay relative to the all-employee mean), weighted by the England and Wales population of each year, obtained by subtracting the 18-25 band from the 18-40 band: (0.717 x 18,665,415 - 0.407 x 5,938,195) / 12,727,220 = 0.862. It is the highest of the four because the band takes people at peak earnings and peak employment and none at all from the 18-24 group, where 59.1% are employed and those who are earn 43% of the all-employee mean. | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `gdp_age_multiplier_18_65` · Output multiplier, 18–65 | 0.762 | For each single year of age in the band: employment rate (A05: 18-24 59.1%, 25-34 84.5%, 35-49 85.1%, 50-64 72.2%, 65+ 13.3%) x that age group's mean gross weekly pay as a share of the all-employee mean (ASHE 6.1a: 18-21 329.4, 22-29 635.4, 30-39 809.6, 40-49 880.1, 50-59 840.7, 60+ 640.3, against 757.5 for all); weighted by the England and Wales population of each year. Mean rather than median because the output-per-worker figure it scales is itself a mean (compensation of employees / employees). | [Derived from ONS, Annual Survey of Hours and Earnings, Table 6.1a (gross weekly pay, all employee jobs, by age group), UK 2025 provisional; ONS, Labour market status by age group (Table A05 SA), UK, Apr-Jun 2026; ONS mid-2025 population estimates](https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/agegroupashetable6) |
| `strategic_reserve_untracked_tri_service` · Strategic Reserve not on record, all three Services | 60,245 | 95000 - 34755 = 60245 | Derived from the claimed Strategic Reserve and the Ex-Regular Reserve on record |

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

