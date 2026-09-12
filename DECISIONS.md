# Decisions log

Decisions taken during the first build (11 September 2026) while Paul was away
from the desk, with reasoning. Items marked **ASK** are ones Paul should
confirm or overrule at the check-in.

## Companion files

- The brief lists three companion files. Only the design brief was in the
  working directory. The SPS 1 July 2026 accessible tables were in
  `~/Downloads`, so every SPS figure in the brief was checked against the
  workbook directly (all matched). `docs/sps_1jul2026_key_figures.csv` was
  transcribed from it.
- The ONS mid-2025 single-year-of-age table was not on disk. I downloaded
  `mye25tablesew.xlsx` from ons.gov.uk and generated
  `docs/ew_population_single_year_mid2025.csv` from the England and Wales row.
- The parameter table (`conscription-calculator-parameters.md` v0.7) was not
  available. `src/data/parameters.json` was built from the figures quoted in
  the brief plus the two primary datasets above. Secondary-source figures the
  brief attributes to the parameter table (YouGov polls, HL1629, pay rates,
  the 95,000 Strategic Reserve claim, £49k training cost, the GDP-per-worker
  figures) are tagged `derived` with the brief's citation and a note in
  `ASSUMPTIONS.md`; a background search pass tried to attach primary URLs.
  **ASK:** please drop the parameter table into `docs/` so the citations can be
  completed.

## Modelling decisions that go beyond the brief

1. **Regulars count only through a "deployable slice".** As written, the
   brief's balance criteria cannot all hold if the whole regular Army counts
   toward Force Ready: 70,951 regulars at effectiveness 1.0 would meet Division
   on Day 0. The brief also wants a winning mixed strategy to land at Force
   Quality ≈ 0.6, which is only possible if regulars (effectiveness 1.0) are a
   minority of what is counted. So Force Ready counts
   `regular_deployable_fraction` (assumption, default 0.05 after the balance pass, range 0.03–0.20) of
   the trade-trained strength, on the premise that the division is raised on
   top of the standing Army's existing commitments. The full regular strength
   still appears in the ledger and still drains through outflow. **ASK.**

2. **Leadership factor uses a "spareable" cadre.** The brief's formula
   `min(1, available_junior_leaders / (recruits_in_training / 8))` never
   bites: 29,563 leaders support 236,000 recruits at 1:8. To make the
   Russian-2022 mechanic real, the model assumes only a fraction of the cadre
   (`junior_leaders_spareable_fraction`, default 0.3) can be taken out of
   regular units to instruct or lead new formations. Each capacity purchase
   diverts 625 of them; conscripts in training and fielded conscripts each
   need 1 leader per 8. Factor = min(1, spareable / needed), applied to every
   conscript bucket. Reservists and ex-regulars bring their own rank structure
   and are excluded from the denominator.

3. **Training capacity is shared with regular recruiting.** Regular untrained
   intake (7,771/yr) continues during the game and uses the baseline pipeline
   first; conscripts get whatever is left. At baseline that is almost nothing
   (5,933 output vs ~5,750 regular graduates), which is the point: you cannot
   conscript without buying capacity or compressing the syllabus.

4. **Bill clauses are set when the Bill is introduced.** Age band, women,
   medical standard and exemptions are clauses of the National Service Bill,
   chosen when it is introduced (as legislation actually works). They can be
   amended later with `amend_bill`, which costs an action slot. Monthly call-up
   size is a free control that does not consume a slot.

5. **Ex-Regular Reserve is the Army-only figure (22,221).** The brief says
   34,755, which is the tri-service Ex-Regular Reserve (SPS Table 8a) and
   includes Royal Navy and RAF veterans who would not be soldiers in a
   division. The recall pool uses the Army Regular Reserve (22,221, same
   table); the tri-service figure is kept as `ex_regular_tracked_tri_service`
   because it is the number ministers quote and the events quote it. **ASK.**

6. **Reservist turnout.** The trained Army Reserve is 23,517 but includes
   people already mobilised, on full-time service, and medically downgraded.
   `reserve_volunteer_deployable_fraction` (assumption, 0.5 after the balance pass) discounts it; since October 2016 the Army Reserve "trained" figure counts Phase 1 completion (SPS note 32).
   Ex-regulars report geometrically (20%/month of a 50% ceiling) after a
   3-month delay.

7. **RNG state lives in the game state.** `step(state, input)` rather than
   `step(state, actions, rng)`: the mulberry32 state is a field of `GameState`,
   so a run is fully replayable from `?seed=` and the state is serialisable.
   The next turn's event is drawn at the end of the previous step so the RNG
   order is fixed regardless of UI timing.

8. **"Raise defence spending"** doubles the cumulative-cost threshold at which
   the Treasury penalty starts (the brief says "unlocks bigger £ budget").

## Questions from §12 of the brief

- RN and RAF: **not represented**; the methodology page says so.
- Steadfast Defender 2027 easter egg: **left out of v1**. I could not verify
  the direction to exercise Strategic Reserve call-up during it, and the
  rule is never to quote a number or fact without a source. Easy to add.
- Verdict text: **anonymous** ("the general", "the Chief").
- Visual direction: restrained government-document aesthetic, off-white,
  one accent colour, system fonts, no imagery.

## Stack

- Vite + TypeScript + vanilla DOM. No Preact: five screens and a handful of
  components do not justify a framework, and the bundle should stay small for
  LinkedIn's in-app browser.
- Vitest for tests. `npm run sim` for the CLI balance runner.
- GitHub Pages via a workflow in `.github/workflows/deploy.yml`; `BASE_PATH`
  env sets the Vite base. The repo has been `git init`-ed locally but nothing
  has been pushed: creating the remote and enabling Pages is Paul's call.

## Balance pass (11 September 2026, CLI `npm run sim -- --all`)

Only assumption-tagged parameters were changed, each within its stated range,
plus the difficulty table (which the brief allows). Primary figures untouched.

