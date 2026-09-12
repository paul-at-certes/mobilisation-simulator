# Design review: the game, not the model

**First written:** 11 September 2026, after a full playthrough on a phone, a
read of the simulation, and a balance sweep.
**Status of this document:** living. Update the status lines and the benchmark
table whenever a finding is addressed or the numbers move.

The one-line summary of the review that produced this file: **the problems are
all in the game, not the model.** The sourcing discipline holds, the prose is
good, the event deck has texture, the simulation is correct and well tested.
What was weak was the thing built on top of it — the minute-to-minute
experience of being the minister.

---

## How to read this

Each finding carries a **status**:

| | |
|---|---|
| **Open** | Not addressed. Evidence still reproduces. |
| **Partly addressed** | The worst of it is fixed; a named residue remains. |
| **Addressed** | Fixed, with the fix named. Kept here so the benchmark that proved it is not lost, and so the same mistake is recognisable if it returns. |
| **By design** | Looks like a problem, is a deliberate choice. Do not "fix" without reading the reasoning. |

Findings are numbered so they can be cited in commits and in `DECISIONS.md`.
Numbers are stable: a finding that is addressed keeps its number.

---

## How to reproduce the review

Three instruments, in increasing order of cost:

```bash
npm run sim -- --all                  # one seed, every strategy × difficulty
npm run dist -- 40                    # 40 seeds, percentiles and met/resign rates
npm run dev                           # then play it, on a 375px viewport
```

`npm run sim` is enough to see whether a mechanic fires. It is **not** enough
to balance against: at Division the spread between the 10th and 90th
percentile is around 2,000 effective soldiers, which is most of the margin the
difficulty is tuned to. Use `npm run dist` for anything that changes a number.

Three things the automated instruments cannot tell you, and which the review
found by hand:

1. **Play it passively.** Take the two obvious actions on Day 0 and then press
   *End month* until the deadline. If that scores close to the best scripted
   strategy, the middle of the game is a timer and no amount of balance work
   will fix it. This is how F1 was found, and no test would have caught it.
2. **Play it on a phone-sized viewport — and turn the phone sideways.** The
   audience arrives from LinkedIn's in-app browser. Screen-height and
   word-count problems (F7) are invisible on a desktop, and the sticky head and
   fixed footer cost a fixed 138px, which is 17% of a portrait screen and 38%
   of a landscape one. Check 375×812 *and* 667×375.
3. **Play the levers, not just the clock.** Measuring the mid-game by pressing
   *End month* through it measures the months with nothing in them. The turn
   screen is longest once the Bill passes and the pipeline group opens — the
   second pass on F7 corrected a benchmark that had been taken the passive way.

**Clear `localStorage` between hand-played runs.** A run is saved under
`mobilisation-minister:run` and resumed silently — opening `?seed=1&…` does
*not* start a fresh game if one is in progress. A measurement taken on top of a
resumed run is measuring a state you did not play, and it looks like a finding.
`localStorage.clear()` first, every time.

The scripted strategies are a poor proxy for a human — they never re-plan, and
`reserves_only` addresses the nation whenever political capital drops below 30,
which is self-harm under the current rules. Treat their numbers as a floor.

---

## Benchmarks

Output of `npm run dist -- 40`, at commit `84fdc3c`. **If a change moves these,
update this table in the same commit.** Median final ESE, percentage of the 40
seeds that met the target, percentage that ended in resignation, and the median
leadership factor at the end.

### Brigade — target 10,000 in 4 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,589 | 3,612 | 3,612 | 0 | 0 | 1.00 |
| reserves_only | 16,967 | 18,817 | 19,988 | 100 | 0 | 1.00 |
| reserves_plus_light | 17,721 | 19,199 | 20,196 | 100 | 0 | 1.00 |
| conscription_max_capacity | 3,465 | 3,467 | 3,488 | 0 | 0 | 1.00 |
| conscription_over_capacity | 3,558 | 3,560 | 3,581 | 0 | 0 | 1.00 |
| capacity_heavy | 13,367 | 14,402 | 14,402 | 100 | 0 | 1.00 |
| max_effort | 11,901 | 12,936 | 12,936 | 100 | 0 | 1.00 |

### Division — target 22,000 in 12 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,693 | 3,696 | 3,696 | 0 | 0 | 1.00 |
| reserves_only | 19,352 | 20,417 | 21,653 | **3** | 0 | 1.00 |
| **reserves_plus_light** | 20,979 | **21,878** | 23,115 | **43** | 0 | 0.98 |
| conscription_max_capacity | 5,037 | 5,435 | 5,844 | 0 | 0 | 0.68 |
| conscription_over_capacity | 4,761 | 5,162 | 5,259 | 0 | 45 | 1.00 |
| capacity_heavy | 18,671 | 19,701 | 21,054 | 0 | 0 | 0.68 |
| max_effort | 16,229 | 17,727 | 19,092 | 0 | 0 | 0.49 |

### Corps — target 45,000 in 24 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,736 | 3,756 | 3,786 | 0 | **100** | 1.00 |
| reserves_only | 20,259 | 21,325 | 22,531 | 0 | 38 | 1.00 |
| **reserves_plus_light** | 22,433 | **22,970** | 23,221 | 0 | **28** | 0.73 |
| conscription_max_capacity | 7,234 | 7,551 | 8,079 | 0 | 48 | 0.28 |
| conscription_over_capacity | 5,152 | 5,596 | 7,016 | 0 | 100 | 1.00 |
| capacity_heavy | 20,605 | 21,113 | 22,074 | 0 | 3 | 0.46 |
| max_effort | 18,194 | 18,965 | 20,029 | 0 | 28 | 0.32 |

**The three numbers to watch.** If any of these drifts, something has broken:

- `reserves_plus_light` at Division meets the target on **43%** of seeds. Below
  ~25% the headline difficulty is a coin flip again (F2); above ~65% it is a
  walkover. **This is a floor, and since F17 the ceiling is known too:** a
  player who runs a cadre course at every opportunity reaches **55%**, which was
  put to Paul and stands. The bots never do, because their guard fires below a
  leadership factor of 0.85 and at Division the sensible strategy sits at 0.98,
  so 43% is what `npm run dist` reports and 43% is what a regression would move.
- The median leadership factor for `capacity_heavy` and `max_effort` is **0.68
  and 0.49** at Division (0.46 and 0.32 at Corps). If either returns to 1.00, the mechanic has stopped firing (F3).
- `do_nothing` is **17%** of Division and **36%** of Brigade, and still resigns
  on **100%** of Corps seeds. If it climbs past ~60% of any rung, that rung is
  free; if it stops resigning at Corps, the delivery credit has become an idle
  income (F6).

**And one number that is not in the table**, because it is what F13 fixed:
`reserves_plus_light` at Division is now charged Treasury pressure on **32 of
40 seeds** and draws the Equipment Plan's contingency on **14**. If either
returns to zero, the money mechanic has gone dormant again. Read it with
`npm run dist` alongside a check of `briefing.pcReasons`; there is a test for
the shape of it (`tests/step.test.ts`, "the Treasury allowance").

---

## Findings

### F1 — The game plays itself after turn 1 · *Addressed*

**Symptom.** Almost all of the score arrives from decisions taken on Day 0, on
a timer, with no further input.

