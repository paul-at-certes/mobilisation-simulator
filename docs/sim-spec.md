# Simulation specification (v1)

The simulation is a pure function `step(state, input): GameState` in
`src/sim/step.ts`. No DOM, no globals, no `Math.random`. All numbers come from
`src/data/parameters.json` via `src/sim/params.ts` (`P.<id>`), never inlined.
Types are in `src/types.ts` and are the contract; do not change them without
updating this document.

Time: one turn = one calendar month. `turn` is the number of months elapsed;
the Day 0 briefing is turn 0. The game ends after the step in which `turn`
reaches `deadlineMonths` (the deadline turn is scored, no further actions), or
when political capital falls below 0 (`overReason: 'resigned'`).

## 1. Initial state (`newGame(seed, difficulty)`)

- `rngState` = seed (mulberry32; `src/sim/rng.ts` exposes `next(state) →
  { value, state }` returning a float in [0,1) and the new state).
- `target`, `deadlineMonths` from `target_<difficulty>` / `deadline_<difficulty>`.
- Pools:
  - `regularTrained` = `regular_trained_start` (70,951)
  - `regularUntrained` = `regular_untrained_start` (3,111)
  - `reserveVolunteerAvailable` = `reserve_volunteer_trained` (23,517); pending and mobilised 0
  - `exRegularTracked` = `ex_regular_tracked` (34,755); reported 0
  - `strategicUntracked` = `strategic_reserve_untracked` (60,245); traced 0
  - all conscript pools 0; `conscriptEligible` is computed when the Bill passes
- `politicalCapital` = `pc_start`; `willingness` = `willingness_start_pct`.
- `clauses` default: `{ ageBand: '18-30', includeWomen: true, medical: 'peacetime', exemptions: 'broad' }`.
- `pendingEvent`: drawn immediately (see §8) so turn 0 can show an event.
- `gauges`, `composition`, `ledger`, `briefing` computed by `derive(state)`.

## 2. Step order

```
step(state, input):
  s = clone(state)
  1. resolve pending event choice (input.eventChoice) → apply effects; log
  2. apply actions (input.actions): validate with availableActions(s); at most
     `actions_per_turn` non-free actions; unknown/unavailable actions are ignored
     with a note (the UI prevents them, the CLI may try them)
  3. advance one month: s.turn += 1
     a. legislation clock
     b. training capacity and instructors coming online
     c. equipment arrival
     d. regular pipeline: untrained → trained; regular recruiting intake
     e. conscription: call-up, medical/exemption filter, allocation to training or holding pool
     f. training cohorts graduate
     g. reserve arrivals; ex-regular reporting; strategic trace completes
     h. outflow (reduced, not stopped, by stop-loss — §7a)
     i. money (this month) and cumulative
     j. GDP loss (this month) and cumulative
  4. politics: PC changes for the month, willingness boosts expire, refusal penalty
  5. derive gauges/composition/ledger/briefing facts; push history
  6. game-over checks (PC < 0 → resigned; turn ≥ deadline → deadline)
  7. draw next pending event (if not over)
  return s
```

## 3. Actions

`availableActions(state): ActionAvailability[]` returns every ActionId with
availability and displayed PC delta. Rules:

| Action | Available when | Effect | PC |
|---|---|---|---|
| `call_out_reserve` {notice} | not yet called out | `reserveCalledOut = true`; `reserveNotice = notice`; schedule arrival of `reserveVolunteerAvailable × reserve_volunteer_deployable_fraction` (0.50, now derived from the Operation Telic 1 mobilisation yield — see `reserve_mobilisation_acceptance_rate`) at `turn + reserve_arrival_months_default` (180) or `_amended` (90). Move that many from Available → Pending. | `pc_cost_call_out_reserve`, plus `pc_cost_ninety_day_notice` if notice = 90 |
| `recall_ex_regular` | not yet active | `exRegularRecallActive = true; exRegularRecallMonth = turn` | `pc_cost_recall_ex_regular` |
| `trace_strategic_reserve` | not yet traced or in progress | `strategicTraceMonth = turn + strategic_trace_delay_months` | `pc_cost_trace_strategic` |
| `stop_loss` | not active | `stopLoss = true` | `pc_cost_stop_loss` |
| `introduce_bill` {procedure, clauses} | `billStatus == 'none'` | `billStatus = 'in_progress'; billPassesMonth = turn + bill_months_<procedure>; clauses = clauses` | `pc_cost_bill_<procedure>` plus clause costs (§3.1) |
| `amend_bill` {clauses} | `billStatus != 'none'` | merge clauses; recompute eligible pool if passed | clause costs for changed clauses only |
| `set_callup` {perMonth} | `billStatus == 'passed'` | `callupPerMonth = max(0, perMonth)` | 0 (free; no slot) |
| `expand_capacity` | always; note if `regularTrained` cannot spare `leaders_per_capacity_purchase` | `capacityPurchases += 1; capacityPurchaseMonths.push(turn + capacity_standup_months)`; `regularTrained -= leaders_per_capacity_purchase`; `ledger.juniorLeadersDiverted += 625`; cost `capacity_purchase_cost` | `pc_cost_expand_capacity` |
| `accelerate_promotion` | no course already running | `promotionCourseMonths.push(turn + promotion_course_months)` | `pc_cost_accelerate_promotion` |
| `compress_syllabus` | syllabus normal | `syllabus = 'compressed'` (affects cohorts starting from next month) | `pc_cost_compress_syllabus` |
| `contract_civilian_instructors` | not contracted | `civilianInstructors = true; civilianInstructorsMonth = turn + civilian_instructor_delay_months` | `pc_cost_civilian_instructors` |
| `junior_entry` | not taken | `juniorEntryTaken = true` (flavour only; briefing note explains why nothing happens) | `pc_cost_junior_entry` |
| `equipment_buy` | not ordered | `equipmentOrdered = true; equipmentArrivalMonth = turn + equipment_lead_months` | `pc_cost_equipment_buy` |
| `address_nation` | always | `addressCount += 1`; PC +`pc_address_first` (1st), +`pc_address_second` (2nd), `pc_address_subsequent` (negative) after; push willingness boost `{delta: address_willingness_boost_pct, until: turn + address_willingness_months}` | see effect |
| `raise_spending` | not raised | `spendingRaised = true` (cost threshold × `raise_spending_threshold_multiplier`) | `pc_cost_raise_spending` |
| `blame_predecessors` | always | `blameCount += 1`; PC +`pc_blame_first` first time, `pc_blame_subsequent` after | see effect |

### 3.1 Clause costs

`includeWomen = false` → `pc_cost_exclude_women`; `medical = 'relaxed'` →
`pc_cost_medical_relaxed`; `'wartime'` → `pc_cost_medical_wartime`;
`exemptions = 'minimal'` → `pc_cost_exemptions_minimal`. Charged when the
clause is set (on introduction, or on amendment if changed).