**Findings before tuning (brief's numbers as written):**

- Reserves alone made Division with 138% of target. The brief expected them
  to "nearly make Brigade". Two reasons, both sourcing rather than tuning:
  the 34,755 Ex-Regular Reserve is tri-service (Army-only is 22,221, SPS
  Table 8a), and the Army Reserve "trained" strength has counted Phase 1
  completion since October 2016 (SPS note 32), so it is not comparable to the
  regular trade-trained figure.
- Every strategy that pulled more than four levers resigned by month 3. The
  brief's action costs sum to roughly 90 political capital for a full mixed
  strategy against a budget of about 75.
- Corps (60,000 in 18 months) was unreachable by any strategy: conscript
  cohorts cannot graduate and mature fast enough, and the junior-leader
  factor bites at scale.

**Changes:**

| Parameter | Brief | Now | Why |
|---|---|---|---|
| `ex_regular_tracked` | 34,755 (tri-service) | 22,221 (Army) | An Army division needs soldiers; RN/RAF veterans kept as `ex_regular_tracked_tri_service` for the public-claim events |
| `strategic_reserve_untracked` | 60,245 | 38,516 | Army share of the untracked pool, same ratio |
| `reserve_volunteer_deployable_fraction` | 0.6 | 0.5 | Phase-1-only personnel, FTRS and already-mobilised inside the "trained" figure |
| `regular_deployable_fraction` | 0.10 | 0.05 | Do-nothing was 92% of Brigade on its own |
| Action PC costs (14 of them) | brief values | roughly two-thirds | So a full mixed strategy is feasible but tight |
| `pc_start` | 60 | 70 | Top of range |
| `pc_momentum_bonus` | 2 | 3 | Rewards visible progress (since replaced by the delivery credit — see *Political capital you can earn*, below) |
| `willingness_low_threshold_pct` | 30 | 25 | An address (+5 on 20) now lifts willingness clear of the refusal-cases penalty for three months, so addresses are a real counter rather than a flat tax |
| `deadline_brigade` | 12 | 5 | With 12 months reserves make a brigade three times over; five months makes the 180-day notice period the puzzle |
| `deadline_corps` | 18 | 24 | Conscript cohorts need time |
| `target_corps` | 60,000 | 45,000 | See below |

**Results after tuning (seed 42 unless stated):**

| Strategy | Brigade (8,000/5m) | Division (25,000/12m) | Corps (45,000/24m) |
|---|---|---|---|
| do nothing | 45% | 15% | 6% |
| reserves only | 243%, met | 90% | 39% |
| conscription at capacity | 43% | 22%, resigned m11 | resigned m11 |
| conscription over capacity | 45%, holding pool 37k | 21%, holding pool 142k, PC 14 | resigned m16, holding pool 215k |
| mixed (bill and capacity first) | met | 91–102% over 10 seeds, quality 0.64–0.67, met in 3 of 10 | resigned m17 |
| max effort | met | 89% | 29–32k then resigned m15–17 |

- Brief criteria: (a) do-nothing fails Division ✓; (b) reserves-only nearly
  makes Brigade ✗ — impossible with honest reserve numbers, so Brigade was
  shortened instead; (c) over-capacity produces a large holding pool, low
  quality and PC collapse ✓; (d) a sensible mixed strategy makes Division at
  quality ≈ 0.6: on a knife-edge, event-dependent, which is where the
  headline mode should be ✓.
- **Corps is not winnable.** The ceiling with every lever is about 32,000
  effective soldiers before political capital runs out. The opening screen
  says so ("Nobody has managed even this in testing"). This is the finding
  the brief anticipated: conscription in a 24-month window delivers about
  10,000 effective soldiers from 20,000 trained bodies, because the pipeline
  is slow and the leadership cadre thins. **ASK:** keep Corps as a deliberately
  unwinnable mode, or lower it further.
- The conscription-only strategies resign not because of cost but because
  the refusal-cases penalty (−2/month) plus the crisis drain (−1/month) exceed
  the income of a player who never addresses the nation. Addressing the
  nation every three months is now the intended counter.

## Event cadence (11 September 2026)

- **One event a month.** `EVENT_FIRE_PROBABILITY` went from 0.75 to 1: every
  month that has an eligible event shows it. The fire roll is still drawn so
  that turning the constant back down does not shift the sequence for a seed.
  The final month never shows one — the game is already over when the draw
  would happen.
- **Three events may repeat** with a `cooldownMonths` (4–6) and a `maxFires`
  cap (2–3): the Opposition day, the NATO liaison visit and the PAC hearing.
  All three are summonses or visits from an institution outside the Department
  that exists to repeat them. The test is whether the event is a recurring
  process of government whose prose reads the same the second time. Ten were
  marked repeatable at first and seven were reverted on review: five because
  they are single incidents told with unique detail (the fire-extinguisher
  resignation, the photographs from the barracks, the three named NHS trusts,
  the employers' joint letter, the poll bounce attributed to a particular
  address), then the leaked briefing note and notices to quit on Paul's
  reading — a leak and a wave of resignations land once in a story, whatever
  the underlying process does. A truly random one-off should happen once.
  `tests/content.test.ts` pins the repeatable list so that adding to it is a
  deliberate act.
- **What it costs.** Over 6 strategies × 60 seeds: events per game rise from
  4.0 to 5.0 (Brigade), 8.0 to 10.7 (Division), 9.9 to 13.5 (Corps). Mean
  final political capital falls about 4 points and the Division resignation
  rate roughly doubles (9% → 19% for the scripted strategies, which never
  manage PC well). The deck costs PC on average, so more events is a
  difficulty increase as well as a texture one. **ASK:** if that is too harsh,
  the dials are the `maxFires` caps or the monthly PC income, not the cadence.
- **The deck still runs out in long games.** With 30 events and only three of
  them repeatable, Brigade is covered every playable month and active play
  reaches ~92% of months at both Division and Corps, but passive play falls to
  29–47% at Corps, because most triggers are conditioned on things a passive
  player never causes. Filling a
  24-month game properly needs more content, and the content test deliberately
  caps the deck at 30. **ASK:** whether to write a further tranche of events
  (the honest filler would be number-free, so no new sourcing) and raise the
  cap.

## A government seen to be doing nothing (11 September 2026)

- **The mechanic.** `idleMonths` counts consecutive months in which the
  minister takes no action. Past `pc_idle_grace_months` (2) the month costs
  `pc_idle_penalty` (3) political capital, and keeps costing it until a lever
  is pulled. Two months of thinking are free; a third month of visible
  nothing is not. Both values are assumptions in `parameters.json` with
  ranges, so they are tunable like everything else.
- **What counts as a lever.** Any action that lands. Answering an event card
  does not: the deck is not the player's doing, and a minister who only reacts
  to the newspapers is precisely the one the mechanic is about. A free action
  counts only when it changes something — re-entering the same call-up figure
  is not a month's work. (This is why `conscription_over_capacity`, which
  re-sets the same call-up every month, is charged for 44% of its months.)
- **The player is never trapped.** Across 5,649 bot turns there was no turn
  with zero available actions; the minimum was six. The penalty is always
  avoidable.
- **What it costs.** Active play is barely touched — `mixed` and `max_effort`
  are charged on 0–5% of months. Passive play is punished as intended:
  `do_nothing` is charged on 83–88% of months and now resigns before the Corps
  deadline rather than coasting to it. Across 6 strategies × 60 seeds the
  Division resignation rate goes from 19% to 33% and Corps from 67% to 100%,
  though most of the Corps figure was already there.
