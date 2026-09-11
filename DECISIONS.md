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
| `pc_momentum_bonus` | 2 | 3 | Rewards visible progress |
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