The **age band** is charged differently, because unlike the other three it is
never absent: every Bill has one, and `pc_cost_band_18_30` is the zero. The
charge is `pc_cost_band_<next> − pc_cost_band_<previous>` (the whole of the
band's cost on introduction), so widening costs the difference and narrowing
refunds it. The dearer bands are the ones that reach into employment: 26–40
takes people at peak earnings, 18–65 legislates for 38 million. Without a
price the band was the one clause that cost nothing, while being the clause
that moved the refusal caseload (§9a) more than anything else the player could
do. See `docs/design-review.md` F14 and F15.

## 4. Legislation and the eligible pool

When `turn >= billPassesMonth`: `billStatus = 'passed'` and

```
band     = clauses.ageBand
persons  = ew_pop_<band>  ;  females = ew_pop_f_<band>
base     = includeWomen ? persons : persons - females
eligible = base × uk_population_scaling × (1 − exemption_<regime>) × medical_pass_<standard> × eligiblePoolMultiplier
```

`conscriptEligible` = eligible minus conscripts already called. Recompute on
`amend_bill` (keeping already-called count).

## 5. Training capacity and the conscript pipeline

```
purchasedActive  = count of capacityPurchaseMonths ≤ turn
civilianActive   = civilianInstructors && civilianInstructorsMonth ≤ turn
annualCapacity   = (regular_gains_annual
                    + purchasedActive × capacity_purchase_annual
                    + (civilianActive ? civilian_instructor_capacity_annual : 0))
                   × (syllabus == 'compressed' ? syllabus_throughput_multiplier : 1)
                   × capacityMultiplier (event-driven, default 1)
monthlyCapacity  = annualCapacity / 12          // graduates per month the estate can produce
monthlyIntakeCap = monthlyCapacity / (1 − attritionFor(regular))   // entrants per month
```

Regular recruiting continues: each month `regular_untrained_intake_annual / 12`
enter `regularUntrained`; each month `min(regularUntrained, regular_gains_annual/12)`
move to `regularTrained` (the untrained pool is a steady-state buffer; do not
model regular cohorts individually). Regular recruits consume
`regular_untrained_intake_annual / 12` of `monthlyIntakeCap` first.

`spareIntake = max(0, monthlyIntakeCap − regular_untrained_intake_annual/12)`.

Conscription each month (only if `billStatus == 'passed'`):

1. `called = min(callupPerMonth, callupCapPerMonth ?? ∞, conscriptEligible)`; `conscriptEligible −= called`;
   `conscriptsCalledTotal += called`; `conscriptionEverActive = true` if called > 0.
   Called conscripts enter `conscriptCalled`.
2. Allocation: `toTrain = min(holdingPool + conscriptCalled, spareIntake)`.
   Holding pool has priority. Create one `TrainingCohort` for the month:
   `{ size: toTrain, startMonth: turn, graduationMonth: turn + courseMonths, syllabus, medical: clauses.medical, ageBand: clauses.ageBand }`
   where `courseMonths = round((phase1 + phase2 weeks) × 12 / 52)` (34 → 8; 22 → 5).
   Remainder → `holdingPool`. `conscriptCalled` → 0 after allocation.
3. Graduation: cohorts with `graduationMonth ≤ turn` graduate:
   `graduates = size × (1 − attrition)`, with
   `attrition = training_attrition + (syllabus compressed ? attrition_compressed_add : 0) + medicalAdd + ageAdd`
   (`medicalAdd`: peacetime 0, relaxed `attrition_relaxed_medical_add`, wartime `attrition_wartime_medical_add`;
   `ageAdd`: `attrition_age_add_<ageBand>`, 0 for a cohort saved before the field existed).
   The cohort carries the `medical` standard **and the `ageBand`** it was raised
   under: amending the Bill cannot change who is already on the course. The age
   band is charged here rather than on the eligible pool because this is the
   only place its cost can land — `medical_pass_*` and `exemption_*` resize a
   pool that never binds (design review F3, F4).
   Graduates become a `TrainedCohort { size, graduationMonth: turn, syllabus, equipped: equipmentArrived }`.
   `conscriptInTraining` is the sum of live training cohorts.
4. Equipment: when `equipmentArrivalMonth ≤ turn`, all trained cohorts become
   `equipped = true` and each newly equipped head is charged `equipment_cost_per_head`
   once (track `equippedCharged` in the cohort or charge on transition).
   `conscriptTrainedUnequipped` / `conscriptTrainedEquipped` are sums of cohorts.

Holding pool people are paid conscript pay and count for GDP loss but
produce nothing.

### 5.1 The vetting ceiling

`callupCapPerMonth` (null when absent) is a ceiling on how many people can be
called in a month, imposed by the `callup_cap` effect: nobody enters training
without a security clearance, so a congested vetting queue limits the call-up
regardless of what the training estate could take. The effect names a parameter
(`vetting_throughput_monthly`, `vetting_rescreen_throughput_monthly`) rather
than carrying a number, so the magnitude keeps its range and rationale;
`callupCapParam` records which one is in force, for the source popover. An
effect naming an id that is not in parameters.json is skipped with an
`unknown_param` note. The `durationMonths` stays a literal in the event: how
long a story runs is pacing, like `EVENT_FIRE_PROBABILITY`, not a claim about
the world. `callupCapUntil` is the last
month it applies (null = indefinite); it is cleared at the start of the month
after that, before the call-up runs. A second `callup_cap` while one is in
force keeps the tighter of the two ceilings and the later of the two expiries,
so an overlapping congestion never loosens the constraint. When the ceiling
binds, the step emits `callup_capped:<ceiling>:<uncalled>`; when it lifts,
`callup_cap_lifted`. Both are read by the briefing.

`vettingPriorityMonth` and `vettingRelaxedMonth` record when the military were
given first claim on the vetting teams (`vetting_priority`) and when the
standard was lowered (`vetting_relax`). They carry no arithmetic of their own:
they exist so that the consequences of those two choices can be triggered a
fixed number of months later, through the `vetting_priority_months` and
`vetting_relaxed_months` condition keys (−1 when the choice was never made).

## 6. Reserves

- Volunteer: `reserveArrivals` entries with `arrivalMonth ≤ turn` move from
  Pending to Mobilised. Effect `reserve_arrival_shift` shifts all pending
  arrival months (clamped to ≥ turn + 1).
- Ex-regular: if active and `turn ≥ exRegularRecallMonth + ex_regular_delay_months`:
  `reportable = exRegularTracked_initial × exRegularCeiling − exRegularReported`;
  `reporting = max(0, reportable) × ex_regular_report_rate_monthly`;
  move from Tracked to Reported.
- Strategic: when `strategicTraceMonth ≤ turn` and not done:
  `yield = uniform(strategic_trace_yield_min, strategic_trace_yield_max)` (one RNG draw);
  `traced = strategicUntracked × yield × strategic_report_fraction`;
  Untracked −= strategicUntracked × yield; Traced += traced; `strategicTraceDone = true`.

## 7. Outflow, effectiveness, ESE, leadership

### 7a. Outflow

Outflow is the product of two quantities that are measured separately, rather
than the constant it used to be (`src/sim/outflow.ts`):

```
annualRate = (outflowIntent / 100) × regular_outflow_intent_conversion
gross      = regularTrained × annualRate / 12
outflow    = stopLoss ? gross × stop_loss_leak_fraction : gross
```

`outflowIntent` starts at `regular_outflow_intent_pct` (19: the share of the
Army telling AFCAS it means to leave early) and is clamped to
[0, `outflow_intent_max_pct`]. `regular_outflow_intent_conversion` (0.2456) is
how much of that intention is realised within the year, and is **held
constant**: a minister cannot make somebody who wants to leave stay. What a
minister moves is the intention, through the `outflow_intent_add` effect and
through stop-loss.

Three properties are deliberate:

- **It reconstructs the published figure rather than replacing it.**
  70,951 × 19% × 0.2456 = 3,310.9 against the 3,311 a year the Army reports.
  The split buys a lever, not a new number.
- **It is proportional to the strength held**, not a flat draw, so the bathtub
  drains faster when it is fuller. The month's regular intake (3d) lands before
  the drain (3h), so the first month's outflow is a shade above the published
  monthly figure.
- **Stop-loss reduces outflow, it does not end it**, and adds
  `stop_loss_intent_add_monthly` to the intention for every month engagements
  are held open — from the month it is imposed. So what leaks past the
  compulsion grows while the compulsion is in force. That is its delayed cost,
  and it lands inside the run: there is no action to lift stop-loss.

Junior leaders lost = outflow × (`junior_leaders` / `regular_trained_start`),
accumulated in `ledger.juniorLeadersLostToOutflow`; `ledger.regularOutflowToDate`
accumulates the outflow itself.

### 7b. Effectiveness and leadership

```
leadersTotal     = junior_leaders − juniorLeadersLostToOutflow
leadersSpareable = leadersTotal × junior_leaders_spareable_fraction − juniorLeadersDiverted + leadersSpareableAdjust
ledPersonnel     = exRegularReported + strategicTraced
                 + conscriptInTraining + conscriptTrainedUnequipped + conscriptTrainedEquipped
leadersNeeded    = ledPersonnel / junior_leader_ratio
leadersRecalled  = (exRegularReported / junior_leader_ratio) × eff_ex_regular
leadersPromoted  = coursesCompleted × promotion_cadre_size × eff_promoted_leader   [§7c]
leadersAvailable = leadersSpareable + leadersRecalled + leadersPromoted
leadershipFactor = leadersNeeded == 0 ? 1 : clamp(leadersAvailable / leadersNeeded, 0, 1)
```

`junior_leader_ratio` is **derived**, not assumed: `regular_trained_start /
junior_leaders` = 70,951 / 29,563 = 2.4, the rate at which the Army mans itself
(SPS Tables 3a and 11a). The instructor ratio is a separate parameter,
`instructor_ratio` (8, assumption), and sets `leaders_per_capacity_purchase`
only. Two ratios doing two jobs: one leads soldiers in the field, one teaches
recruits in the training estate.

### 7c. Making junior leaders

```
promotionInstructors = coursesRunning × (promotion_cadre_size / instructor_ratio)
leadersPromoted      = coursesCompleted × promotion_cadre_size × eff_promoted_leader
leadersSpareable    −= promotionInstructors
leadersAvailable    += leadersPromoted
```

The `accelerate_promotion` action runs a cadre course: after
`promotion_course_months`, `promotion_cadre_size` trade-trained soldiers hold
junior rank. Historically this is war-substantive and acting rank, which is how
every mass mobilisation has answered the same problem, and it is the counter to
the constraint §7b imposes — without it the leadership factor is a wall rather
than a puzzle.

It is not a way out of it. Three things bound it:

- **They lead at `eff_promoted_leader`,** counted the way recalled ex-regulars
  are rather than added to the substantive cadre. A minister who promotes their
  way to a full establishment still commands a worse one.
- **The course borrows its instructors from the same cadre**, at the ratio the
  training estate uses, so the factor falls before it rises and a running course
  competes with `expand_capacity` for the same corporals. This is honest and
  small: 26 corporals against a spareable cadre of about 10,700.
- **One course at a time.** The battle school has one set of training areas and
  one directing staff. This is what actually bounds the rate, which is why it is
  a rule of the model and not a rule of thumb.

**The arithmetic favours the small gap, and that is the lesson rather than a
flaw.** A course is worth about 124 effective leaders. At Division the sensible
strategy finishes 326 short, so three courses finish the job; at Corps
`max_effort` finishes 19,751 short, which is 160 courses. You can complete a
division's cadre and you cannot build a corps's. See `docs/design-review.md`
F17.

`ledPersonnel` is everyone raised on top of the standing Army who does not
arrive in formed units. Mobilised volunteer reservists are excluded: the Army
Reserve's trained strength is held in sub-units that contain their own
corporals, sergeants and subalterns. Recalled ex-regulars both demand
leadership and supply it — a recall returns junior leaders in the Army's own
proportion, discounted by `eff_ex_regular` for the same rust that discounts
their soldiering.

Effectiveness per bucket:

| Bucket | Headcount counted | Effectiveness |
|---|---|---|
| Regulars (deployable slice) | `regularTrained × regular_deployable_fraction` | `eff_regular` |
| Volunteer reservists, mobilised | `reserveVolunteerMobilised` | `eff_reserve_volunteer` |
| Ex-regulars, reported | `exRegularReported` | `eff_ex_regular` × leadershipFactor |
| Strategic, traced | `strategicTraced` | `eff_strategic` × leadershipFactor |
| Conscript cohort, equipped | cohort size | `min(cap, start + eff_conscript_growth_monthly × (turn − graduationMonth))` × leadershipFactor, start/cap by syllabus |
| Conscript cohort, unequipped | cohort size | `eff_conscript_unequipped` × leadershipFactor |
| In training / holding / pending | not counted | 0 |

`forceReady` (ESE) = Σ headcount × effectiveness. `headcountCounted` = Σ of the
headcount column. `forceQuality = forceReady / headcountCounted` (0 if none).
`composition` groups these five rows (strategic separate from ex-regulars).

### 7.1 The projection (`forecast.ts`)

`forecast(state)` reports where Force Ready lands at the deadline if no
further decision is taken. It clones the state and runs `advanceMonth` for
`deadlineMonths − turn` months, then reads `computeForce`. It therefore holds
constant every decision in force (call-up, syllabus, capacity purchased,
recalls and traces under way, bill clock) and adds none.

What it deliberately omits, and why:

- **Politics.** `monthlyPcChanges` is not run and the game does not end on
  resignation inside a projection. The projection is a statement about the
  pipeline; a projection that resigned on the idle penalty would report the
  consequence of consulting it.
- **The event deck.** No event is drawn or resolved. Events are not knowable
  a month ahead, and a projection that drew them would be reporting the seed.
- **Random draws.** `advanceMonth` takes a `MonthOptions` argument; with
  `expectedDraws: true` an outstanding Strategic Reserve trace yields
  `(strategic_trace_yield_min + strategic_trace_yield_max) / 2` and the
  generator is left untouched. A projection may not spend the run's
  randomness, and must not claim to know which way a draw will fall.

Returns `{ forceReady, forceReadyPct, monthsProjected, meetsTarget }`.
`monthsProjected` is 0 once the deadline is reached, and the UI suppresses the
line in that case. Pure: the caller's state is unchanged (`tests/forecast.test.ts`).

## 8. Money and GDP

Monthly cost:

```
regularPay        = regularTrained × regular_pay_annual × pension_employer_multiplier / 12
conscriptPay      = (conscriptInTraining + holdingPool + trained) × conscript_pay_annual × pension_employer_multiplier / 12
conscriptTraining = Σ over live training cohorts: size × training_cost_per_recruit / courseMonths
reservistPay      = (mobilised + exRegularReported + strategicTraced)
                    × (regular_pay_annual × pension_employer_multiplier + reservist_award_annual + employer_assistance_daily × 365) / 12
equipment         = newly equipped heads × equipment_cost_per_head
capacity          = capacity_purchase_cost × purchases made this turn
civilian          = civilianActive ? civilian_instructor_cost_annual / 12 : 0
```

Only *incremental* cost should be shown to the player as "Treasury cost": the
regular Army is paid anyway. So `cumulativeCost` excludes `regularPay`;
`costBreakdown.regularPay` is still recorded for the ledger's information.
(Decision recorded in DECISIONS.md.)

GDP loss per month:

```
removed   = conscriptsCalledTotal (all still serving: called + holding + training + trained)
            + reserveVolunteerMobilised + exRegularReported + strategicTraced
monthlyGdpLoss = removed × output_per_worker_labour_share × gdp_age_multiplier_<band> / 12
```

The age multiplier applies to conscripts; reservists use 1.0.

**Cumulative output loss is reported and never charged.** It reaches the player
through the scoring screen (§11) and the `gdp_employers` event's trigger, and
through nothing else. A penalty on a share of annual GDP was tried and could
not fire: one step at the smallest defensible size is still several billion
pounds of lost output, and the largest cumulative loss any strategy produces at
any difficulty across 40 seeds is £4.35bn. The parameter had been sized for a
mobilisation an order of magnitude larger than the one the game models. See
`docs/design-review.md` F13.

### 8a. The Equipment Plan's contingency

The `draw_contingency` action spends the £4.1bn the Ministry of Defence holds
inside the Equipment Plan "to help fund new equipment projects or absorb any
unexpected cost increases" (NAO HC 315 ¶1.9). It is the only money in the
published account a minister could plausibly reach for at short notice.

```
chargeableCost     = max(0, cumulativeCost − (contingencyDrawn ? equipment_plan_contingency : 0))
costPenaltyPerStep = cost_pc_penalty_per_step + (contingencyDrawn ? contingency_drawn_penalty_add : 0)
```

The draw is worth `equipment_plan_contingency / allowance` steps of headroom,
so its value moves with the allowance (§9) and with the difficulty. At Corps
that is £4.1bn against £4.8bn — **less than one whole step**, which is the
property that keeps this a decision: if the contingency cleared a step on its
own, drawing would win everywhere. At Division it is 1.7 steps and clears the
whole charge, which is honest — the mobilisation there costs less than the
contingency holds — and the price is paid in the equipment slip instead.

It costs **no political capital**, which is the point, and carries two costs
instead:

- **Every later step of Treasury pressure costs more**, because there is no
  buffer left to absorb an overrun. The draw therefore wins while it clears
  your only step of pressure and loses from the second step on — a crossover
  just above £9.6bn of cumulative cost at Corps, which still sits between what
  a restrained Corps programme spends (£6.8bn) and what `max_effort` spends
  (£9.7bn). The bots resolve it 19 draw against 18 raising spending.
- **The emergency equipment order takes `contingency_equipment_delay_months`
  longer**, whether it was already placed (the arrival month slips) or is
  bought afterwards (it is quoted the longer lead time). The contingency's
  first stated purpose is funding new equipment projects; spent elsewhere, the
  order joins the queue rather than jumping it.

Against `raise_spending`, which costs 6 political capital and doubles the
threshold for the rest of the run, the contingency is the better buy on a
small programme and the worse one on a large — the fork the action exists for.

## 9. Politics (per month)

```
pcDelta  = −pc_baseline_drain
         + action costs (already applied at action time, but listed in pcReasons)
         − costPenaltyPerStep × floor(chargeableCost / allowance)   [§8a]
             where allowance = cost_pc_allowance_per_month × deadlineMonths
                               × (spendingRaised ? raise_spending_threshold_multiplier : 1)
         + min(pc_delivery_max, floor(delivered / pc_delivery_per_credit))
         − refusalCases                                              [§9a]
         − (idleMonths > pc_idle_grace_months ? pc_idle_penalty : 0)
```

`delivered` is the **headcount that reached units this month**: the month's
graduations (3f) plus its arrivals (3g) — reservists mobilised, ex-regulars
reported, the Strategic Reserve traced and reporting. Two exclusions are
deliberate:

- **The regular pipeline's own monthly gain does not count.** It arrives
  whatever the minister does, and crediting it would be an idle income: a
  minister who never pulls a lever must never earn political capital.
- **It is headcount, not effectiveness.** The credit is what a minister can
  announce; the score is what can fight. The gap between the two is the
  subject of the game, and the leadership factor (§7) does not soften it.

People sitting in the holding pool have not been delivered, so a call-up above
the training estate's spare intake buys no political credit either — the same
lesson the pipeline already teaches, charged again in the other currency.

This replaces the momentum bonus, which paid on a *share of target* and was
therefore unreachable at Corps scale (see `docs/design-review.md` F6, F9).

**The Treasury's allowance is sized to the campaign, not fixed.** The Treasury
votes a budget for an operation and a longer operation is voted a bigger one:
four months buys £0.8bn, twelve £2.4bn, twenty-four £4.8bn. A flat threshold
could not do this job, because it is charged every month against a total that
only grows, so any figure low enough to bite inside a Division run was an order
of magnitude heavier across a Corps one — which is why the mechanic had been
dormant at two of three difficulties rather than merely gentle. See
`docs/design-review.md` F13.

### 9a. The refusal caseload

```
refusalCaseload += refused this month                     [§10a, step 3e]
refusalCases     = min(pc_refusal_max, floor(refusalCaseload / pc_refusal_per_charge))
refusalCaseload -= refusalCases × pc_refusal_per_charge
```

Conscripts called up who do not report go onto a court list. Every
`pc_refusal_per_charge` of them costs one political capital, at most
`pc_refusal_max` a month, and **what is not charged this month stays on the
list**. Three properties follow, and all three are the point:

- **No refusal is free.** The total charged across a run is the total who
  refused divided by the rate. A small programme is not under a threshold; it
  is charged slowly.
- **An effect that moves the refusal rate moves the bill by its own size.** An
  address to the nation changes refusals by about a tenth, and therefore
  changes what is charged by about a tenth. Rounded off month by month, a tenth
  of a small number is nothing — which is how the first attempt at this charge
  made the address worthless, and why the carry-over is not a tidy-up.
- **The list can outlive the call-up.** The cap is court throughput, so calling
  up far over the training estate's spare intake makes the list run longer
  rather than cost more per month, and a minister can leave office with cases
  unheard. `Score.refusalBacklog` reports them.

This replaced a flat `pc_low_willingness_penalty` charged whenever
`effectiveWillingness` sat below a threshold. Willingness starts at 20 and the
threshold was 25, so of the four age bands two paid it in full and two did not
pay it at all, nothing else in the game reliably crossed the line, and the
clause therefore decided more than the polling behind it did. See
`docs/design-review.md` F15.

`effectiveWillingness = willingness + Σ active boosts`. Boosts with `until < turn` are dropped.

`idleMonths` counts consecutive months in which the minister took no action:
reset to 0 by any action that lands, incremented otherwise, before the month's
politics are worked out. A free action counts only if it changes something
(re-entering the same call-up figure does not). Answering an event card is not
an action and does not reset the run: the penalty is for a government that is
not seen to govern, and the deck is not the player's doing. The briefing warns
on the last tolerated month and explains the charge thereafter.

Record every non-zero contributor in `briefing.pcReasons`.

PC < 0 after the month → `over = true, overReason = 'resigned'`.

## 10. Events

`src/sim/events.ts`: `conditionVars(state): Record<ConditionKey, number>` and
`drawEvent(state): { eventId | null, rngState }`. Eligible = events whose
trigger passes (`minTurn ≤ nextTurn ≤ maxTurn`, `turnsRemaining` match, all
conditions true against the *post-step* state) and which have not fired
(unless `repeatable`). A `repeatable` event may also set `cooldownMonths`
(months since it last appeared, counted from `eventLog`) and `maxFires` (times
it may appear in one game). One weighted draw among eligible; a single extra
RNG draw decides whether any event fires at all: `P(fire) = 1` if eligible is
non-empty (constant `EVENT_FIRE_PROBABILITY` in events.ts, documented) — one
event a month whenever the deck has something to say, and none on the final
month, when the game is already over. The roll is still drawn at 1 so that
lowering the constant does not shift the sequence for a seed. Draw order is
fixed: fire-roll first, then weighted pick. Use exactly two RNG draws whenever
eligible is non-empty, one when it is empty (to keep the sequence stable).

`applyEffects(state, effects)` implements every `Effect` in `types.ts`.
`random` effects consume one RNG draw. `end_game` sets `over` with reason
`'event'`. `scoring_pc_if_missed` accumulates into `scoringPcIfMissed`, applied
by `score()` if the target is missed (it lowers PC in the score output only).

### 10a. Willingness, the age band and refusal

```
effectiveWillingness = willingness
                     + conscription_willingness_adj_<ageBand>
                     + Σ active boosts
strongOpposition     = clamp(0, 100, refusal_strong_opposition_intercept
                                     + refusal_strong_opposition_slope × effectiveWillingness)
refusalRate          = strongOpposition / 100 × conscription_refusal_conversion
```

At call-up (3e), `called × refusalRate` do not report. They leave
`conscriptEligible` — they have been called and are in the courts, not
available again — and are counted in `conscriptsRefusedTotal`, which the
conservation law in `tests/invariants.test.ts` includes.

**Why this exists.** Before it, the only thing willingness did anywhere in the
model was trigger `pc_low_willingness_penalty` below a threshold: it was
political capital with extra steps, which is why the design review counts
`willingness` effects as routing back to PC (F6). Refusal puts it **upstream of
the training pipeline** instead, so the age band, the addresses and every event
that moves willingness now decide how many soldiers arrive.

**The bands, and why one of them does not start at 18.** The Bill offers
18–25, 18–30, **26–40** and 18–65. Every band that starts at 18 contains the
most hostile age group (18–24: 27% support, 45% strongly opposed), so widening
one only dilutes that group and the whole clause moved willingness by about
three points. 26–40 is the only band with a movable lower bound, and every
single year of age in it falls inside YouGov's 25–49 group, so its support is
that group's figure exactly: +6 against the default where the 18–40 band it
replaced was worth +3. It is paid for in `pc_cost_band_26_40` (§3.1) and in
`attrition_age_add_26_40` (§5), because it is also the band that takes people
at peak earnings and peak employment. What it buys is a lower refusal rate, and
therefore a shorter court list (§9a) — in proportion to the gap in the polling,
rather than as a threshold the band either crosses or does not. See `docs/design-review.md` F14.

**Two properties worth preserving.**

- **Calling over capacity is insurance against refusal, and the premium is now
  paid in court.** A minister calling up exactly the spare training intake
  loses the refusers outright; one calling over capacity loses them out of a
  surplus that was going to sit in the holding pool anyway. The soldiers are
  still insured — but the refusers are now prosecuted (§9a), so the insurance
  has a price where it used to be free. The price is capped at the courts'
  throughput, which is a known under-charge on the largest call-ups and is
  recorded as such in `pc_refusal_max`'s rationale.
- **Refusal raises the leadership factor while lowering headcount.** Fewer
  conscripts is fewer people for the cadre to lead (§7), so a refused call-up
  is bad for the score and good for the quality of what remains. It also cuts
  graduations, and so the delivery credit (§9) — refusal costs political
  capital twice over, once through the income it forgoes and once through the
  court list it creates (§9a).

## 11. Scoring

`score(state): Score` in `src/sim/score.ts`:
- `met = forceReady ≥ target`; `resigned = overReason == 'resigned'`.
- Bands: quality `<0.45 low, ≤0.65 mid, else high`; leadership `<0.6 broken, ≤0.9 strained, else intact`; shortfall `≤ SHORTFALL_NEAR_FRACTION × target near, else clear` (a met run is `near`).
- `costPctDefenceBudget = cumulativeCost / defence_budget_2025 × 100`;
  `gdpLossPctGdp = cumulativeGdpLoss / uk_gdp_2025 × 100`.
- Verdict: pick from `verdicts.json` the first entry whose `met`/`quality`/`leadership`/`resigned`/`shortfall` match (`'any'`, or an omitted `resigned`/`shortfall`, are wildcards), fill `{placeholders}` from `VerdictVars` with formatted integers.
- **Selection is first-match, so order is meaning.** An entry placed after a
  wider one that subsumes it can never be chosen. Two states the model cannot
  produce have no verdict written for them and fall to the generic fallback by
  design: meeting the target with a broken cadre, and meeting it at low
  quality. Both are measured in `docs/design-review.md` F18, and
  `tests/content.test.ts` holds a test that every entry in the file can be
  reached and one that no verdict is written for the impossible states.
- `seedUrl`: `?seed=<seed>&difficulty=<difficulty>`.

## 12. Invariants (tests/invariants.test.ts)

For 1,000 fuzz runs with random seeds, difficulties and random legal actions:
- every pool ≥ 0 and finite
- `forceReady ≤ headcountCounted`
- `0 ≤ forceQuality ≤ 1`, `0 ≤ leadershipFactor ≤ 1`
- cumulative cost and GDP loss are non-decreasing
- `regularTrained + regularUntrained + outflow + diverted` is conserved apart from intake/gains
- conscripts conserved: called total = eligible drawn = in holding + training + trained + attrition lost
- the same seed and the same inputs give an identical final state (deep-equal)
- the game ends by `deadlineMonths` or earlier

## 13. CLI

`scripts/sim.ts` (run with `node --experimental-strip-types`):
`npm run sim -- --seed 42 --strategy reserves_only --difficulty division`.
Strategies live in `src/sim/strategies.ts` as pure functions
`(state) → TurnInput` so tests can reuse them:

All but `do_nothing` and the two conscription controls share `politicalUpkeep`:
at most one political lever a month, taken only when the arithmetic favours it
— the first two addresses (which pay), the one paying use of
`blame_predecessors`, `raise_spending` once the Treasury is actually charging
and with `RAISE_SPENDING_PAYBACK_MONTHS` left to pay it back, and a third
address (which costs) only when it would lift willingness back over the
refusal threshold. Discretionary spending keeps `PC_SAFETY_FLOOR` in hand; the
clearing address is exempt from the floor because it saves more than it costs.
`set_callup` is only emitted when the figure changes, since re-entering it is
not a decision and the simulation does not count it as one.

- `do_nothing` (the control: it takes no action ever, and wears the idle penalty)
- `reserves_only`: turn 0 call out reserve (90-day notice) + recall ex-regulars; turn 1 trace strategic + stop-loss; then political upkeep when PC < 30.
- `reserves_plus_light` — **the sensible strategy**, against which the brief's balance criterion (d) is measured: the reserves_only levers, then the smallest conscript programme that can graduate in time (bill, trace, compressed syllabus, civilian instructors, one capacity purchase, equipment, stop-loss), then political upkeep. Best performer at Division under the derived leadership ratio.
- `conscription_max_capacity` (a control: it deliberately never uses the political levers, to show what that failure mode costs): turn 0 bill (emergency, 18–30, women on, relaxed, broad) + equipment buy; turns 1–3 expand capacity ×2/turn until 4 purchases, then civilian instructors; when passed, set callup = spare intake capacity; compress syllabus at turn 1.
- `conscription_over_capacity`: as above but callup = 20,000/month and only one capacity purchase.
- `capacity_heavy` (named `mixed` until 11 September 2026): reserves_only levers in turns 0–1, then bill (emergency), equipment, 3 capacity purchases, callup at capacity, political upkeep thereafter. Now a control for over-buying capacity rather than the sensible play.
- `max_effort`: everything, paced — the ceiling of what the levers deliver; political upkeep and further capacity purchases once the script runs out.

Event choices: strategies pick choice 0 unless they define a policy.

Output: a per-turn table (turn, ESE, quality, leadership, PC, holding, in
training, trained, cost £bn, GDP £bn) and the score. `--all` runs every
strategy × difficulty and prints a summary matrix for the balance pass.