- **The empty gesture now costs (Paul's decision).** `address_nation` paid +8,
  then +4, then nothing, and stayed available for ever — so a player could
  dodge the idle penalty by addressing the nation every month with nothing to
  announce. Third and later addresses now cost `pc_address_subsequent` (−5),
  mirroring `pc_blame_subsequent`. The value is deliberately larger than the
  idle penalty (3): an address with nothing in it must cost more than saying
  nothing, or the loophole survives in a cheaper form. The willingness boost
  still applies every time, so a late address stays a real if expensive tool
  rather than a dead button.
- **The bots were fixed before reading the matrix (11 September 2026).** The
  scripted strategies were written against the old PC rules and misplayed the
  new ones, so the balance matrix was libelling them. Three changes in
  `strategies.ts`: a shared `politicalUpkeep` ladder that takes the paying
  levers first and only buys a costing address when it would clear the refusal
  threshold; a `PC_SAFETY_FLOOR` so a strategy does not spend its last capital
  on an optional lever (`max_effort` was raising defence spending at −6 while
  holding 3, and resigning on it); and `set_callup` emitted only when the
  figure changes. With the same rules, `max_effort` at Division goes from 45%
  resignations to 13% and `reserves_only` at Corps from 100% to 93%. `mixed`
  moved the other way (3% → 10%), which is within the noise of 40 seeds and
  mostly its new willingness to raise spending. `do_nothing` and the two
  conscription strategies were deliberately left naive: they are the controls
  that show what never touching the political levers costs.
- **Together they cost the passive player about four months.** Across 6
  strategies × 60 seeds, mean game length at Corps falls from 18.3 months to
  14.0 and every scripted strategy now resigns there; at Division the
  resignation rate goes 9% → 36%. The bots are a poor proxy for a human —
  `reserves_only` addresses the nation whenever PC < 30, which is now
  self-harm, and no human would keep doing it — but the direction is real.
  **ASK:** if Corps should end in a shortfall verdict rather than a
  resignation, the dial is not the idle penalty. Tracing the PC ledger month by
  month shows why: after about month 7 there is no renewable political capital
  at all. The addresses are spent, blame is spent, and the momentum bonus
  (5% of target in a month) is out of reach at Corps scale, so the best
  possible month is −1 and every event is a net negative. The PC economy funds
  roughly 12–15 months of play; Corps is 24 months long. Lowering
  `pc_momentum_threshold` to 0.04 or 0.03 (both inside its range) was tried:
  it helps Division (36% → 24% resignations) and does nothing for Corps,
  because the bots are not delivering 1,350 effective soldiers a month that
  late either. The real fix, if one is wanted, is renewable political capital
  for *delivering* — crediting graduations or arrivals — which is what the
  momentum bonus was meant to do. That is a design change, not a parameter
  nudge, and it should wait for one human Corps playthrough.
- **Resigning does not cost the player the lesson.** `resigned_generic` reports
  Force Ready against target, headcount and the month, so the shortfall is
  still on the screen; it is framed as a political failure rather than a
  mobilisation one. A minister who runs out of political capital in month 15
  is a coherent — arguably the truest — ending for this game.

## UI notes from the first playthrough

- **The holding pool has its own indicator (11 September 2026).** It was only
  in the collapsed ledger, so the game's central failure mode — a call-up rate
  above the training estate's spare intake, producing paid and idle people who
  count for nothing — was invisible unless the player went looking. It now sits
  under the gauges whenever the pool is not empty, with the month's change and
  how many months the current spare intake would need to clear it (against how
  many months are left). It is deliberately not a fourth gauge: it has no
  target and no good value, and an empty pool says nothing worth a tile. It
  also names the way out, because nothing else in the interface did: the words
  "holding pool" appeared only in the call-up copy and the briefing, while the
  three actions that actually drain it — capacity, civilian instructors, a
  shorter syllabus — talked about "trained output" and never connected the two.
  The indicator now names all three, adds "a lower monthly call-up would stop
  it growing" while it is growing, and `expand_capacity` says that new places
  are filled from the holding pool and the month's call-up together.
- **And it says when nothing can save them.** Only a conscript who graduates
  counts, so the question is not when a place opens but whether one opens early
  enough to finish the course. A cohort forming in month T graduates in
  T + course, so the last useful start month is `deadline − course`. That gives
  three states, computed by `holdingOutlook()` and unit-tested: *clearable*,
  which also reports how many of them could start in time at the current
  intake; *compress_only*, when the standing syllabus can no longer finish but
  a compressed one still can; and *too_late*, when even the shortest course
  cannot, which is the one case where the interface says outright that the
  people in the pool will be paid to the deadline and never counted. Nothing a
  player can buy shortens the course below the compressed syllabus, which is
  what makes that safe to state as fact rather than as discouragement.
- **The monthly call-up says that it persists.** The checkbox is unticked every
  month because the decisions menu is rebuilt each turn, which read as though
  the call-up had lapsed; the figure is in fact in force until changed. The
  copy now says so. (Re-entering the same figure is not a decision and does not
  reset the idle-months counter, so ticking it out of habit does nothing.)
- Every parameter-based number in briefings, action descriptions, the event
  cards, the ledger and the scoring screen goes through the sourced popover.
  Computed values (Force Ready, political capital, costs) are shown plain;
  the methodology page explains how they are computed.
- `?auto=<strategy>` plays a scripted strategy to the end. Useful for
  reviewing the scoring screen and share card without twelve clicks.
- Lighthouse was not run (no headless Lighthouse available in this session).
  The production bundle is ~46 kB gzipped across two chunks, no web fonts, no
  images, so a score of 90+ on mobile is expected but unverified.
- Nothing has been committed or pushed: the repository was initialised but
  the first commit and the GitHub remote are left for Paul.

## The vetting queue (11 September 2026)

Paul asked for a random event in which the security vetting teams are
overwhelmed, with three choices and a consequence attached to each. The four
design questions were put to him and answered; what follows is what was built.

- **A new constraint, not a reskin of an old one.** Nothing in the model
  limited how fast people could be *called*: `callupPerMonth` was bounded only
  by the eligible pool, and everything downstream was bounded by the training
  estate. So the "do nothing" branch needed a real mechanic —
  `callupCapPerMonth` / `callupCapUntil`, set by a `callup_cap` effect and
  applied before the call-up each month (spec §5.1). It is the only constraint
  in the game that bites *upstream* of the training pipeline, which is the
  point: it is the one thing a player cannot buy their way out of with
  capacity purchases.
- **The ceiling expires**, per Paul's answer: 2,000 a month for six months,
  after which the backlog clears. A player who does nothing is slowed, not
  stopped, and can wait it out rather than being forced to pick a side.
- **2,000 a month** was chosen so the ceiling is invisible to a player running
  the baseline estate (spare intake is a few dozen a month) and painful to one
  who has bought three or four capacity purchases and compressed the syllabus.
  It started as a literal in `events.json`, following the convention that
  event-effect magnitudes are content rather than model parameters; Paul asked
  for it to be a parameter with a range instead, which is what it now is.
  `callup_cap` therefore names a parameter and cannot carry a number at all
  (the content test enforces this), so the two ceilings —
  `vetting_throughput_monthly` 2,000 and
  `vetting_rescreen_throughput_monthly` 1,500 — keep their ranges, their
  rationales and their source popovers, and appear in `ASSUMPTIONS.md`. They
  are the only parameterised event magnitudes in the deck, on the principle
  that they model a real-world rate where every other effect models a political
  consequence.
- **The durations stay literal.** Six months of congestion and four of
  re-screening are pacing — how long a story runs — which the project already
  keeps out of `parameters.json` (see `EVENT_FIRE_PROBABILITY`). Say the word
  if you would rather they were parameters too.
- **Where the 2,000 comes from.** Paul supplied UKSV figures: ~15,217 core
  clearances a month across government, staffing of 877 against a requirement
  of 1,145, and a collapse to 15% of standard checks meeting the 25-day target
  in 2022. The NAO report behind them is real and its central claims check out;
  the monthly throughput and staffing figures could not be confirmed in this
  session, and the 2025-26 surge post-dates the report entirely
  (`docs/source-verification.md` item 22). None of it is quoted in the game.
  It sets the order of magnitude only: 2,000 a month for the Army is a
  plausible share of a service handling roughly fifteen thousand, which is why
  the parameter is an `assumption` with a 1,000-4,000 range rather than a
  sourced figure.
- **The consequences fire on a timer, not a dice roll**, per Paul's answer.
  Two new condition keys, `vetting_priority_months` and
  `vetting_relaxed_months` (−1 when the choice was never made), let an event
  trigger a fixed number of months after a choice. This is the first causal
  chain in the deck; everything else triggers on world state. The Commissioner
  writes two months after the military are given priority; the recruit who
  should not have been cleared is arrested three months after the standard is
  lowered. Both are certain, so the choice reads as a trade the player made
  rather than as bad luck.
- **Both consequences offer a way back**, which is what makes the first choice
  a commitment rather than a one-off charge. Returning the police their vetting
  slots ends the priority and puts the ceiling back on; re-screening the intake
  restores the standard, imposes a tighter ceiling for four months and costs
  £25m. Refusing either is the cheaper action this month and the more expensive
  one by the deadline — holding the priority also carries
  `scoring_pc_if_missed −2`.
- **No figure is quoted in the prose.** UKSV throughput and the police
  clearance backlog could not be sourced to a published series, so the events
  quote nothing as fact and carry no `source` block. The player meets the
  ceiling as a number in the call-up control and in the briefing, where it is a
  statement about the game state rather than about the world.
- **The deck is now 33 events**, so the content test's assertion was widened
  from 28–30 to 28–33 deliberately.

## The projection under Force Ready (11 September 2026)

- **Why.** Almost nothing in this game arrives in the month it is decided: the
  Bill takes three months, a training place two, a course eight, reservists
  three to six at amended notice. The gauges reported only the past, so the lag
  was invisible until the deadline, and the first three months of every run
  read as though nothing the player did had worked. The projection states where
  the decisions already taken will land.
- **What it is.** `forecast(state)` in `src/sim/forecast.ts` clones the state,
  runs `advanceMonth` to the deadline and reads Force Ready off the result. It
  holds every decision in force constant and adds none. It appears as one line
  under the Force Ready gauge: *On present decisions: 22,299 by month 12 (89%).*
- **What it leaves out, and why.** No politics and no events. Neither is
  knowable a month ahead, and a projection that guessed at them would be
  reporting the seed rather than the player's orders. Running the politics
  would also be self-defeating: a projection in which the minister takes no
  action accrues the idle penalty and resigns, so the line would report the
  consequence of reading it. The methodology page says all of this in prose.
- **Random draws take their mid-point.** `advanceMonth` gained a
  `MonthOptions` argument; under `expectedDraws` an outstanding Strategic
  Reserve trace yields the mid-point of its 20–50% range and the generator is
  not advanced. Two rules: a projection may not spend the run's randomness
  (the UI would change the seed by rendering), and it may not claim to know a
  draw it has not made. `tests/forecast.test.ts` pins both — the projection is
  unchanged when the generator state is scrambled, and the caller's state is
  byte-identical afterwards.
- **The central test plays the future for real.** With the deck empty and no
  actions, `forecast(s)` is asserted equal to the Force Ready actually reached
  by stepping to the deadline, both from Day 0 and from a mid-game state with
  five clocks running (reserves, ex-regulars, a trace, a passed bill, a
  standing call-up). The claim in the UI is narrow enough to test exactly, and
  is tested exactly.
- **No balance change.** `npm run sim -- --all` is identical before and after,
  which is the check that `expectedDraws` did not leak into normal play.
- **An emergent property worth keeping.** If the player does nothing, the
  projection falls month on month, because voluntary outflow compounds. The
  bathtub was previously only visible as a line in the ledger; it is now
  visible as a number that gets worse while you watch.
- **Not styled as a sourced value.** A dotted underline means "tap for a
  source" everywhere else in this UI, and the projection has no source: it is
  an output of the model. It sits below a dashed rule inside the gauge, with
  an uppercase label in the same idiom as the gauge headings.

## The leadership ratio, re-derived (11 September 2026)

- **The mechanic had never fired.** Across the whole balance matrix, and every
  seed tried, the leadership factor was 1.00. The arithmetic made it
  unreachable: the spareable cadre of 8,869 at 1:8 supports 70,952 people, and
  the training estate caps conscripts at six to thirteen thousand. The
  constraint the game exists to demonstrate was in series behind a tighter one
  and could never bind. Several verdicts in `verdicts.json` were unreachable
  for the same reason.
- **The ratio is now derived, not assumed.** `junior_leader_ratio` =
  `regular_trained_start / junior_leaders` = 70,951 / 29,563 = **2.4** — the
  rate at which the Army actually mans itself, read off SPS Tables 3a and 11a.
  It moves from `assumption` (8, range 6–10) to `derived`. No new sourcing:
  both figures were already in the file.
- **1:8 was not wrong, it was a different ratio.** It is the instructor ratio,
  and the project already used it correctly for
  `leaders_per_capacity_purchase` (5,000 ÷ 8 = 625). It is now its own
  parameter, `instructor_ratio` (8, assumption, range 6–10), and governs the
  instructor draw and nothing else. Two ratios doing two jobs; they had been
  the same number, which is why one of them was invisible.
- **The honest caveat, stated in the parameter's `note` and on the
  methodology page:** 2.4 is a whole-Army manning ratio, staff and
  headquarters posts included, not a doctrinal section-commander ratio. It is
  used because it is the rate at which the Army finds leaders for the soldiers
  it has.
- **Re-deriving alone was not enough.** With the factor still charged for
  conscripts only it bit at Corps (0.77) and nowhere else, for the same reason
  as before. It is now charged for everyone raised on top of the standing Army
  who does not arrive in formed units: recalled ex-regulars, traced Strategic
  Reservists and conscripts — and it scales their effectiveness, not the
  conscripts' alone.
- **Volunteer reservists are exempt, and that is the whole decision.** The
  Army Reserve's trained strength is held in sub-units containing their own
  corporals, sergeants and subalterns, so it arrives led. Charging it would
  have made the factor bite on every path including the pure-reserves one;
  exempting it means the cost lands on the minister who tries to conscript
  their way out, which is the point. The alternative was tried and rejected.
- **Ex-regulars supply leaders as well as demanding them.** A recall returns
  junior leaders in the Army's own proportion, discounted by `eff_ex_regular`
  for the same rust that discounts their soldiering. Without this the recall
  was charged for a problem it half solves. Net demand is 0.17 leaders a head
  rather than 0.42, so the loop is monotone and cannot run away.

### What it did to the balance

| strategy (Division, 40 seeds) | median ESE | leadership | met% |
|---|---|---|---|
| do_nothing | 3,699 | 1.00 | 0% |
| reserves_only | 21,592 | 1.00 | 33% |
| reserves_plus_light | 21,926 | 0.96 | 40% |
| conscription_max_capacity | 5,338 | 0.64 | 0% |
| capacity_heavy (was `mixed`) | 19,034 | 0.63 | 0% |
| max_effort | 16,892 | 0.45 | 0% |

- **The curve is now the lesson.** A little conscription pays: one capacity
  purchase plus the civilian instructors who cost no junior leaders beats the
  pure-reserves play. A lot of it does not: three purchases lose 2,900 effective
  soldiers and five lose 5,100, because every leader teaching is a leader not
  leading, and the discount falls on the ex-regulars and Strategic Reservists
  already fielded as well as on the conscripts the purchase produces. The two
  "do everything" strategies are now the two worst at Division. That is the
  finding, and the player can see it happening in the leadership gauge note
  and in the projection.
- **A new scripted strategy, `reserves_plus_light`,** was added as the
  measuring instrument for restraint — the reserves in full, then the smallest
  conscript programme that can graduate before the deadline. It is the
  best-performing strategy at Division and the one that meets the target.
- **Targets rebalanced** (all inside their existing ranges):
  - `target_division` 25,000 → **22,000**. The ceiling with the new model is
    about 24,000; at 22,000 the restrained strategy meets it on 40% of seeds
    and the pure-reserves play on 33%, so it is a genuine knife-edge rather
    than the guaranteed loss it had become (1 seed in 10 before this pass).
  - `target_brigade` 8,000 → **10,000** and `deadline_brigade` 5 → **4**. The
    reserves produce a brigade three times over, which is itself a true
    finding, so Brigade stays the rung you win — but four months means the
    180-day notice period no longer delivers before the deadline, which makes
    the notice clause a real decision rather than a formality.
  - `target_corps` unchanged at 45,000, still the deliberately unreachable
    finding. **ASK** in the earlier balance note still stands.
  - `regular_deployable_fraction` was raised to 0.10 during the pass and put
    back to **0.05**. At 0.10 everything gains 3,548 and `do_nothing` reaches
    91% of Brigade, which is what the 0.05 was for in the first place.
- **The fuzz invariants still hold** over 1,000 random games; ESE ≤ headcount
  is unaffected because the factor only ever scales down.

## `mixed` becomes `capacity_heavy` (11 September 2026)

- **The name had stopped being true.** `mixed` was written as the sensible
  play — legislate, buy capacity, reserves in parallel — and the balance table
  used it to test the brief's criterion (d), "a sensible mixed strategy can
  make Division". Under the derived leadership ratio it is the second-worst
  strategy at Division: its three capacity purchases take 1,875 junior leaders
  out of the field force, and the resulting factor of about 0.6 is charged
  against everything raised. A strategy named for its good judgement that
  demonstrates the opposite is a misleading instrument.
- **Renamed rather than retuned.** Retuning it would have destroyed the only
  control for the failure mode a minister is most likely to walk into: a
  plausible-looking capacity programme in which every individual purchase reads
  as progress. It is kept exactly as it was and renamed for what it does.
- **`reserves_plus_light` carries the "sensible" role**, and criterion (d) is
  now measured against it. Its id was left descriptive rather than changed to
  something like `sensible`: every other id in the file names a behaviour
  (`do_nothing`, `reserves_only`, `conscription_over_capacity`), not a
  judgement about it, and a value-laden id would go stale the next time the
  balance moves — which is exactly what has just happened to `mixed`.
- **Scope of the rename.** `StrategyId`, `STRATEGY_IDS`, the exported function
  (`mixed` → `capacityHeavy`), the `STRATEGIES` record, three test call sites
  that use it as a generic active-player driver, `docs/sim-spec.md` §13, the
  README's `?auto=` example, and one `pc_start` rationale in
  `parameters.json` that named it in passing. The three tests were renamed and
  not repointed: they measure event cadence and determinism, and the strategy
  that pulls the most levers is the right driver for both.
- **Older DECISIONS.md entries keep the old name.** They are a log of what was
  decided when, and were true as written. `docs/sim-spec.md` and the strategy's
  own docstring both record the former name so the balance tables in those
  entries can still be read.

## A standing design review (11 September 2026)

- **Why a separate file.** `DECISIONS.md` is a log: newest last, entries true
  as written, never revised. That is the right shape for decisions and the
  wrong shape for findings, which have a current status. A finding recorded
  here would be buried under later entries and would not say whether it still
  holds. `docs/design-review.md` is the living counterpart: every finding
  carries Open / Partly addressed / Addressed / By design, and is renumbered
  never.
- **It carries the benchmarks.** The seed-distribution table is in that file,
  with the instruction to update it in the same commit as any change that moves
  it, and three named numbers that indicate breakage: the sensible strategy's
  met-rate at Division (40%), the median leadership factor for the
  capacity-heavy strategies (0.63 and 0.45), and `do_nothing`'s share of each
  rung.
- **`npm run dist` is new**, and the reason the benchmarks can exist.
  `npm run sim -- --all` reports one seed, which is enough to see a mechanic
  fire and not enough to balance against: the 10th-to-90th-percentile spread at
  Division is about 2,000 effective soldiers, most of the margin the difficulty
  is tuned to. Every balance claim in the review file is a 40-seed figure.
- **Two findings are recorded as deliberately unfixed.** Brigade is won by
  anyone who calls out the reserves, because the Army Reserve really can raise
  a brigade in five months and really cannot raise a division in twelve; the
  file says so and says not to shrink the reserve figures, which are primary.
  And the two "do everything" strategies are now the two worst at Division,
  which is the lesson rather than a fault — with a note to watch playtests in
  case it reads as punishing engagement.
- **A correction carried in both files.** The first estimate of what the
  derived leadership ratio would do (a factor of 0.29) was wrong: it applied
  the ratio to all non-regular bodies. Re-deriving the ratio alone would have
  made the mechanic bite at Corps only. The review file keeps the correction
  next to the finding, because the general lesson — check which population a
  ratio applies to, and which constraint sits upstream of it — is the most
  reusable thing in the document.
- **`max_effort` buys five capacity blocks, not eight.** Its own guard declines
  to buy while the leadership factor is under 0.85, so under the new model it
  is self-limiting. The earlier entry's "four purchases … and eight" was
  corrected to "three … and five" against a measured run.

## The turn screen on a phone (11 September 2026)

F7 in `docs/design-review.md`: the Day 0 turn screen was 899 words and 5.8
phone screens, *End month* was 5.5 screens down, and the gauges scrolled away
so the player chose a −12 political-capital action with no view of their
political capital. The audience arrives from LinkedIn's in-app browser, so this
is the first thing most players meet.

Four changes, no simulation code touched and no parameter moved — the benchmark
table is unchanged.

- **A sticky status strip** under the turn bar: Ready, Quality, Capital on one
  33px line. The full gauges stay where they were and keep the bars, the
  forecast and the leadership note. The strip and the gauges read their
  thresholds from the same helpers, so they cannot disagree about whether a
  number is in trouble. **The strip is `aria-hidden`:** it is a duplicate of
  the gauges, which keep the roles and the labels, and a screen reader user has
  no scroll problem to solve. It is a visual affordance only.
- **A fixed footer** carrying the action counter and *End month*. The counter
  moved out of the Decisions heading, where it could not be read while
  choosing. Last in the DOM, so last in the tab order.
- **Progressive disclosure.** The four action groups are `<details>`, open when
  they hold a live decision: reserves close once every lever has been pulled,
  the pipeline stays shut until there is a Bill or somebody to train. They are
  **closed, not hidden** — buying training capacity ahead of the legislation is
  a real strategy and has to stay reachable. A group the player opens by hand
  stays open in later months; because `<details>` fires `toggle` for the state
  it was rendered in, only a deviation from the default is recorded as the
  player's doing.
- **A bug.** `.action-options` set `display: flex`, which beats the user
  agent's `[hidden]` rule on specificity, so every action's dropdowns were on
  screen whether or not the action was ticked — five of them on the Bill alone,
  323px of Day 0.

Day 0 is now 643 words and 4.5 screens, the action list 1,750px rather than
3,500px, and a mid-game turn is 2.6 screens. That is better, not short: the
rest is the Permanent Secretary's note and the event card, which are the prose
the game is for. The next cut would put the action descriptions behind a tap
and trade away the sourced copy that carries the argument — worth doing only
against a playtest that says the length is still losing people.

## Political capital you can earn (11 September 2026)

The standing review's F6 said political capital is a tax rather than a
currency: after about month 7 there is no renewable income at all, the best
possible month is −1, and every event is a net negative. F9 is the same
finding from the player's side — every scripted strategy resigned at Corps
before the pipeline argument was made. The earlier balance note had already
named the fix and deferred it: *"renewable political capital for delivering —
crediting graduations or arrivals — which is what the momentum bonus was meant
to do."* This is that change.

**What the momentum bonus got wrong.** It paid 3 PC in a month when Force
Ready rose by 5% of target. Expressing the trigger as a *share of target* made
it scale with the difficulty rather than with the minister: 5% of Brigade is
500 effective soldiers and 5% of Corps is 2,250. It fired twice in a good
Division run — in the two months the reservists arrive — and then never again,
and at Corps it was unreachable in exactly the months a minister most needed
it. It was also paid on effectiveness, so the leadership factor could cancel a
month's delivery out of existence.

**What replaces it.** One point of political capital per 500 soldiers who
actually reach their units in the month, capped at 3. `delivered` is the
month's graduations plus its arrivals — reservists mobilised, ex-regulars
reported, the Strategic Reserve traced. Two parameters,
`pc_delivery_per_credit` (500, range 250–1,500) and `pc_delivery_max` (3,
range 2–5), replace `pc_momentum_bonus` and `pc_momentum_threshold`, which are
deleted. Spec §9.

**Why 500.** `regular_gains_annual` is 5,933 a year, which is 494 a month: the
rate at which the Army produces trained soldiers in the ordinary course of
events. A minister earns political credit at the rate the Army manages on its
own, and only above it. That is an assumption dressed in a sourced figure
rather than a derived parameter — the figure is primary, the decision to use it
as the unit of political credit is not — so it carries a range and can be
tuned.

**Three properties that are the point, not side effects.**

- **It is renewable and it is not idle income.** The regular pipeline's own
  monthly gain is deliberately excluded: it arrives whatever the minister does.
  `do_nothing` earns nothing, at every difficulty, and still resigns at Corps
  on 100% of seeds.
- **It pays on headcount, not effectiveness.** The credit is what a minister
  can announce; the score is what can fight. Charging the leadership factor
  against the political credit as well as the score would have said the same
  thing twice; leaving the gap open puts the game's central tension into the
  currency the player spends.
- **The holding pool earns nothing.** People called up and parked have not been
  delivered, so calling up above the training estate's spare intake buys no
  political credit either. `conscription_over_capacity` still resigns on 100%
  of Corps seeds and 80% of Division seeds.

**What it did to the balance** (`npm run dist -- 40`, before → after):

| | Brigade | Division | Corps |
|---|---|---|---|
| `reserves_plus_light` met% | 100 → 100 | 40 → **43** | 0 → 0 |
| `reserves_plus_light` resign% | 0 → 0 | 0 → 0 | 100 → **33** |
| `reserves_only` resign% | 0 → 0 | 0 → 0 | 75 → **25** |
| `capacity_heavy` resign% | 0 → 0 | 0 → 0 | 100 → **10** |
| `do_nothing` resign% | 0 → 0 | 0 → 0 | 100 → **100** |
| `do_nothing` median ESE | 3,611 → 3,611 | 3,699 → 3,699 | 3,764 → 3,764 |

Brigade is untouched to the ESE. Division moves within the noise and stays
inside F2's 25–65% band; the leadership medians for `capacity_heavy` and
`max_effort` are 0.64 and 0.45, so F3's mechanic is still firing and F4's
monotonic penalty for over-buying capacity is intact.

**Corps is the change worth reading.** Two-thirds of runs that used to end in
resignation now play all 24 months and end in a shortfall: median 23,928
against a target of 45,000. **That answers the open ASK on whether Corps should
end in a shortfall verdict rather than a resignation — without a special case
in the ending.** The mechanic funds the run to the deadline, and what the
player then sees is the thing the difficulty was built to demonstrate: twenty-
four months of competent mobilisation delivers half a corps. `do_nothing`
still resigns, so the ending is still earned rather than granted.

**What this does not fix.** F6's other half stands: 35 of roughly 60 event
effects are still political-capital deltas, and most event choices are still
"lose 5 PC" against "lose a small thing". There is now something to earn, which
was the missing side of the ledger; making the *spending* side more interesting
is a content problem in `events.json`, not a model one.

## The reserves, measured against a real mobilisation (11 September 2026)

Paul supplied HC 57 — House of Commons Defence Committee, *Lessons of Iraq*,
Third Report of Session 2003–04, chapter 5 — which is the only primary record
the project has of what a compulsory call-out of the British reserves actually
yields. Operation Telic 1, Army: **6,540 call-out notices served, 4,873
reported, 3,787 accepted into service.** Tri-service: 8,492 / 6,478 / 5,221.
Five parameters come out of it, and two existing assumptions stop being
assumptions.

**`reserve_volunteer_deployable_fraction` was right, and is no longer a
guess.** It was 0.50, assumed from the composition of the trained figure. The
same quantity measured: 3,787 / 6,540 = 0.579 of notices served were accepted
(`reserve_mobilisation_acceptance_rate`), and 0.901 of the trained strength is
available to be served one at all (23,517 less 1,720 on full-time service and
615 already mobilised, SPS Table 6a). 0.901 × 0.579 = 0.522. **Held at 0.50,
not raised to 0.52**, for two reasons that both push the true figure down:
HC 57 ¶112 says MoD allowed for expected wastage *before* deciding whom to
serve, so the denominator was pre-filtered; and the trained figure has counted
Phase-1-only personnel since October 2016. The value does not move, its
confidence goes `assumption` → `derived`, and the balance table is untouched
by this half of the change.

**The employer is now a standing pressure rather than a one-off news story.**
HC 57 ¶113: 2,021 applications for exemption and 80 for deferral against 8,492
notices — **24.7% of notices contested** — and **920 of the 2,021 exemption
applications came from employers**, not from reservists: 45.5%. The
`reservist_employers` event was an incident (three NHS trusts, ward closures,
fires once, removes a flat 2,000). It is now the adjudication of those
applications under the Reserve Forces Act, recurring up to three times on a
three-month cooldown, removing `0.247 × 0.455 = 11%` of the mobilised strength
each time, against a political cost for refusing. This is the ongoing,
proportional reserve cost the design review's F1 asked for by name, and it
needed no new screen.

**What it did to the balance** (`npm run dist -- 40`). At Division the marginal
value of active play over pure reserves goes from **+359 ESE (1.7%) to +1,444
(7.1%)**; `reserves_only` falls from meeting the target on 33% of seeds to 3%,
while `reserves_plus_light` holds at 43% → 45%, inside F2's band. Leadership
medians (0.64 / 0.45) and F4's monotonic capacity penalty are unchanged, and
`do_nothing` does not move at any rung. Corps gets modestly harder —
`reserves_plus_light` resignations 33% → 35% — so F9's fix holds: about
two-thirds of competent Corps runs still reach the deadline. **Reserves alone
no longer make a division. Reserves plus a restrained pipeline still do.**

**This is the exception F8 anticipated, and it is worth being explicit about.**
F8 says "do not 'fix' this by making the reserves smaller. The reserve figures
are primary." The reserve *strengths* have not been touched and remain primary.
What changed is the *yield*, which is now also primary. The distinction is the
whole justification, and any future change that makes the reserves smaller
without a source behind it is the thing F8 was warning about.

**Two things taken from HC 57 and deliberately not acted on.**

- **The medical asymmetry.** ¶119: of those who reported to the mobilisation
  centre, **48% of Regular Reserves failed the medical against 14% of the TA**.
  That makes `ex_regular_report_ceiling` (0.50) an upper bound — the medical
  alone leaves 0.52 before any allowance for the incomplete records MoD has
  admitted to. The two rates are recorded as primary parameters and the range
  is tightened to [0.30, 0.52], but **the value is not lowered**: that is a
  balance change landing on the same strategies this pass has just moved.
  Recorded as F11 (*Watch*) in the design review. **ASK:** whether to take it.
- **Tour length is not a cap here, and an earlier proposal in this session was
  wrong about that.** HC 57 ¶123–124 gives 4–6 months in theatre and 7–9 months
  total absence, which suggested mobilised reservists should time out. They
  should not. Telic was called out under RFA96 s.54 (operations outside the
  UK); this game's scenario is an Article 5 attack, which is s.52 — *national
  danger, great emergency or an actual or apprehended attack on the United
  Kingdom* — and s.52 sets **no maximum period**: the order "shall have effect
  until it is revoked" (legislation.gov.uk). So 7–9 months grounds when
  employer and family pressure peaks, which is what the event above models, and
  not an expiry. Checking which section a figure was produced under mattered
  more than the figure.

## Outflow becomes something a minister can move (11 September 2026)

Paul supplied AFCAS 2026 — *UK Regular Armed Forces Continuous Attitude Survey
Results 2026*, MoD Analysis Directorate, published 28 May 2026. It closes the
gap named in the design review: nothing in the event deck could touch the
bathtub, because outflow was the constant `regular_voluntary_outflow_annual / 12`.

**Two measured quantities instead of one constant** (`src/sim/outflow.ts`,
spec §7a):

- **Intention.** Table B12.1 (A173), Army, n = 2,446: 10% plan to leave before
  the end of their engagement, 6% as soon as they can, 3% have put their notice
  in. **19%**, and the same total has run 17–23 every year since 2019, so it is
  a settled level rather than a reading of any particular year.
- **Conversion.** Realised outflow is 3,311 / 70,951 = 4.67% a year against
  that 19% intention, so **0.2456** of the intention is realised.

`outflow = regularTrained × (intent/100) × 0.2456 / 12`. **It reconstructs the
old constant rather than replacing it**: 70,951 × 19% × 0.2456 = 3,310.9
against the published 3,311. Carried to four places precisely so that it does.
The split is not a new number; it is a lever on an old one.

**Which half moves is the modelling claim.** Conversion is held fixed — a
minister cannot make somebody who wants to leave stay. Intention moves, because
what a minister does to Service life moves how many want to. A new
`outflow_intent_add` effect type lets the deck move it, clamped to
`outflow_intent_max_pct`.

**Stop-loss stops being free.** It cost −9 PC once and then set outflow to
exactly zero for the rest of the run, with no action to lift it: the same
pay-once-benefit-for-ever shape F1 complained about in the reserve levers, and
the only lever in the game with no downside. It now cuts outflow to
`stop_loss_leak_fraction` (0.25) rather than to zero — compulsion does not
reach a medical discharge, a disciplinary discharge, or a commission the Crown
declines to extend — and adds `stop_loss_intent_add_monthly` (0.5 points) for
every month engagements are held open. **Being held past the end of an
engagement is the impact of Service life on family and personal life, which
50% of those who have put their notice in cite as a reason — the top factor in
AFCAS Table FP.1 by some way.** So the leak grows while the compulsion holds.
Traced at Corps with stop-loss from month 5: outflow 65 in month 5, 81 by
month 12, 107 by month 21, and the junior-leader cadre keeps eroding where it
used to freeze — so stop-loss now feeds the leadership factor rather than
insulating the player from it. The forecast projects the decay, because
`forecast.ts` runs the same `advanceMonth`.

**Event magnitudes are sized against the AFCAS ranking, not invented.** Table
FP.1 gives the reasons cited by those who have put their notice in: family and
personal life 50%, job satisfaction 42%, outside opportunities 33%, morale 33%,
pay 28%. `regular_retention_wobble` moves intention both ways on the pay
factor (±2/3); `junior_leader_exhaustion` and `instructor_revolt` move it on
job satisfaction; `briefing_leak` on morale. Four events, where none could
touch outflow at all.

**Cost to the balance, which is small** (`npm run dist -- 40`). Division
`reserves_plus_light` 45% → 40% met, Corps resignations 35% → 40%. Brigade is
unchanged. `do_nothing` does not move at any rung and still resigns on 100% of
Corps seeds; leadership medians are 0.63 and 0.44; F4's monotonic penalty for
over-buying capacity is intact. The strategies that lose are the ones that pull
stop-loss, which is every one of them, and that is the point.

**Three hand-calculated tests had to be rewritten**, and they were the right
ones to break: they asserted the flat rate. They now assert the reconstruction
against the published annual figure, the leak and its growth, and the fact that
the drain is taken on the strength held *after* the month's regular intake. 67
tests pass.

**What AFCAS does not give, and what stays an assumption.** An elasticity.
AFCAS has levels and a ranking, not "if X worsens by a point, outflow rises by
Y". `stop_loss_leak_fraction`, `stop_loss_intent_add_monthly` and
`outflow_intent_max_pct` are assumptions with ranges — but assumptions anchored
between two published endpoints rather than free-floating, which is the
difference between this and the constant it replaced. Recorded as F12 in the
design review.

## The Chancellor gets an audit to quote (11 September 2026)

Paul supplied the NAO's *Equipment Plan 2023–2033* (HC 315, Session 2023-24,
4 December 2023). Three figures from it are now parameters, all primary:
`equipment_plan_deficit` (£16.9bn — forecast costs £305.5bn against a £288.6bn
budget, which the NAO calls the largest deficit since it began reporting on the
Plan), `defence_budget_deficit_10yr` (£42.5bn, against £4.3bn the year before),
and `army_capability_gap` (£12bn, the Army's own estimate of what it would need
to field what it has promised).