**Evidence as found (before the 11 September changes).** Ticking two boxes on
Day 0 — call out the Army Reserve, recall the ex-regulars — and then pressing
*End month* eleven times scored 22,019 ESE, 88% of the then-target. The best
scripted strategy, with twenty-odd actions and £3.1bn, scored 23,845, 95%.
Seven percentage points was what all the play was worth.

**Why.** Reserves, ex-regulars and the strategic trace are fire-and-forget: one
action each, then they arrive on a schedule. Together they were 16,800 of the
22,700 ESE a good run fielded.

**What was done.** The forecast line (F5) makes the lag legible, and the
leadership change (F3) turned capacity purchases from a free buy into a trade.

**The residue as recorded.** The marginal value of active play at Division was
**+359 median ESE (1.7%)** over pure reserves. It mattered only because the
target happened to sit inside that gap — met% went 33% → 43%. That was thin,
and the underlying shape was unchanged: the reserve levers were still one-shot
switches with no ongoing decision.

**The fix, taken.** The residue entry named it: *"give mobilised reserves an
ongoing cost that scales with how many you hold… the `reservist_employers`
event is already the seed of this; it fires once and removes 2,000 people."*
That event is now the adjudication of exemption applications under the Reserve
Forces Act — recurring up to three times on a three-month cooldown, and
proportional rather than flat, at **−11% of the mobilised strength** each time.
The magnitude is sourced: 24.7% of call-out notices were contested on Operation
Telic 1, and 45.5% of the exemption applications came from employers rather
than from reservists (HC 57 ¶113); 0.247 × 0.455 = 0.112.

**What it did.**

| at Division | before | after |
|---|---|---|
| `reserves_only` median | 21,592 | **20,417** |
| `reserves_plus_light` median | 21,951 | **21,782** |
| marginal value of active play | +359 (1.7%) | **+1,365 (6.7%)** |
| `reserves_only` met% | 33 | **3** |
| `reserves_plus_light` met% | 43 | **40** |

Reserves alone no longer make a division; reserves plus a restrained pipeline
still do, on 40% of seeds. The one-shot shape is gone — the event fires its
full three times in 38 of 40 Corps runs, spread through the middle game, and
each firing is a real choice between soldiers and political capital.

**The residue of the residue.** Every scripted strategy takes choice 0, which
is the *release* arm, so all of the above is a floor. A player who refuses and
pays the capital keeps the soldiers — which is the decision, and no bot ever
makes it. Do not treat the Division figures as settled until a human has played
against this event.

---

### F2 — The default difficulty was unwinnable · *Addressed*

**Evidence as found.** `mixed` at Division over seeds 1–10 met the target
**once**, and that once by 38 ESE out of 25,000. `max_effort` was 0 for 5,
always 92–98%. The outcome was a function of the seed, not the player, and the
scoring screen could not distinguish good play from bad because everybody lost
by roughly the same amount. `DECISIONS.md` still recorded 3-in-10 from an
earlier pass; the vetting ceiling and a wider event deck had moved it since.

**Fix.** `target_division` 25,000 → 22,000, inside its existing range
[20,000, 30,000], after the leadership rework lowered the ceiling. Now met on
43% of seeds by the sensible strategy.

**Watch for.** Any change that moves the Division ceiling moves this. The
target is an assumption and may be moved again — but move it against a
`npm run dist` run, never against one seed.

---

### F3 — The signature mechanic had never once fired · *Addressed*

**Evidence as found.** The leadership factor was **1.00 in all 18 cells** of the
balance matrix and in every seed tried. It could not be otherwise: the spareable
cadre of 8,869 at a ratio of 1:8 supports 70,952 people, and the training estate
caps conscripts at six to thirteen thousand. You would have needed ~71,000
conscripts to push it below 1.

**The general lesson, which is the most reusable thing in this document.**
*The constraints are in series.* The training estate caps conscript numbers, so
any constraint expressed as a function of conscript numbers sits downstream of
it and can never bind. Before adding a mechanic, check which constraint is
upstream of it. This is also why F4 persists.

**Fix.** `junior_leader_ratio` is now derived from the Army's own figures
(`regular_trained_start / junior_leaders` = 2.4, SPS Tables 3a and 11a) rather
than assumed at 8; the instructor ratio, which was the same number doing a
different job, became its own parameter. The factor is charged for everyone
raised who does not arrive in formed units, and scales them. Full reasoning in
`DECISIONS.md`, model in `docs/sim-spec.md` §7.

**A correction worth recording.** The first estimate of the impact (a factor of
0.29) was wrong — it applied the ratio to all non-regular bodies. Re-deriving
the ratio *alone* would have made it bite at Corps only. It took the change to
*who is charged* to make it bite at Division. Check which population a ratio
applies to before quoting what it will do.

**Side effect worth knowing.** Several verdicts in `verdicts.json` were
unreachable and now fire — notably the one about diverting the corporals who
should have led the conscripts into the schools that trained them.

---

### F4 — The conscription branch carries the most UI and the least consequence · *Partly addressed*

**Evidence as found.** In a representative run the whole conscription programme
delivered 5,314 bodies / 2,176 ESE — **9.6% of the final score** — for about
seven of twenty-four action slots, four clause dropdowns and £2bn.

**What was done.** It is now a genuine trade rather than decoration. Median
final ESE at Division against the number of training-capacity purchases the
strategy makes:

| purchases | strategy | median ESE | vs. one purchase |
|---|---|---|---|
| 0 | reserves_only | 21,592 | −359 |
| 1 | reserves_plus_light | **21,951** | — |
| 3 | capacity_heavy | 19,048 | −2,903 |
| 5 | max_effort | 16,788 | −5,163 |

A little conscription pays and a lot of it loses, monotonically. The decision
has a shape. (`max_effort` is scripted to buy up to eight and stops at five:
its own guard declines to buy while the leadership factor is below 0.85, so it
is now self-limiting — which is the mechanic working on the bot as it would on
a player.)

**The residue.** The four clause selectors — **age band, inclusion of women,
medical standard, exemptions regime** — still barely matter. They resolve into
an eligible-pool size, and the eligible pool is never the binding constraint,
because training capacity and the vetting ceiling bind first (see F3's lesson
about series). Their only live effects are the medical standard's contribution
to training attrition and the political capital each clause costs. That is a
lot of interface, and a lot of the game's most interesting subject matter, for
very little consequence.

**One of the four has since been taken.** The option named first —
*"willingness, refusal rates"* — is now what the **age band** does. Support for
compulsory service runs from 27% among 18–24s to 63% among the over-65s
(YouGov, 4,205 GB adults, 28 May 2024), so the band decides how willing the
people you are conscripting are, and willingness now decides how many of those
called actually report. Model in `docs/sim-spec.md` §10a. The band is no longer
a pool-size control.

**The other three are unchanged**, and the honest reading is that the age band
was the one this data could reach. Women, medical standard and exemptions still
resolve into pool size and attrition, and the pool still never binds. For
those, the options are as they were.

**The band's own effect has since been widened — see F14.** Replacing 18–40
with 26–40 doubles what the clause is worth against the default, and the band
now carries a political-capital cost and an attrition cost of its own. Three of
the four selectors are still pool-size controls, and the pool still never
binds.

---

### F5 — Nothing on screen said where you were heading · *Addressed*

