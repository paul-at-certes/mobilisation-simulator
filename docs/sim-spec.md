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
     h. outflow (unless stop-loss)
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
| `call_out_reserve` {notice} | not yet called out | `reserveCalledOut = true`; `reserveNotice = notice`; schedule arrival of `reserveVolunteerAvailable × reserve_volunteer_deployable_fraction` at `turn + reserve_arrival_months_default` (180) or `_amended` (90). Move that many from Available → Pending. | `pc_cost_call_out_reserve`, plus `pc_cost_ninety_day_notice` if notice = 90 |
| `recall_ex_regular` | not yet active | `exRegularRecallActive = true; exRegularRecallMonth = turn` | `pc_cost_recall_ex_regular` |
| `trace_strategic_reserve` | not yet traced or in progress | `strategicTraceMonth = turn + strategic_trace_delay_months` | `pc_cost_trace_strategic` |
| `stop_loss` | not active | `stopLoss = true` | `pc_cost_stop_loss` |
| `introduce_bill` {procedure, clauses} | `billStatus == 'none'` | `billStatus = 'in_progress'; billPassesMonth = turn + bill_months_<procedure>; clauses = clauses` | `pc_cost_bill_<procedure>` plus clause costs (§3.1) |
| `amend_bill` {clauses} | `billStatus != 'none'` | merge clauses; recompute eligible pool if passed | clause costs for changed clauses only |
| `set_callup` {perMonth} | `billStatus == 'passed'` | `callupPerMonth = max(0, perMonth)` | 0 (free; no slot) |
| `expand_capacity` | always; note if `regularTrained` cannot spare `leaders_per_capacity_purchase` | `capacityPurchases += 1; capacityPurchaseMonths.push(turn + capacity_standup_months)`; `regularTrained -= leaders_per_capacity_purchase`; `ledger.juniorLeadersDiverted += 625`; cost `capacity_purchase_cost` | `pc_cost_expand_capacity` |
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
   `{ size: toTrain, startMonth: turn, graduationMonth: turn + courseMonths, syllabus, medical: clauses.medical }`
   where `courseMonths = round((phase1 + phase2 weeks) × 12 / 52)` (34 → 8; 22 → 5).
   Remainder → `holdingPool`. `conscriptCalled` → 0 after allocation.
3. Graduation: cohorts with `graduationMonth ≤ turn` graduate:
   `graduates = size × (1 − attrition)`, with
   `attrition = training_attrition + (syllabus compressed ? attrition_compressed_add : 0) + medicalAdd`
   (`medicalAdd`: peacetime 0, relaxed `attrition_relaxed_medical_add`, wartime `attrition_wartime_medical_add`).
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

Outflow (unless `stopLoss`): `regularTrained −= regular_voluntary_outflow_annual / 12`;
`ledger.regularOutflowToDate` accumulates; junior leaders lost =
outflow × (`junior_leaders` / `regular_trained_start`), accumulated in
`ledger.juniorLeadersLostToOutflow`.

```
leadersTotal     = junior_leaders − juniorLeadersLostToOutflow
leadersSpareable = leadersTotal × junior_leaders_spareable_fraction − juniorLeadersDiverted + leadersSpareableAdjust
ledPersonnel     = exRegularReported + strategicTraced
                 + conscriptInTraining + conscriptTrainedUnequipped + conscriptTrainedEquipped
leadersNeeded    = ledPersonnel / junior_leader_ratio
leadersRecalled  = (exRegularReported / junior_leader_ratio) × eff_ex_regular
leadersAvailable = leadersSpareable + leadersRecalled
leadershipFactor = leadersNeeded == 0 ? 1 : clamp(leadersAvailable / leadersNeeded, 0, 1)
```

`junior_leader_ratio` is **derived**, not assumed: `regular_trained_start /
junior_leaders` = 70,951 / 29,563 = 2.4, the rate at which the Army mans itself
(SPS Tables 3a and 11a). The instructor ratio is a separate parameter,
`instructor_ratio` (8, assumption), and sets `leaders_per_capacity_purchase`
only. Two ratios doing two jobs: one leads soldiers in the field, one teaches
recruits in the training estate.

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

## 9. Politics (per month)

```
pcDelta  = −pc_baseline_drain
         + action costs (already applied at action time, but listed in pcReasons)
         − cost_pc_penalty_per_step × floor(cumulativeCost / (cost_pc_penalty_threshold × (spendingRaised ? raise_spending_threshold_multiplier : 1)))
         − gdp_pc_penalty_per_step × floor((cumulativeGdpLoss / uk_gdp_2025 × 100) / gdp_pc_penalty_step_pct)
         + (forceReady − previous forceReady ≥ pc_momentum_threshold × target ? pc_momentum_bonus : 0)
         − (conscriptionEverActive && effectiveWillingness < willingness_low_threshold_pct ? pc_low_willingness_penalty : 0)
         − (idleMonths > pc_idle_grace_months ? pc_idle_penalty : 0)
```

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

## 11. Scoring

`score(state): Score` in `src/sim/score.ts`:
- `met = forceReady ≥ target`; `resigned = overReason == 'resigned'`.
- Bands: quality `<0.45 low, ≤0.65 mid, else high`; leadership `<0.6 broken, ≤0.9 strained, else intact`.
- `costPctDefenceBudget = cumulativeCost / defence_budget_2025 × 100`;
  `gdpLossPctGdp = cumulativeGdpLoss / uk_gdp_2025 × 100`.
- Verdict: pick from `verdicts.json` the first entry whose `met`/`quality`/`leadership`/`resigned` match (`'any'` wildcards), fill `{placeholders}` from `VerdictVars` with formatted integers.
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