**The deck is at its cap of 33 events, so this is a rewrite of the two Treasury
events rather than new ones.** That constraint decided the shape of the work
and was the right constraint to have.

**`treasury_letter` was a flat political charge and is now a trade.** The
Chancellor's letter was invented rhetoric resolving into "fight for the money,
−6 PC" — one of the seventeen choices the design review counts as *a PC delta
or nothing at all*. The letter now quotes the audit, and the second arm takes
the money where a Chancellor would actually take it: out of the equipment
programme. `equipment_delay +2` and −3 PC, against the first arm's cut to
training capacity. The choice is now capacity against equipment, with a
political charge on top of one side, rather than capacity against a bill.

**`pac_hearing` was deliberately not mechanised.** Its brief gains the NAO
deficit, because that is what the Committee would be holding. Its arms stay a
political gamble, because a televised select committee hearing is the one event
in the deck that is honestly about political capital, and converting it would
have been applying F6's lesson where F6 does not apply. Not every event needs a
non-PC arm; most do.

**The balance did not move at all, and that is the finding.** `npm run dist --
40` is **byte-identical** across the change, because every scripted strategy
takes choice 0 and the second arm is never exercised. The harness is blind to
any change that lives in choice 1. Three direct tests in `tests/step.test.ts`
cover the arms instead — the delay applies and costs 3 PC, it costs only the
capital when there is no order to slip, and the first arm is still a real cut
with no political charge. **Any future event whose interesting arm is choice 1
needs the same treatment**, or it ships untested.