**Evidence as found.** ESE went 3,548 → 3,558 → 3,538 → 12,925 in the opening
months: three flat months in which nothing the player did appeared to work,
right where a new player decides whether to continue. Every lever has a lag —
the Bill three months, a training place two, a course eight, reservists three
to six — and the gauges reported only the past.

**Fix.** The projection under Force Ready: *"On present decisions: 22,299 by
month 12 (89%)."* `src/sim/forecast.ts`, spec §7.1.

**Two properties worth preserving if it is ever rewritten.** It falls month on
month when the player does nothing, because voluntary outflow compounds — the
bathtub became a number that gets worse while you watch. And it moves when an
event resolves, which gives events a visible consequence they did not have.

---

### F6 — Political capital is a tax, not a currency · *Partly addressed*

**Evidence as found.** 35 of roughly 60 event effects are political-capital
deltas. Most event choices are "lose 5 PC" against "lose a small thing", with
no strategic angle; only about a third of choices move a pool, a date or a
rate. After roughly month 7 there was no renewable income at all: the addresses
are spent, blame is spent, and the momentum bonus was out of reach at Corps
scale, so the best possible month was −1 and every event a net negative.

**Consequence as found.** Political capital, not the pipeline, was the dominant
failure mode. Every scripted strategy resigned at Corps (see F9).

**Not a new finding.** The earlier balance work reached the same conclusion from
the mechanics side and recorded it in `DECISIONS.md`: *"the real fix, if one is
wanted, is renewable political capital."* This entry recorded that the content
side agreed. The dial was not the idle penalty and not the event cadence; it
was that there was nothing to earn.

**Fix: there is now something to earn.** One point of political capital per
500 soldiers who actually reach their units in the month — graduations plus
arrivals — capped at 3. It replaces the momentum bonus, which was the same idea
done wrong: paying on a *share of target* made it scale with the difficulty
rather than with the minister, so it fired twice in a good Division run and
never at Corps. Parameters `pc_delivery_per_credit` and `pc_delivery_max`,
model in `docs/sim-spec.md` §9, reasoning in `DECISIONS.md`.

**Why 500.** `regular_gains_annual` is 5,933 a year, or 494 a month: what the
Army produces on its own. The minister earns credit at the rate the Army
manages without them, and only above it.

**Three properties to preserve if it is ever rewritten.**

1. **It excludes the regular pipeline's own monthly gain.** That arrives
   whatever the minister does, and crediting it would make the income idle.
   `do_nothing` earns nothing at every difficulty and still resigns on 100% of
   Corps seeds — that number is now a load-bearing benchmark, not a curiosity.
2. **It pays on headcount, not effectiveness.** The credit is what a minister
   can announce; the score is what can fight. Charging the leadership factor
   against the credit too would say the same thing twice. Leaving the gap open
   puts the game's thesis into the currency the player spends.
3. **The holding pool earns nothing.** Calling up above the training estate's
   spare intake buys no political credit, because nobody was delivered.
   `conscription_over_capacity` still resigns on 100% of Corps seeds.

**The residue, and it is the half this did not touch.** The *spending* side is
mostly unchanged. What existed was a ledger with only one side; there are now
two. Making the outgoing side interesting is a content problem in
`events.json`, not a model one.

**Measure it properly before working on it.** The original entry said "only
about a third of choices move a pool, a date or a rate", which undercounts in
one direction and overcounts in the other. Counted across 33 events and 58
choices:

| what the choice actually moves | choices | |
|---|---|---|
| a binding constraint or a date | 27 | 47% |
| **routes back to PC** (`willingness`, `cost`) | 7 | 12% |
| **downstream of a cap that binds first** (`eligible_pool_pct`, `exemptions`) | 5 | 9% |
| end screen only (`scoring_pc_if_missed`) | 4 | 7% |
| a PC delta, or nothing at all | 15 | 26% |

More choices carry typed effects than the entry credited — but **28% of them
were typed effects that were secretly PC again**. The worst case was
`willingness`: its only consequence anywhere in the model was the refusal-cases
PC penalty, so an event that moved public willingness moved political capital
with extra steps. That made this finding and F4's residue the same problem, and
meant the data that fixed one would fix the other.

**Willingness has since been given a second consequence, and it is the right
one.** It now sets the share of a call-up who refuse to report (§10a), which
puts it *upstream of the training pipeline* rather than downstream of nothing.
Four `willingness` effects in the deck, the addresses, and the Bill's age band
all now decide how many soldiers arrive. That moves 7 choices out of the
"routes back to PC" row and is the single largest correction to this finding —
though note it lands on `willingness` only, and `cost` (5 choices) still routes
back to PC through the Treasury penalty, which F13 shows barely fires anyway.

**Two of the seventeen have since been fixed** — `treasury_letter`'s arms are
now a cut to training capacity against a two-month equipment slip, with the
Chancellor quoting the NAO's £16.9bn Equipment Plan deficit rather than
asserting. `pac_hearing` was deliberately left political. The remaining
fifteen follow the same pattern and the deck is at its 33-event cap, so they
are rewrites, not additions.

**And the spending side now has a resource to manage, not only bills to pay.**
`draw_contingency` spends the £4.1bn the MoD holds inside the Equipment Plan
"to help fund new equipment projects or absorb any unexpected cost increases"
(NAO ¶1.9). It costs **no political capital**, which is the point, and carries
two costs instead: every later step of Treasury pressure costs double, because
there is no buffer left to absorb an overrun, and the emergency equipment order
takes three months longer. Model in `docs/sim-spec.md` §8a.

The decision it creates is real and it is visible in the bots, which were given
only the arithmetic and not the answer: at Corps `reserves_plus_light` draws it
on 40 of 40 seeds and `capacity_heavy` on 38, while **`max_effort` — the
biggest programme — splits 18 draw against 21 raising spending instead**,
because past about £9bn of cumulative cost the steeper slope costs more than
the headroom saves. At Division nobody draws it, because nothing there ever
spends enough to be charged (F13). Corps resignations: `reserves_plus_light`
40% → **23%**, `capacity_heavy` 15% → **3%**, `max_effort` 38% → **25%**, with
final ESE unchanged — the run survives to the deadline without getting closer
to the target, which is exactly what F9 wanted.

**A trap to know about.** Every scripted strategy takes choice 0, so
`npm run dist` is blind to any change that lives in choice 1 — the benchmark
was byte-identical across the `treasury_letter` rewrite. Cover those arms with
direct tests (`tests/step.test.ts`, "the Chancellor's letter") or they ship
unexercised.

---

### F7 — The first screen is too long to play on a phone · *Addressed*

**Evidence as found**, measured at a 375×812 viewport on the Day 0 turn screen:

- **899 words**, **5.8 screens** of scroll.
- The action list alone runs **3,500px** — 4.3 phone screens — with fifteen
  actions, each carrying a paragraph.
- *End month* sits at the very bottom, 5.5 screens down.
- **The gauges are not sticky.** Only the turn bar (month label and Restart) is.
  So the player chooses a −12 PC action with no view of their political capital.

**Fix.** All three of the fixes named when this was written, plus one bug found
while making them:

1. **A sticky status strip** under the turn bar — Ready, Quality, Capital, one
   line, 33px — so the three numbers ride along with the player. The full
   gauges keep the bars, the forecast (F5) and the leadership note. Both read
   their thresholds from the same helpers in `gauges.ts`, so the strip and the
   gauges cannot disagree about whether a number is in trouble. The strip is
   `aria-hidden`: it duplicates the gauges, and a screen reader user has no
   scroll problem to solve.