**A staleness note worth keeping.** The Equipment Plan is audited annually and
a 2026 edition would supersede this one; each of the three parameters records
that in its `note`. The figures are used because they are the most recent the
project has, and because the Chancellor in this game would be quoting the last
published audit rather than an unpublished one.

**What this does not fix.** F6's spending side is better by two choices out of
seventeen. The structural version — a finite, raidable pot of money to manage
rather than a bill to pay — is available in the same report: the Plan's
contingency is down to £4.1bn from £5.9bn in 2021. That would be a new action
and a new resource rather than an event rewrite, and it has not been done.
**ASK.**

## A pot to raid instead of a bill to pay (11 September 2026)

F6's spending side was "most event choices are a flat political tax". The
income side was fixed by the delivery credit; this is the first thing on the
outgoing side that is a **resource to manage** rather than a charge to absorb.

**What it is.** `draw_contingency` spends the £4.1bn the MoD holds inside the
Equipment Plan "to help fund new equipment projects or absorb any unexpected
cost increases" (NAO HC 315 ¶1.9 — down from £4.3bn the year before and £5.9bn
in 2021). It is the only money in the published account a minister could
plausibly reach for at short notice. It costs **no political capital**, and
carries two costs instead: every later step of Treasury pressure costs double,
because there is no buffer left to absorb an overrun, and the emergency
equipment order takes three months longer whether it was already placed or is
bought afterwards. Spec §8a.

**The first sizing was wrong, and measuring the model caught it.** The penalty
was set at +1 per step, which put the crossover at about £15bn of cumulative
cost. Then the actual spend was measured: a full Corps run costs £4.6–11.1bn
and a Division run £2.0–3.7bn. **The crossover was outside the range the game
can produce, so the draw was better everywhere and the decision was no
decision** — the free lever this whole sequence of work has been removing.
At +2 the crossover falls to about £9bn, between what a restrained Corps
programme spends (£6.8bn) and what `max_effort` spends (£9.7bn).

**The bots were given the arithmetic, not the answer**, and the fork appeared
on its own. `contingencyPaysOff` compares the two charges against projected
spend and declines while an equipment order is in flight. At Corps:
`reserves_plus_light` draws on 40 of 40 seeds, `capacity_heavy` on 38, and
`max_effort` splits **18 drawing against 21 raising spending** — where at +1 it
was 30 against 8. At Division nobody draws at all. Corps resignations:
`reserves_plus_light` 40% → 23%, `capacity_heavy` 15% → 3%, `max_effort`
38% → 25%, **with final ESE unchanged**: the run survives to the deadline
without getting closer to the target, which is what F9 asked for.

**A rendering bug the work exposed, now guarded.** `action-menu.ts` keeps a
hand-maintained `ORDER` array, and an action missing from it does not error —
it simply never appears on screen. `draw_contingency` shipped invisible until
it was opened in the browser. There is now a test that `ORDER` covers every
`ActionId` and that every action has copy, a title and a group. Five lists have
to agree for an action to exist (`ActionId`, `ACTION_IDS`, `ACTION_LABELS`,
`ACTION_COPY`, `ORDER`, plus `isKnownAction`); only two of them fail loudly.

**And a finding about the model that was already there.** The Treasury cost
penalty almost never fires: the threshold is £5bn and the most expensive
Division strategy finishes at £3.7bn on its worst seed, so **no run has ever
paid a penny of Treasury pressure at the headline difficulty**. At Corps it
fires once, twice for the biggest spender. Recorded as F13 (*Open*) with the
cost table. `cost_pc_penalty_threshold` is an assumption with range
[£2.5bn, £10bn] and £2.5bn would make it bite at Division, but that is a
difficulty increase on every rung landing on top of three other changes, and it
should be measured on its own. **ASK.**