2. **A fixed footer** carrying the action counter and *End month*. The counter
   moved out of the actions heading, where it could not be read while choosing.
   It is last in the DOM, so it is last in the tab order.
3. **Progressive disclosure.** The four action groups are now `<details>`.
   Open on arrival when they hold a live decision: reserves close themselves
   once every lever has been pulled, the training pipeline stays shut until
   there is a Bill or somebody to train. Closed is one tap away, never hidden —
   pre-building capacity ahead of the legislation is a real strategy. A group
   the player opens by hand stays open in later months.
4. **A bug.** `.action-options` set `display: flex`, which beats the user
   agent's `[hidden]` rule, so every action's dropdowns were on screen from the
   start whether or not the action was ticked — five of them on the Bill alone.
   That was 323px of the Day 0 screen.

**Measured after**, same viewport and seed:

| | before | after |
|---|---|---|
| Day 0 words | 899 | **643** |
| Day 0 scroll | 5.8 screens | **4.5 screens** |
| Day 0 action list | 3,500px | **1,750px** |
| *End month* | 5.5 screens down | **always on screen** |
| political capital | off screen from screen 2 | **always on screen** |

No simulation code was touched and no parameter moved, so the benchmark table
above is unchanged.

---

**A second pass, and it corrected one of the numbers above.** Re-measured by
hand at `?seed=1&difficulty=division`, playing the levers rather than pressing
through.

**The mid-game figure was wrong.** This table used to carry a row reading
*"mid-game turn (month 8) — 2.6 screens"*. It does not reproduce for a player
who does the thing the game is about. Measured down a played run:

| month | state | action list | scroll |
|---|---|---|---|
| Day 0 | everything to decide | 1,750px | 4.5 screens |
| 3–4 | reserves pulled, Bill in the House | **970px** | **3.1 screens** |
| 5–9 | Bill passed, pipeline live | **2,054px** | **4.5–4.7 screens** |

Progressive disclosure works exactly as designed — the reserves group shuts
itself once every lever is pulled, 854px → 45px — but the training pipeline
group opens when the Bill passes and brings 952px with it. So disclosure
*moved* the bulk rather than removing it. The 2.6-screen reading was taken in
the window at months 3–4, before the Bill lands, and read as the mid-game.

The honest statement is: **the screen is shortest in the months when there is
least to decide.** Months 5 onward carry ten live decisions across three
groups, the action list is *longer* than Day 0's, and no grouping rule can fix
that, because every one of those actions is genuinely available. Do not reach
for the disclosure defaults again; the lever left is per-action, below.

**A defect the first pass introduced: a phone turned sideways.** The sticky
head and the fixed footer are a fixed 138px, which is 17% of a 812px portrait
screen and **38% of a 360px landscape one** — the fix for the phone problem
becoming the phone problem. At 667×375 the reading band was 237px and the
gauges filled all of it: no prose on screen at all.

Both affordances matter *more* on a short screen, so they were flattened, not
dropped. Under `@media (max-height: 480px)`: the head goes to one line — a
landscape phone is ≥667px wide, so the month, the three readings and Restart
fit across — and the footer's counter sits beside its hint rather than above
it. The one-line head is additionally gated on `min-width: 600px`, because at
375×400 it overflowed and scrolled Capital off the strip, which is the one
number the strip exists to hold.

| viewport | before | after |
|---|---|---|
| 667×375 (SE landscape) | 138px chrome, 36.8%, 237px band | **101px, 27.0%, 274px** |
| 844×390 (14 landscape) | 138px chrome, 35.4%, 252px band | **101px, 25.9%, 289px** |
| 375×812 (portrait) | — | **unchanged: 77 + 61px** |
| 375×400 (narrow, short) | — | two-line head kept, footer 61 → **56px** |

Portrait re-measures byte-identical to the table above (643 words, 4.49
screens, 1,750px), so the first pass's numbers still stand. CSS only; 61 tests
and the typecheck pass.

---

**A third pass: the descriptions went behind a tap.** Taken on Paul's
instruction, ahead of the playtest this was gated on. Recorded as such, because
the gate was there for a reason and the reason has not gone away: the sourced
paragraphs are the argument, and they are now one tap further from the reader.

Each action row is a `<details>`. The summary is the line that was already
there — title, cost, and a `+`/`−` in the groups' and the ledger's idiom — so
the disclosure costs no height at all. The paragraph is what opens.

| | before | after |
|---|---|---|
| Day 0 action list | 1,750px | **855px** |
| Day 0 scroll | 4.5 screens | **3.4 screens** |
| Day 0 words | 643 | **375** |
| months 3–4 action list | 970px | **637px** |
| months 5–9 action list | 2,054px | **973px** |
| months 5–9 scroll | 4.5–4.7 screens | **3.2–3.4 screens** |
| training pipeline group | 952px | **329px** |

The shape is fixed as well as the size: the mid-game is now shorter than Day 0,
which is what it always should have been. The whole game sits between 2.7 and
3.4 screens.

**Three things that had to be got right, and are worth not breaking.**

1. **The title could no longer be the checkbox's `<label for>`** — it is the
   disclosure control now, and one tap cannot both tick an action and open its
   paragraph. The checkbox carries an `aria-label` instead, or it would reach a
   screen reader unnamed. Verified: clicking the summary does not tick, and
   ticking does not close the paragraph.
2. **The checkbox lost its large tap target with the label.** It gets its own
   back: a wrapping `<label class="action-tick">` whose padding reaches back
   over the row's, and whose negative margins keep it out of the layout — 44×46
   of tap target, no height added. Verified by dispatching a click 3px inside
   the corner, well outside the 22px box.
3. **The `action-reason` line stays on the face of the row.** It is a warning —
   a cost the title does not show ("Legislating 90-day notice costs a further
   −4 PC"), or why an action is closed. A warning behind a tap is not a
   warning. This is why the Bill's row is 82px where the others are 46px.

**Deliberately not remembered across months,** unlike the groups. An open group
means *I am working in this area*, which is a stance worth keeping; an open
paragraph means *I am reading this now*, which is over when the month is.
Within a month it stays open, because the menu is only rebuilt when the month
ends.

**What is still long, and what to watch.** Day 0 is 3.4 screens and the
remainder is the Permanent Secretary's opening note and the event card, which
are the prose the game is for. There is no further cut that does not take
those, and they should not be taken.

The open question is the one the gate was protecting: **does anybody still read
the sourced paragraphs?** The whole credibility of the thing is that every
number carries its source, and a number nobody opens is not carrying anything.
If a playtest says the arguments are going unread, the answer is not to reopen
the paragraphs — it is that the titles and costs are now doing all the work and
have to be good enough to make a reader want the detail. Watch for it.

---

### F8 — Brigade is won by anyone who calls out the reserves · *By design*

Any reserve-based play meets Brigade on 100% of seeds, at about 200% of target.

This is a true finding rather than a bug: **the Army Reserve can produce a
brigade inside five months, and cannot produce a division in twelve.** Brigade
is therefore the tutorial rung — it teaches the levers and you win. It was made
less of a walkover (target 8,000 → 10,000, deadline 5 → 4 months), and the
shorter deadline means the 180-day notice period no longer delivers in time, so
the notice clause is now a real decision. `do_nothing` is 36% and the two
conscription-only controls are 35–36%, so it is not free.

Do not "fix" this by making the reserves smaller. The reserve figures are
primary.

---

### F9 — Corps teaches the wrong lesson · *Addressed*

**Evidence as found.** Every scripted strategy resigned at Corps; none exceeded
52% of target. The game is meant to demonstrate that the pipeline cannot
deliver a corps. What it actually demonstrated was that the political capital
economy funded about 12–15 months of play and Corps is 24 months long, so the
run ended in resignation before the pipeline argument was made. `DECISIONS.md`
carried an open **ASK** on whether Corps should end in a shortfall verdict
rather than a resignation.

**Fix.** F6's delivery credit, with no special case in the ending. Because it
is downstream of F6, fixing F6 fixed this: the credit funds the months in which
the pipeline is actually delivering, which at Corps is most of them.

| at Corps | before | after |
|---|---|---|
| `reserves_plus_light` resign% | 100 | **33** |
| `reserves_only` resign% | 75 | **25** |
| `capacity_heavy` resign% | 100 | **10** |
| `do_nothing` resign% | 100 | **100** |
| `reserves_plus_light` median ESE | 23,203 | **23,928** |

Two-thirds of competently played Corps runs now reach month 24 and end in a
shortfall verdict, which is the argument the rung exists to make: twenty-four
months of sensible mobilisation delivers half a corps. The **ASK is answered by
the mechanic**, not by a rule about how Corps ends — and `do_nothing` still
resigns on every seed, so reaching the deadline is earned rather than granted.

**Watch for.** If `do_nothing` ever stops resigning at Corps, the credit has
become an idle income and both this and F6 have regressed.

---

### F10 — The two "do everything" strategies are now the two worst · *Watch*

After the leadership rework, `capacity_heavy` and `max_effort` score lowest at
Division. That is the intended lesson — over-expanding the training estate
hollows the cadre — but it carries a risk: it can read as the game punishing
engagement.

The mitigation already in place is that `reserves_plus_light` is *also* active
play, just restrained, and it is the best performer. So the lesson is "choose
well", not "do nothing". Watch for the reading going wrong in playtests. If it
does, the answer is a supply-side lever, not a softer factor — and there is one
now: `accelerate_promotion` (F17) lets a minister who has over-expanded do
something about it rather than only regret it. Both strategies improve under it,
`capacity_heavy` at Corps by about 1,000 effective soldiers.

---

### F11 — The ex-regular ceiling is now an upper bound, not an estimate · *Watch*

`ex_regular_report_ceiling` is 0.50: the share of the tracked Ex-Regular
Reserve who ever report. It was an assumption reasoned from two effects —
incomplete address records, and medical and age exemptions.

HC 57 ¶119 measures one of those directly. Of the Regular Reserve personnel
who **actually turned up** at the mobilisation centre on Operation Telic,
**48% failed the medical**, against **14% of the Territorial Army**. So the
medical alone leaves 0.52 of those who report, before any allowance for the
records the MoD has admitted are incomplete, or for age.

That makes 0.50 an upper bound rather than a central estimate: the true figure
is below it, probably well below. **The value has not been changed**, because
lowering it is a balance change and not a sourcing one, and it would land on
the same strategies F1's employer change has just moved. Its range is tightened
to [0.30, 0.52] and its rationale now says so.

**Two things this is good for regardless.** The 48%/14% split is the only
primary measurement the model has of the ex-regular-versus-volunteer
asymmetry, and the model currently treats the two as differing only in
effectiveness, not in who arrives at all. And it is the honest answer to any
future argument that the ex-regular recall should yield more: it should almost
certainly yield less.

**Watch for.** If a later pass lowers this, re-run the benchmark — `where_are_they`
and the whole ex-regular branch sit downstream of it, and at Corps the
ex-regular tail is what the delivery credit (F6) is being paid on from about
month 8.

---

### F12 — Stop-loss was a one-way switch with no cost after the first month · *Addressed*

**Evidence as found.** `stop_loss` cost −9 PC once and then set voluntary
outflow to exactly zero for the rest of the run, with no action to lift it and
nothing that could erode it. The same shape F1 complained about in the reserve
levers: pay once, benefit for ever. It was also the only lever in the game with
no downside at all, which is why every scripted strategy pulls it.

**And nothing in the deck could touch the bathtub.** Outflow was
`regular_voluntary_outflow_annual / 12` — a constant. Of 58 event choices,
none moved it, because there was nothing to move.

**Fix: outflow is now intention × conversion** (`src/sim/outflow.ts`, spec
§7a), both measured separately:

- **intention** — 19% of the Army tells AFCAS it means to leave early (10%
  before the end of the engagement, 6% as soon as they can, 3% notice already
  in; n = 2,446). The series has run 17–23 every year since 2019.
- **conversion** — 0.2456 of that intention is realised within the year, which
  is the published outflow divided by the published intention.

It **reconstructs the old constant rather than replacing it**: 70,951 × 19% ×
0.2456 = 3,310.9 against the 3,311 the Army reports. What the split buys is the
lever. Conversion is held fixed — a minister cannot make somebody who wants to
leave stay — and intention moves.

**What stop-loss does now.** It cuts outflow to a quarter rather than to zero
(compulsion does not reach a medical or disciplinary discharge) and adds 0.5
points of intention for every month engagements are held open, because being
held past the end of an engagement is *impact of Service life on family and
personal life* — the reason cited by 50% of those who have put their notice in,
the top factor in AFCAS by some way. So the leak grows while the compulsion
holds. Traced down a Corps run with stop-loss imposed in month 5:

| month | intention | outflow | junior leaders lost to date |
|---|---|---|---|
| 4 (before) | 17.0 | 250 | 453 |
| 5 | 17.5 | **65** | 479 |
| 12 | 21.0 | 81 | 694 |
| 21 | 26.5 | **107** | 1,047 |

The leak is 64% larger by month 21 than the month it was imposed, and the
junior-leader cadre keeps eroding where it used to freeze — so stop-loss now
feeds F3's leadership factor instead of insulating the player from it. The
forecast line (F5) projects the decay, so the player can see it coming.

**Four events now move intention**, sized against the AFCAS ranking rather than
invented: `regular_retention_wobble` (pay, 28%, both directions),
`junior_leader_exhaustion` and `instructor_revolt` (job satisfaction, 42%),
`briefing_leak` (morale, 33%).

**Cost to the balance, which is small.** Division `reserves_plus_light` 45% →
40% met and Corps resignations 35% → 40%; `do_nothing` does not move at any
rung and still resigns on 100% of Corps seeds; the leadership medians are 0.63
and 0.44 and F4's monotonic penalty is intact.

**Watch for.** `outflow_intent_max_pct` is 40 and nothing in the deck reaches
it — AFCAS has never recorded the Army outside 17–23, so everything above that
band is extrapolation beyond the evidence. If a later pass adds more intention
effects, check the ceiling is still unreachable by ordinary play; a run that
pins at 40 is asserting something the survey does not support.

---

### F13 — Neither money penalty ever fires · *Addressed, and half of it by deletion*

Found while sizing the contingency draw (F6), and it is about the model that
was already there rather than about that action.

**Evidence as found.** Final cumulative cost across 40 seeds, `npm run dist`:

| strategy | Division | Corps |
|---|---|---|
| do_nothing | £0.1bn | £0.1bn |
| reserves_only | £2.0bn | £4.6bn |
| **reserves_plus_light** | **£2.8bn** | **£6.8bn** |
| capacity_heavy | £3.2bn | £8.6bn |
| max_effort | £3.3bn | £9.7bn (max £11.1bn) |

`cost_pc_penalty_threshold` was **£5bn**. So the money mechanic was entirely
dormant at Brigade and Division — the most expensive strategy at Division
finished at £3.7bn on its worst seed, 74% of one step, and no run had ever paid
a penny of Treasury pressure at the headline difficulty. At Corps it fired once,
twice for the biggest spender.

**The diagnosis, which is the reusable part.** A flat threshold on a
*cumulative* total, charged *every month*, cannot be tuned across three run
lengths. The charge is steps × months remaining, so it grows with the square of
the campaign. Measured over 40 seeds, the political capital a lowered flat
threshold takes off `reserves_plus_light` across a whole run:

| flat threshold | Brigade | Division | Corps |
|---|---|---|---|
| £5bn (as found) | 0 | **0** | 2 |
| £2.5bn (the range floor) | 0 | 2 | 22 |
| £2bn (below the range) | 0 | 6 | **36** |

Anything low enough to be felt at Division is an order of magnitude heavier at
Corps, landing on exactly the rung F6 and F9 had just rescued. The number was
not set wrong; the *shape* was wrong.

**Fix: the threshold became an allowance sized to the campaign.**
`cost_pc_allowance_per_month` × the difficulty's deadline — £0.8bn at Brigade,
£2.4bn at Division, £4.8bn at Corps. The fiction is better than the flat figure
it replaced: the Treasury votes a budget for an operation, and a longer
operation is voted a bigger one. At £200m a month — 3.9% of one month of the
defence budget — the sensible strategy at Division is charged on **32 of 40
seeds**, and Corps lands within a point or two of where F6 and F9 left it
(`reserves_plus_light` 35% resignations, unchanged; `max_effort` 18% → 20%).

Two properties fixed the level inside its range, and both are load-bearing:

- **Below about £175m Corps gets materially harder** than F9 left it —
  `max_effort` resignations 18% → 35–40%. That is a difficulty change smuggled
  in under a different finding, and it was not wanted.
- **`equipment_plan_contingency` must stay worth less than one whole step at
  Corps** — £4.1bn against an allowance of £4.8bn is 0.85 steps, where the old
  flat £5bn gave 0.82. If the contingency cleared a step on its own, drawing it
  would win everywhere and the fork it exists for would close. It very nearly
  did: at £150m a month the draw beat raising spending on every Corps seed. The
  crossover is back where F6 put it, just above £9.6bn, and the bots resolve it
  19 draw against 18 raise. There is a test for this
  (`tests/step.test.ts`, "the Treasury allowance").

At Division the contingency is worth 1.7 allowances and clears the charge
outright. That is honest rather than broken — the mobilisation there costs less
than the Equipment Plan's buffer holds — and the price is paid in the
three-month equipment slip instead, which at a twelve-month deadline is real.
`reserves_plus_light` draws it on 14 of 40 seeds.

**The GDP penalty was not fixed. It was deleted.** A step was
`gdp_pc_penalty_step_pct` = 0.25% of GDP, **£7.6bn of lost output**, and the
largest cumulative loss any strategy produces at any difficulty across 40 seeds
is **£4.35bn** — 57% of one step:

| strategy | Division (max) | Corps (max) |
|---|---|---|
| reserves_plus_light | £1.28bn | £3.34bn |
| capacity_heavy | £1.34bn | £3.88bn |
| **max_effort** | £1.32bn | **£4.35bn** |

To fire at Division the step would have had to fall to about **0.03%** of GDP —
a factor of eight, well below the stated range floor of 0.1, and £0.9bn of lost
output is not a politically salient quantity. The parameter had been sized for
a mobilisation an order of magnitude larger than the one the game models. And
even re-justified it would not have earned its place, for a reason measured
below in F14: at Division, conscripts are £0.09bn of `reserves_plus_light`'s
£1.17bn of cumulative output loss, so it would have behaved as a second Treasury
penalty on reservist numbers. `gdp_pc_penalty_step_pct` and
`gdp_pc_penalty_per_step` are gone from `parameters.json` and from §9.
Cumulative output loss is now **stated** to be a scoring-screen quantity and an
event trigger, in the spec (§8) and in a test, rather than being one by
accident.

**The GDP multipliers were re-derived on the way, and it changed nothing.** The
four `gdp_age_multiplier_*` came from ASHE and the Labour Force Survey rather
than from an assumed ladder, and every one was too high — the 18–25 band by a
third. The benchmark did not move. That is the proof of this finding rather
than a disappointment, and the re-derivation still earns its keep: it is what
priced the 26–40 band in F14.

**What this cost elsewhere.** Nothing at Brigade, which spends £0.36bn against
an £0.8bn allowance and stays the tutorial rung (F8). At Division,
`conscription_over_capacity` resignations 90% → 95%: it is the one strategy
that spends heavily and delivers nothing, so it is the one the charge finds.

### F14 — Every age band started at 18, so the band could not do much · *Addressed*

Found while wiring the YouGov polling into the age-band clause (F4), and it was
about how the clause was *defined* rather than how it was modelled.

**The data.** Support for compulsory service by age (YouGov, 4,205 GB adults,
28 May 2024 — the question offers military service *or* community volunteering,
so the levels are generous, but the gradient is the point):

| | 18–24 | 25–49 | 50–64 | 65+ |
|---|---|---|---|---|
| support | 27% | 39% | 53% | 63% |
| **strongly oppose** | **45%** | 37% | 24% | 18% |

**Why almost none of it reached the player.** The four bands the Bill offered
were 18–25, 18–30, 18–40 and 18–65. **All of them started at 18**, so all of
them contained the most hostile group and widening only diluted it:

| band | population | weighted support | vs 18–30 |
|---|---|---|---|
| 18–25 | 5.9m | 28.6% | −4 |
| 18–30 | 10.0m | 32.8% | — |
| 18–40 | 18.7m | 35.7% | +3 |
| 18–65 | 38.2m | 42.2% | +9 |

**Fix: 18–40 is replaced by 26–40**, the only band on offer whose lower bound
is not 18. It is worth **+6** against the default where 18–40 was worth +3, and
it needed no new sourcing: `ew_pop_18_40 − ew_pop_18_25` is exactly ages 26–40
(both are inclusive of their end years), and every single year of age in it
falls inside YouGov's 25–49 group, so its population-weighted support is that
group's figure exactly — 39.0%. Checked the long way round, by subtracting the
18–25 band's weighting from the 18–40 band's, it comes to 38.99%. The same
subtraction gives its output multiplier, 0.862, the highest of the four.

**It is paid for twice, and the second one is the one that matters.**

1. **`pc_cost_band_26_40` = −8, `pc_cost_band_18_65` = −14.** The age band was
   the one clause in the Bill that cost no political capital at all, while
   being the clause that moved the refusal charge more than anything else the
   player could do. That was not a gap this finding created — see F15 — but it
   is one this finding had to close before adding a better band.
2. **`attrition_age_add_26_40` = +5 points on a base of 26.** This is the part
   that lands, and the reasoning is F3's lesson applied. The obvious places to
   charge an older band — `medical_pass_*`, `exemption_*` — both resolve into
   the size of the eligible pool, and the eligible pool never binds, so a cost
   charged there is a cost not charged at all. Training attrition acts on the
   people actually on the course. The band now buys survival and pays in
   soldiers: at Corps `reserves_plus_light` resigns on 20% of seeds under 26–40
   against 35% under the default, and finishes on 22,580 ESE against 22,652.
   (Those figures were taken before F15; the direction is unchanged, and the
   reason for it is now a lower court list rather than a threshold cleared.)

**And the counterweight this was gated on turned out not to be the one it
needed.** The plan of record was: fix the money penalties (F13), then ship the
band, because the band's cost is that it takes people at peak earnings and peak
earnings only cost something once the GDP penalty fires. Measuring it killed
that plan. Cumulative output loss at Division, split by who it comes from:

| strategy | conscripts | reservists | total | total under 26–40 | change |
|---|---|---|---|---|---|
| **reserves_plus_light** | **£0.09bn** | £1.08bn | £1.17bn | £1.22bn | **+4.3%** |
| capacity_heavy | £0.19bn | £0.96bn | £1.15bn | £1.26bn | +9.4% |
| max_effort | £0.24bn | £0.81bn | £1.05bn | £1.19bn | +12.8% |

The benchmark strategy's output loss is seven-eighths reservists, who carry a
multiplier of 1.0 whatever the Bill says. Changing the band moves the quantity
by 4%, and a step function does not notice 4%. **The GDP arm could never have
priced this band for the strategy the benchmark watches**, at any threshold —
which is the argument for deleting it (F13) rather than re-justifying it, and
the reason the band is priced in capital and in attrition instead.

**Do not reach for a bigger `conscription_refusal_conversion` instead.** That
would scale refusal across every band equally and change nothing about the
decision; the problem was the span, not the level.

---

### F15 — A cliff at 25 decided more than any clause did · *Addressed*

Found while pricing F14's new band, by switching the cliff off and re-running
the sweep.

**The mechanic as found.** `pc_low_willingness_penalty` charged 2 political
capital a month whenever conscription was active and `effectiveWillingness` was
below `willingness_low_threshold_pct` = 25. Willingness starts at 20. The band
adjustments are −4, 0, +6, +9. So **two of the four bands cleared the threshold
and two did not**, and nothing else in the game reliably crossed it: an address
is a temporary boost, and the deck's willingness effects are small.

**What it was worth.** Holding everything else fixed and re-running the 40 seeds
with the threshold set to 0, so that nobody is ever charged:

| Corps, `reserves_plus_light` resign% | cliff on | cliff off |
|---|---|---|
| 18–30 (default) | **35** | **3** |
| 26–40 | 20 | 20 |
| 18–65 | 38 | 38 |

The two bands above the line do not move, because they were never charged. The
default band moves by 32 points. Nearly all of Corps's difficulty for a default
Bill, and the whole of 26–40's advantage over it, was one binary threshold —
not the polling, not the refusal rate, not the pipeline.

**Fix: charge the refusals that actually happen.** The model already counted
them (`conscriptsRefusedTotal`, §10a); it simply never charged for them, which
is why the label on screen — *"Refusal cases in the courts"* — was describing
something the game was not doing. Refusals now go onto a court list. Every
`pc_refusal_per_charge` = 200 of them costs one political capital, at most
`pc_refusal_max` = 1 a month, and **what is not charged this month stays on the
list**. Model in `docs/sim-spec.md` §9a.

**The carry-over is the load-bearing part, and the first attempt did not have
it.** Charging `ceil(refusals this month / rate)` looked equivalent and was not.
An address to the nation moves the refusal rate by about a tenth; rounded off
month by month, a tenth of a small number is nothing, so the address came out
worth **exactly zero** and the bots stopped buying it. That is the same
insensitivity as the threshold, wearing different clothes — a proportional
charge that is not sensitive to the lever it exists to price. Accumulated, a
tenth fewer refusals is a tenth fewer points, exactly. **If a charge is meant to
make a lever matter, check that the lever moves it before believing the shape
is fixed.**

**What it cost.** All three watch numbers are unchanged: Division
`reserves_plus_light` 43% met, leadership 0.67 and 0.48, `do_nothing` resigning
on 100% of Corps seeds. Corps `reserves_plus_light` holds at 35% resignations,
paying 16 political capital across a run where the threshold charged it 12.
What moved is the two ends, and both deliberately:

| | before | after | |
|---|---|---|---|
| `max_effort`, Corps resign% | 20 | **28** | the biggest programme refuses the most and now pays for it |
| `capacity_heavy`, Corps resign% | 3 | **0** | it conscripts moderately and was being charged as though it conscripted heavily |
| `conscription_max_capacity`, Corps resign% | 100 | **48** | charged for a flat state before; charged for its actual refusals now |
| `conscription_over_capacity`, Division resign% | 95 | **45** | see below — this one is a real cost of the cap |

**The known under-charge, stated rather than hidden.**
`conscription_over_capacity` refuses about 2,500 people a month, fourteen times
what a restrained programme refuses, and the cap means it pays the same 1 a
month. At Division that takes it from 95% resignations to 45%. It still scores
5,162 against a target of 22,000 and still resigns on **100%** of Corps seeds,
so F6's third property survives. The cap is there because political capital is
an integer currency and the step from 1 to 2 is the difference between
`max_effort` resigning on 28% of Corps seeds and on 90% of them; there is
nothing in between. What the cap buys instead is that a huge call-up makes the
list run *longer* rather than cost more per month, and the cases that were never
heard are now reported on the scoring screen — the government ends, the court
list does not.

**Two things to watch.**

- If `pc_refusal_max` is ever raised to 2, re-measure `max_effort` at Corps
  before anything else. It is the strategy the cap protects.
- The charge now runs on after a call-up stops, while the backlog clears. That
  is deliberate and it is named in the briefing line (*"N still on the list"*),
  because a charge with no visible cause reads as a bug.

---

### F16 — The bots handle the idle penalty by accident · *Watch*

Found while fixing F15, as the thing that nearly corrupted its measurement.

Before F15 the scripted strategies bought a third address to the nation when it
would lift willingness back over the refusal threshold. That test was gated on
`conscriptionEverActive`, and it was also — incidentally — the only thing
stopping the bots idling into `pc_idle_penalty`. Removing the threshold removed
the side effect: at Corps `reserves_plus_light` went from 1 idle-charged month a
run to 5, and from 5 addresses to 2, which read as F15 having made the game
much harder when it had made the *bot* much worse.

The idle test is now explicit in `politicalUpkeep`, and deliberately left gated
on `conscriptionEverActive` to match the scope the old rule had. **That leaves a
known hole**: `reserves_only` never conscripts, so it never takes a third
address and eats the idle charge all run. Ungating it moves `reserves_only` at
Corps from **38% resignations to 15%** — a change to the instrument, not to the
game, and one that would reset every number in the benchmark table above.

So it is recorded rather than taken. If it is ever taken, take it on its own,
re-baseline the whole table in the same commit, and say plainly that the
movement is the bot improving rather than the game softening. This is the
general hazard the review should hold onto: **a benchmark made of bots measures
the game and the bots at once, and a change that touches how the bots decide is
not measuring what you think it is.**

### F17 — The signature constraint now has a counter-lever · *Built*

The proposal this section used to carry, built on 12 September 2026. It is
recorded as a finding rather than a proposal because measuring it changed what
it is for.

**The problem it answers.** After the leadership rework (F3) the honest model
says *you cannot lead what you raise* — and said nothing else. A constraint with
no counter-lever is a wall rather than a puzzle, and it carried the risk F10
names: the two "do everything" strategies are the two worst, which can read as
the game punishing engagement. Historically the counter is exactly what you
would expect: war-substantive rank, accelerated promotion, short commissioning
courses.

**What was built.** `accelerate_promotion` runs a cadre course. Model in
`docs/sim-spec.md` §7c. Three things bound it: the promoted lead at
`eff_promoted_leader`, the course borrows its instructors from the same cadre,
and the battle school runs one course at a time.

**The course length is sourced, and the near-miss is worth recording.** Eight
weeks, from a peer-reviewed study whose subjects were soldiers on the course
(Maroni et al. 2025, *Ergonomics* 69(2), 206–220). The first search returned
**16 weeks** from a newspaper — that is the Platoon *Commanders'* Battle Course,
an officer course and a different thing — alongside 7 weeks from the Caribbean
Military Academy in Jamaica and "2/3 weeks" from an Arma 3 milsim clan. Taking
the first plausible number would have put an officers' course length on an NCO
mechanic, wrong by a factor of two. The MoD's own Infantry Battle School page
gives no duration and refuses automated fetching.

**The measurement changed what the lever is for.** It was scoped as a Corps
lever, on the reasoning that F9 wanted a way to buy past the wall at the long
difficulty. The arithmetic says otherwise, and it says something better. A
course is worth about 124 effective leaders, against the gap each strategy
carries at its deadline:

| at the deadline | leaders short | courses to close it |
|---|---|---|
| **Division `reserves_plus_light`** | **326** | **3** |
| Division `capacity_heavy` | 4,448 | 36 |
| Corps `reserves_plus_light` | 4,566 | 37 |
| Corps `max_effort` | 19,751 | **160** |

A fixed-size lever helps most where the gap is smallest. **You can complete a
division's cadre and you cannot build a corps's** — which is the game's own
thesis, arrived at from the other end. The lever finishes a job that is nearly
done and is marginal against a job that is not.

**What it cost.** Brigade is byte-identical: a course takes two months and the
bots' guard needs months left for the leaders to lead anybody, so there is never
time. At Division the watch number is unchanged at 43% — the bots' guard fires
below a leadership factor of 0.85 and the sensible strategy sits at 0.98, so it
never triggers. The leadership watch numbers moved deliberately, 0.67/0.48 to
**0.68/0.49** at Division and 0.43/0.29 to **0.46/0.32** at Corps, which is the
mechanic firing. At Corps everything improves modestly and nothing breaks:
`reserves_plus_light` 22,633 → 22,970 with resignations 35% → 28%,
`capacity_heavy` 20,162 → 21,113, `max_effort` 18,208 → 18,965 with
resignations unchanged at 28%. `do_nothing` still resigns on every Corps seed.

**The one number to watch, and it is a ceiling rather than a floor.** A player
who runs a cadre course at every opportunity takes `reserves_plus_light` at
Division from 43% to **55%** of seeds meeting the target, with leadership
reaching 1.00. That is inside the stated band — a walkover starts around 65% —
and a lever that rewards being used well is the point of adding one.

**This was put to Paul and it stands** (`DECISIONS.md`, 12 September 2026). The
reasoning is worth carrying: 43% and 55% are a **floor and a ceiling**, not a
drift. This document has always said to treat scripted-strategy numbers as a
floor because the bots never re-plan; this is the first change that puts a
number on how much room a thinking player has above that floor at the headline
difficulty. A game in which the floor and the ceiling are the same number is a
game in which understanding the mechanics does not pay.

So: **43% remains the watch number**, and if it moves something has broken. The
55% is a second, softer figure the benchmark cannot produce on its own —
reproducing it means setting `PROMOTION_TRIGGER_FACTOR` to 1.01 so the bots take
a course whenever one is available, which is a measurement and not a change to
commit. If playtests show a new player finding the course by accident and
Division ceasing to feel close-run, the answer is a smaller course or a bound on
how many a run may hold — not a higher target, which would punish the player who
never found the lever.

**An escalating price was tried and abandoned**, the shape `pc_address_subsequent`
uses. It made things worse in both directions, and the reason generalises:
**political capital is abundant at Division and scarce at Corps**, so pricing a
lever in capital charges the rung that does not need it and misses the one that
does. It left the Division ceiling at 55–58% and took `max_effort` at Corps from
28% resignations to 65%. What bounds this lever is the course length and the
one-at-a-time rule, not its price.

**A bug worth keeping in mind.** The action was asked for by the bots on every
turn of its first run and silently dropped: `isKnownAction` in `step.ts` was a
second hand-maintained list of action ids, alongside `ORDER` in the action menu,
and an action missing from it was rejected before it reached `applyAction` with
nothing in the notes. The benchmark came back byte-identical and looked like
evidence that the lever did nothing. It is derived from `ACTION_IDS` now, and
there is a test that fails if anyone turns it back into a literal. **Two
hand-maintained lists of the same thing is one too many, and a byte-identical
benchmark is a claim that needs checking rather than a result.**

---

## The next mechanic, if one is wanted

The leadership wall now has a counter-lever (F17), so the obvious gap is
elsewhere. The two standing candidates are both recorded above rather than here:
the spending side of political capital (F6's residue — fifteen event choices
that are still a flat capital delta against a small thing, and the deck is at
its 33-event cap so they are rewrites), and the three Bill clauses that still
resolve into a pool that never binds (F4's residue).

## What is working — do not "fix" these

- **The sourcing discipline.** Every number carries `source`, `url`, `asOf`,
  `confidence`; the build fails otherwise; assumptions carry a range and a
  rationale shown in the UI. This is the project's whole credibility and it is
  intact. The leadership rework was possible *because* the two figures needed
  were already in the file with their sources.
- **The prose and the register.** The Permanent Secretary's notes, the event
  text and the general's verdicts are good, and the dry civil-service tone is
  consistent. Copy changes should be held to that standard.
- **Determinism and replay.** `?seed=&difficulty=` reproduces a run exactly.
  Guard this: the forecast was deliberately built not to consume the run's
  randomness, precisely so that rendering the UI cannot move the seed.
- **The event deck's texture.** 33 events, roughly one a month, grounded where
  they quote a number and carrying no numbers where they are fiction.
- **The two-bar scoring graphic.** Bodies against effective soldiers, with the
  gap as the point, is the clearest statement of the thesis anywhere in the
  product.
- **The ledger.** It is where the bathtub, the diverted leaders and the holding
  pool are all visible and honest.

---

## Cross-references

- `DECISIONS.md` — the decision log, newest last. Items marked **ASK** need
  Paul's confirmation.
- `docs/sim-spec.md` — the model. §7 is effectiveness and leadership, §7.1 the
  projection, §13 the scripted strategies.
- `ASSUMPTIONS.md` — generated; every assumption with its range and rationale.
- `mobilisation-minister-design-brief.md` — the original brief. Its §10.3
  balance criteria are the ones the benchmark table above tests, with one
  change: criterion (d), "a sensible mixed strategy can make Division", is now
  measured against `reserves_plus_light` rather than the strategy formerly
  called `mixed`.