## Willingness stops being political capital with extra steps (11 September 2026)

Paul supplied the YouGov table on compulsory service — 4,205 GB adults,
28 May 2024, broken by age. It is the last of the five sources, and it closes
the pair the design review said were the same problem: F4's dead Bill clauses
and F6's typed effects that route back to political capital.

**The diagnosis it acts on.** `willingness` had exactly one consequence
anywhere in the model: below `willingness_low_threshold_pct` it charged
`pc_low_willingness_penalty`. So an event that moved public willingness moved
political capital with extra steps, and the age-band clause — which could have
moved willingness — only moved the size of a pool that never binds.

**What the data supports, and what it does not.** The question offers military
service *or* community volunteering, so its levels overstate support for
military-only conscription and **the absolute level is not used**:
`willingness_start_pct` stays at 20. What is used is the **age gradient**,
which is what the poll measures well — support 27% among 18–24s rising to 63%
among the over-65s, with strong opposition falling 45% → 18%.

**Two derivations.** The band adjustments weight the poll by the England and
Wales population of each single year of age inside each band (both figures
already in the file): 18–25 gives 28.6% support, 18–30 32.8%, 18–40 35.7%,
18–65 42.2% — so −4, 0, +3, +9 points against the default. And strong
opposition is fitted against support across YouGov's four age groups,
`strongly_oppose = 66.206 − 0.7738 × support`, R² = 0.994.

**The chain, and where it is weakest.** Age band → willingness → strong
opposition → refusal rate → conscripts who actually report. The weak link is
named in its own parameter note: the game's willingness runs 16–34 where the
poll observed 27–63, so the fit is used below the range it was measured on and
produces strong opposition of 40–54%, at and beyond the most hostile group
YouGov saw. `conscription_refusal_conversion` (0.25) is the one frank
assumption, anchored against HC 57's 25.5% non-reporting rate for *volunteer*
reservists served a compulsory notice.

**What it buys, mechanically.** Refusal puts willingness **upstream of the
training pipeline** instead of downstream of nothing. Two properties came out
of the arithmetic rather than being designed in, and both are worth keeping:
calling up over capacity is now **insurance against refusal**, because the
refusers come out of a surplus that was going to sit in the holding pool; and
refusal *raises* the leadership factor while lowering headcount, because fewer
conscripts is fewer people for the cadre to lead — so a refused call-up is bad
for the score and good for the quality of what remains. It also cuts
graduations and so the delivery credit, which means refusal costs political
capital a second time, through the income rather than the penalty.

**Balance** (`npm run dist -- 40`). Division `reserves_plus_light` 40% → 43%
met and leadership 0.93 → 0.98; Corps median 22,367 → 22,657 with resignations
23% → 38%, the rise coming through the delivery credit rather than directly.
`do_nothing` does not move at any rung. Brigade unchanged.

**A UI bug this exposed.** The briefing had a line reading
`state.willingness` while the new one read `effectiveWillingness`, so the same
screen quoted 20% and 16% for the same quantity. Both now read the effective
figure. Any future readout of willingness must do the same — the raw field is
not a number anyone should see.

**And a finding the data produced rather than answered: F14.** The poll has a
36-point spread, and the player sees 13 of it, because **every band the Bill
offers starts at 18** and therefore contains the most hostile group; widening
only dilutes it. A band of 25–40 would be far more popular and the game cannot
express one. The fix is a clause shape — a movable lower bound — not a bigger
`conscription_refusal_conversion`, which would scale every band equally and
change nothing about the decision. **ASK.**

## The GDP arm, priced properly and found to be inert (11 September 2026)

Paul supplied ASHE Table 6.1a (gross weekly pay by age group, UK 2025
provisional) and ONS Table A05 SA (labour market status by age, Apr–Jun 2026),
which were the data F14's clause shape needed. Two results came out of them,
and the second is more important than the first.

**The four `gdp_age_multiplier_*` are now derived, and every one was too high.**
They were an assumed ladder — 0.6 / 0.75 / 0.9 / 1.0 — keyed to the band's
upper bound. Derived as employment rate × mean pay relative to the all-employee
mean, weighted by the population of each single year of age in the band, they
are **0.407 / 0.547 / 0.717 / 0.762**. The assumed ladder priced a conscript as
an average employee scaled for age, when most 18–24s are not employees at all
(59.1%) and those who are earn less than half the all-employee mean. Mean
rather than median pay, because `output_per_worker_labour_share` is itself a
mean.

**Crucially, the derivation has lower-bound sensitivity, which the ladder could
not have.** A 25–40 band costs 0.852 of average output per head against 18–30's
0.547. That is the economic counterweight F14's popular band was supposed to be
paid for with.

**Except that output costs the player nothing.** A GDP penalty step is 0.25% of
GDP — **£7.6bn of lost output** — and the largest cumulative GDP loss any
strategy produces at any difficulty across 40 seeds is **£4.35bn**, 57% of one
step. **The GDP penalty has never fired once, anywhere.** So the whole GDP arm
reaches the player through the scoring screen and one event trigger, and
nothing else. Recorded by extending F13, which already said the same of the
Treasury cost penalty — both money penalties are dormant, for the same reason:
the thresholds sit above the range the game produces.

The re-derivation changed the benchmark by almost nothing, which is the proof
of that finding rather than a disappointment. The only movement is
`gdp_employers` firing less often, because its trigger is a £2bn cumulative
loss that the lower multipliers now reach less often.

**So F14 was not built, and should not be until F13 is.** A 25–40 band is more
willing *and* has a bigger pool than 18–30; its only cost is peak earnings, and
peak earnings cost nothing. Shipping it now would put a strictly better option
in the Bill — a free lever, which is the thing this whole pass has been
removing. F13 and F14 are one change: a counterweight and the thing it
counterweighs.

**And a correction to F14 as first written.** It claimed a movable lower bound
would widen the clause's span "from 13 points to about 36". That was wrong: 36
is the raw spread between 18–24 and the over-65s, and a mobilisation cannot
conscript only the over-65s. Across every militarily plausible band the span is
**15.2 points**, against the 13.6 the current four already cover. Replacing
18–40 with 25–40 buys +6 against the default instead of +3. The clause shape is
still worth changing; it is worth about two points of range, not twenty-three.


## Money that bites, and a band that does not start at 18 (12 September 2026)

F13 and F14, taken as one change because F14's fix was gated on F13's. Paul
settled the four decisions the handover reserved for him; the measurements
below are what they were settled against.

**F13's cost penalty: the shape was wrong, not the number.** `cost_pc_penalty_threshold`
was a flat GBP 5bn on a *cumulative* total, charged *every* month. The charge is
therefore steps times months remaining, and grows with the square of the
campaign — so it cannot be tuned across a 4-month, a 12-month and a 24-month
run at once. Political capital taken off `reserves_plus_light` across a whole
run, 40 seeds: at GBP 5bn, 0 at Division and 2 at Corps; at the range floor of
GBP 2.5bn, 2 and 22; at GBP 2bn, 6 and 36. Anything felt at Division landed an
order of magnitude harder on the rung F6 and F9 had just rescued.

**So the threshold became an allowance sized to the campaign**:
`cost_pc_allowance_per_month` times the difficulty's deadline. GBP 0.8bn at
Brigade, GBP 2.4bn at Division, GBP 4.8bn at Corps. The fiction is better than
the flat figure it replaced — the Treasury votes a budget for an operation and
a longer operation is voted a bigger one — and it is anchored on the defence
budget at 3.9% of one month of it.

Two properties fixed the level at GBP 200m inside its range, and the second one
is the reason the first candidate was rejected:

- Below about GBP 175m a month, Corps gets materially harder than F9 left it:
  `max_effort` resignations 18% to 35-40%. That is a difficulty change smuggled
  in under another finding.
- `equipment_plan_contingency` must stay worth **less than one whole step** at
  Corps. GBP 4.1bn against an allowance of GBP 4.8bn is 0.85 steps, where the
  old flat GBP 5bn gave 0.82. At GBP 150m a month it was 1.14 steps and the draw
  beat raising spending on every Corps seed — F6's fork closed without anyone
  touching it. The crossover is back just above GBP 9.6bn and the bots split
  19 draw against 18 raise. F13's own "watch for" note predicted exactly this;
  it is now a test rather than a note (`tests/step.test.ts`, "the Treasury
  allowance").

At Division the contingency is worth 1.7 allowances and clears the charge
outright. That is honest rather than broken — the mobilisation there costs less
than the Equipment Plan's buffer holds — and the three-month equipment slip is
the price instead. `reserves_plus_light` draws it on 14 of 40 seeds, where
before it drew it on none.

**F13's GDP penalty was deleted, not repaired.** A step was 0.25% of GDP, GBP
7.6bn of lost output, against a largest-ever cumulative loss of GBP 4.35bn. To
fire at Division the step would have to fall to about 0.03% — a factor of
eight, far below its stated range floor, and GBP 0.9bn of lost output is not a
politically salient quantity. The parameter had been sized for a mobilisation an
order of magnitude larger than the one the game models. `gdp_pc_penalty_step_pct`
and `gdp_pc_penalty_per_step` are gone; cumulative output loss is now *stated*
to be a scoring-screen quantity and an event trigger, in the spec and in a test,
rather than being one by accident.

**And the measurement that killed the plan of record.** F14 was gated on F13 on
the reasoning that a 26-40 band's cost is peak earnings, and peak earnings only
cost something once the GDP penalty fires. That reasoning does not survive
being measured. At Division, `reserves_plus_light`'s cumulative output loss is
GBP 0.09bn of conscripts against GBP 1.08bn of reservists, who carry a
multiplier of 1.0 whatever the Bill says. Changing the band moves the total by
**4.3%**, and a step function does not notice 4.3%. The GDP arm could never have
priced the band for the strategy the benchmark watches, at any threshold. The
gating was right for the wrong reason: the band did need a counterweight before
it could ship, but not that one.

**F14: 18-40 is replaced by 26-40.** Every band the Bill offered started at 18,
so every band contained the most hostile group (18-24: 27% support, 45%
strongly opposed) and widening only diluted it. 26-40 is the only band on offer
with a movable lower bound. It needed no new sourcing, which is why it was
preferred to the 25-40 band the handover proposed: `ew_pop_18_40 - ew_pop_18_25`
is exactly ages 26-40, both bounds being inclusive, and every single year of age
in it falls inside YouGov's 25-49 group, so its population-weighted support is
that group's figure exactly, 39.0%. The long way round — subtracting the 18-25
band's weighting from the 18-40 band's — gives 38.99%. The same subtraction
gives the output multiplier, 0.862, the highest of the four. Two derivations,
no new data, and they agree.

**It is paid for twice, and the second is the one that lands.**
`pc_cost_band_26_40` is -8 and `pc_cost_band_18_65` is -14, charged as a
difference so that widening costs and narrowing refunds. And
`attrition_age_add_26_40` adds 5 points to training attrition on a base of 26.
The attrition is the important half, and the reasoning is F3's lesson applied:
the obvious places to charge an older band — `medical_pass_*`, `exemption_*` —
both resolve into the size of the eligible pool, and the eligible pool never
binds, so a cost charged there is a cost not charged at all. Attrition acts on
the people actually on the course. The band now buys survival and pays in
soldiers: at Corps `reserves_plus_light` resigns on 20% of seeds under 26-40
against 35% under the default, and finishes on 22,580 ESE against 22,652.

No published figure exists for British Army training attrition by age at entry
— the quarterly service personnel statistics give untrained intake and outflow
and break neither by age — so `attrition_age_add_*` is a frank assumption in
the way `conscription_refusal_conversion` is, and says so in its rationale.

**A free lever that was already shipped, and is now closed.** The age band was
the one clause in the Bill that cost no political capital at all, and
`willingness_low_threshold_pct` is 25 against a start of 20, so 18-65's +9
cleared it and switched off a standing 2 a month for nothing. At Division it
took `conscription_over_capacity` from 90% resignations to 5% and
`conscription_max_capacity` from 15% to 0%. This was not introduced by F14; it
was found while pricing F14's band, and it had been in the game since the
polling was wired in.

**And the new finding, F15: the cliff at 25 decides more than any clause does.**
Re-running the 40 seeds with `willingness_low_threshold_pct` set to 0, so that
nobody is ever charged, moves Corps `reserves_plus_light` from 35% resignations
to **3%** under the default band — and moves 26-40 and 18-65 not at all, because
they were never charged. Nearly all of Corps's difficulty for a default Bill,
and the whole of 26-40's advantage over it, is one binary threshold. It is not
fixed here, deliberately: a one-off clause cost cannot price a per-month stream
that runs for 4, 12 or 24 months, and inflating `pc_cost_band_*` until the Corps
numbers looked right would have made Division punitive to hide a Corps problem.
The fix is a shape and not a number — charge on refusals that actually happened,
which the model now counts — and it deserves its own pass. **ASK.**

**Balance** (`npm run dist -- 40`). All three watch numbers hold: Division
`reserves_plus_light` 43% met (unchanged), leadership 0.67 and 0.47 at Division
(unchanged), `do_nothing` resigning on 100% of Corps seeds (unchanged) and
unchanged at every rung. Brigade is byte-identical: it spends GBP 0.36bn against
an GBP 0.8bn allowance and stays the tutorial rung (F8). The movement is small
and all of it is deliberate — Division `reserves_plus_light` median 21,858 to
21,878 and `max_effort` 17,363 to 17,512; Division `conscription_over_capacity`
resignations 90% to 95%, it being the one strategy that spends heavily and
delivers nothing; Corps `capacity_heavy` 5% to 3% and `max_effort` 18% to 20%.

Saved runs from before this change are discarded rather than resumed: the
GameState version goes 1 to 2, because a run saved mid-Bill could be carrying
an age band that no longer exists.

## The refusal cliff becomes a court list (12 September 2026)

F15, taken on its own the way F13 was, and for the same reason: it moves every
rung.

**What was wrong.** `pc_low_willingness_penalty` charged 2 political capital a
month whenever conscription was active and willingness sat below
`willingness_low_threshold_pct` = 25. Willingness starts at 20 and the four age
bands adjust it by -4, 0, +6, +9, so two bands paid the charge in full and two
did not pay it at all. Nothing else in the game reliably crossed the line.
Re-running the 40 seeds with the threshold set to 0 moves Corps
`reserves_plus_light` from 35% resignations to **3%** under the default band and
moves the two bands above the line not at all: nearly all of Corps's difficulty
for a default Bill was one binary threshold, and so was the whole of the 26-40
band's advantage over the default.

**The fix is the shape, not the number** - the same correction F13 made to the
Treasury penalty. Refusals go onto a court list. Every `pc_refusal_per_charge`
= 200 cases cost one political capital, at most `pc_refusal_max` = 1 a month,
and what is not charged this month stays on the list. The model already counted
refusals and simply never charged for them, which is why the label on screen -
"Refusal cases in the courts" - was describing something the game was not doing.

**The carry-over is load-bearing, and the first attempt did not have it.**
Charging `ceil(refusals this month / 200)` looks equivalent and is not. An
address to the nation moves the refusal rate by about a tenth; rounded off month
by month, a tenth of a small number is nothing, so an address came out worth
**exactly zero** and the bots stopped buying one. That is the same insensitivity
as the threshold in different clothes. Accumulated, a tenth fewer refusals is a
tenth fewer points, exactly. The general lesson, which is worth more than the
change: **if a charge exists to make a lever matter, check that the lever moves
it before believing the shape is fixed.**

**And a measurement trap that nearly landed.** The old rule was gated on
`conscriptionEverActive`, and it was also the only thing stopping the bots
idling into `pc_idle_penalty`. Removing it took `reserves_plus_light` at Corps
from 1 idle-charged month a run to 5 and from 5 addresses to 2, which read as
F15 having made the game far harder when it had made the *bot* worse. The idle
test is now explicit, and deliberately left gated on `conscriptionEverActive` to
match the scope the old rule had: ungating it would move `reserves_only` at
Corps from 38% resignations to 15% and reset every number in the benchmark
table, which is a change to the instrument and not to the game. Recorded as
F16 rather than taken.

**The level, and what the cap costs.** At 1 per 200 with a cap of 1,
`reserves_plus_light` pays 16 across a Corps run against the 12 the threshold
charged it, and holds at 35% resignations - the watch number unchanged. Above
about 400 a restrained programme pays almost nothing and Corps falls to 5%;
below about 150 the programmes that conscript at scale are wiped out. The cap is
1 rather than 2 because the step between them is the difference between
`max_effort` resigning on 28% of Corps seeds and on 90%, against the 20% F9 left
it at, and political capital is an integer currency so there is nothing in
between.

The cap has a price and it is stated rather than hidden:
`conscription_over_capacity` refuses about 2,500 people a month, fourteen times
what a restrained programme refuses, and is charged the same 1 a month. At
Division that takes it from 95% resignations to 45%. It still scores 5,162
against a target of 22,000 and still resigns on 100% of Corps seeds, so F6's
third property holds. What the cap buys instead is that a huge call-up makes the
list run *longer* rather than cost more per month, and the cases the courts never
reached are now reported on the scoring screen: the government ends, the court
list does not.

**Balance** (`npm run dist -- 40`). All three watch numbers unchanged: Division
`reserves_plus_light` 43% met, leadership 0.67 and 0.48, `do_nothing` resigning
on 100% of Corps seeds. Brigade byte-identical - four months is not long enough
for a Bill to pass and a call-up to generate a list. What moved, all of it at
the two ends and all of it deliberate: Corps `max_effort` 20% to 28%
resignations, `capacity_heavy` 3% to 0%, `conscription_max_capacity` 100% to
48%; Division `conscription_over_capacity` 95% to 45% and
`conscription_max_capacity` 15% to 0%.

**One thing to watch.** The charge now runs on after a call-up stops, while the
backlog clears. That is deliberate, and the briefing names it ("N still on the
list"), because a charge with no visible cause reads as a bug.
