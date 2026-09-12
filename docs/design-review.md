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

Output of `npm run dist -- 40`, at commit `a476fe8`. **If a change moves these,
update this table in the same commit.** Median final ESE, percentage of the 40
seeds that met the target, percentage that ended in resignation, and the median
leadership factor at the end.

### Brigade — target 10,000 in 4 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,589 | 3,612 | 3,612 | 0 | 0 | 1.00 |
| reserves_only | 17,375 | 18,592 | 19,772 | 100 | 0 | 1.00 |
| reserves_plus_light | 17,721 | 18,877 | 20,188 | 100 | 0 | 1.00 |
| conscription_max_capacity | 3,465 | 3,467 | 3,488 | 0 | 0 | 1.00 |
| conscription_over_capacity | 3,558 | 3,560 | 3,581 | 0 | 0 | 1.00 |
| capacity_heavy | 13,367 | 14,402 | 14,423 | 100 | 0 | 1.00 |
| max_effort | 11,901 | 12,936 | 12,957 | 100 | 0 | 1.00 |

### Division — target 22,000 in 12 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,693 | 3,696 | 3,696 | 0 | 0 | 1.00 |
| reserves_only | 19,148 | 20,291 | 21,599 | **5** | 0 | 1.00 |
| **reserves_plus_light** | 21,343 | **22,102** | 23,217 | **53** | 0 | 1.00 |
| conscription_max_capacity | 5,033 | 5,419 | 5,870 | 0 | 0 | 0.69 |
| conscription_over_capacity | 4,750 | 5,161 | 5,263 | 0 | 55 | 1.00 |
| capacity_heavy | 18,691 | 19,788 | 21,000 | 0 | 0 | 0.66 |
| max_effort | 16,481 | 17,614 | 19,032 | 0 | 0 | 0.48 |

### Corps — target 45,000 in 24 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,736 | 3,756 | 3,786 | 0 | **100** | 1.00 |
| reserves_only | 20,066 | 21,138 | 22,356 | 0 | 45 | 1.00 |
| **reserves_plus_light** | 24,103 | **24,610** | 25,181 | 0 | **23** | 0.83 |
| conscription_max_capacity | 7,252 | 8,107 | 8,902 | 0 | 33 | 0.31 |
| conscription_over_capacity | 5,034 | 5,798 | 6,952 | 0 | 100 | 1.00 |
| capacity_heavy | 22,082 | 22,385 | 23,207 | 0 | 0 | 0.52 |
| max_effort | 19,018 | 20,074 | 21,416 | 0 | 20 | 0.34 |

**The table was re-baselined on 12 September 2026 (F19)**, and the movement is
the deck rather than the model: no line of `src/sim/` that decides an outcome
changed. Two trigger changes reshuffled the event sequence for every seed —
`junior_entry_useless` no longer fires on turn 1 of nearly every run, and
`devolved_objection` waits for Royal Assent — and `treasury_letter` came down
from a threshold nothing reached (£10bn) to £4bn, so it now fires on 39 of 40
Corps runs of the benchmark strategy, whose bots take choice 0 and cancel a
capacity tranche, which returns 625 junior leaders to the field force. That is
the whole of the Corps movement (`reserves_plus_light` 22,970 → 24,610,
leadership 0.73 → 0.83). At Division the letter cannot fire — the benchmark
strategy finishes under £3bn — and the movement there is the reshuffle alone:
the median moved by 224 effective soldiers, 1%, and because the target sits
inside the p10–p90 spread that is worth ten points of met%. Before and after,
with the same code and only the deck swapped:

| Division, `reserves_plus_light` | old deck | new deck |
|---|---|---|
| mean ESE | 21,962 | 22,173 |
| met | 17 / 40 | 21 / 40 |
| `reservist_employers` fires | 63 | 51 |
| `junior_entry_useless` fires | 40 | 0 |

**The three numbers to watch.** If any of these drifts, something has broken:

- `reserves_plus_light` at Division meets the target on **53%** of seeds. Below
  ~25% the headline difficulty is a coin flip again (F2); above ~65% it is a
  walkover. **This is a floor, and the ceiling is known:** a player who runs a
  cadre course at every opportunity reaches **63%** (`PROMOTION_TRIGGER_FACTOR`
  set to 1.01, a measurement and not a change to commit). Before F19 the pair
  was 43% and 55%. The ceiling now sits two points under the walkover line,
  which is recorded as an **ASK** in `DECISIONS.md`: the target is an assumption
  with a range, and if a playtest finds Division no longer close-run the answer
  is a nudge to `target_division` against a `npm run dist` run, not a softer
  event.
- The median leadership factor for `capacity_heavy` and `max_effort` is **0.66
  and 0.48** at Division (0.52 and 0.34 at Corps). If either returns to 1.00, the mechanic has stopped firing (F3).
- `do_nothing` is **17%** of Division and **36%** of Brigade, and still resigns
  on **100%** of Corps seeds. If it climbs past ~60% of any rung, that rung is
  free; if it stops resigning at Corps, the delivery credit has become an idle
  income (F6).

**And one number that is not in the table**, because it is what F13 fixed:
`reserves_plus_light` at Division is charged Treasury pressure on most seeds and
draws the Equipment Plan's contingency on some. If either returns to zero, the
money mechanic has gone dormant again. Read it with `npm run dist` alongside a
check of `briefing.pcReasons`; there is a test for the shape of it
(`tests/step.test.ts`, "the Treasury allowance").

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

**A first step against that risk: the menu now says the rows open.** One line
under the *Decisions* heading — "Tap a title for what the decision does, and
where its numbers come from." The `+` beside the cost was the entire
affordance, and it is the same glyph the groups and the ledger use for a
section header, not for a row inside one. The line wraps to two at 375px and
costs 45px there — once, not per row — which is the cheapest thing to try
before anything that gives the paragraphs their height back.

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

**Correction: the reason given for choosing 26–40 over 25–40 was wrong.** It was
recorded as "25–40 needs single-year population data that is not in the repo".
That data *is* in the repo, and has been since the first commit —
`docs/ew_population_single_year_mid2025.csv`, ONS MYE2 by single year of age. A
25–40 band would have been just as derivable: 13,508,614 persons and 6,904,640
women. **The figures that shipped are right** — `ew_pop_26_40` (12,727,220) and
`ew_pop_f_26_40` (6,520,779) have since been checked against that table and match
to the person, as do all three older bands — so this is a correction to the
reasoning and not to the numbers. It is recorded because the wrong reason would
send the next person looking for data they already have. **Check `docs/` for a
CSV before concluding a figure needs sourcing.**

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

### F18 — Two verdicts carried half the endings, and four could never be read · *Addressed*

**Symptom.** Four of the twelve entries in `verdicts.json` had never once been
selected, and three verdicts covered 69% of all endings. The verdict is the
payoff — the last thing a player reads, and the only part of the game that
travels, because it is what the share card carries.

**Evidence as found.** Every ending of 3 difficulties × 7 scripted strategies ×
40 seeds, 840 in all, at commit `16ff355`:

| Verdict | fires | share |
|---|---|---|
| `missed_high_intact` | 263 | **31.3%** |
| `met_high_intact` | 173 | 20.6% |
| `missed_any_broken` | 143 | 17.0% |
| `resigned_generic` | 124 | 14.8% |
| `missed_any_any` | 101 | 12.0% |
| `resigned_broken` | 31 | 3.7% |
| `met_mid_any` | 5 | 0.6% |
| `met_any_broken` | 0 | **never** |
| `met_high_strained` | 0 | **never** |
| `met_low_any` | 0 | **never** |
| `missed_low_any` | 0 | **never** |
| `fallback` | 0 | *(correct — it is the safety net)* |

**The bands were not the problem, and that is the point.** Quality across the
840 endings runs 0.243 to 1.000 (median 0.697) and leadership 0.264 to 1.000;
122 endings sit in the `low` quality band and 280 are not `intact`. Both bands
are well populated. This is **not** the F13 shape, where a threshold sat
outside the range the game produces.

**The bots are a floor, and here that mattered more than anywhere else.** This
document has said since it was written to treat scripted-strategy numbers as a
floor because the bots never re-plan. Taking the 840 endings as the reachable
set would have retired two verdicts that a player can reach. Three further
populations were run before anything was cut:

| population | endings | what it is |
|---|---|---|
| scripted | 840 | 7 strategies × 3 difficulties × 40 seeds |
| directed | 23,040 | a parameterised family around `reserves_plus_light` — bill, 0–4 capacity purchases, call-up at 0–100% of spare intake, equipment, syllabus, civilian instructors, cadre courses |
| random | 20,000 | random legal actions, the `invariants.test.ts` generator |
| capacity-biased | 90,000 | random play weighted toward `expand_capacity`, the only leader sink a player controls |

**Two of the four were reachable, and they were kept.**

- **`met_high_strained` fires.** Division, bill + 3 capacity purchases +
  call-up at 75% of spare intake + equipment + cadre courses: quality 0.652,
  leadership 0.87, **22,055 against 22,000**. Found independently by the
  random sweep (seed 286169225, 22,003 against 22,000). No bot finds it because
  `reserves_plus_light` sits at leadership 0.98 and the two heavy strategies
  fall past `strained` to `broken` — nothing scripted lands in the window.
- **`missed_low_any` fires**, 18 times in 90,000: missed, low quality,
  *strained* leadership, served to the deadline (e.g. Division seed 1814393114,
  9,713 against 22,000 at quality 0.433, leadership 0.60). The diagnosis that it
  was shadowed by `missed_any_broken` holds **for bot play only** — every
  low-quality bot ending is also broken-leadership. It is not true in general,
  and no reorder was needed.

**Two were genuinely impossible, and the arithmetic says so.** Write ESE as
`U + lf × S`, where `U` is the part the cadre does not scale (the regular
deployable slice and mobilised volunteer reservists, who bring their own
corporals — §7b) and `S` is everything raised on top. Taking the highest value
ever observed for each term, across all 133,880 endings:

| | `U` max | `S` max | ceiling at `lf < 0.6` | target | |
|---|---|---|---|---|---|
| Brigade | 13,038 | 7,426 | 17,494 | 10,000 | *not excluded by this bound* |
| Division | 13,201 | 12,954 | 20,973 | 22,000 | **95% of target** |
| Corps | 13,335 | 30,775 | 31,800 | 45,000 | **71% of target** |

Brigade is excluded by a different constraint, and a cleaner one: **it is out of
action slots.** Four months at two actions a turn is eight slots, three of which
must go on the call-out, the recall and the trace — without them there is nobody
to lead and the factor stays at 1.00 by construction. That leaves five
`expand_capacity` purchases, diverting 5 × 625 = 3,125 corporals, against the
6,462 needed to push the factor below 0.6. Adding every adverse event choice in
the deck (`instructor_revolt` −500, `phase1_instructor_shortage` −300,
`junior_leader_exhaustion` −250, `regular_retention_wobble` −150) still leaves
it short. Measured: **30,000 capacity-biased random Brigade runs, lowest
leadership factor 1.000.** Brigade cannot leave the `intact` band at all.

`met_low_any` fails on bodies. Meeting the target at a quality below 0.45 needs
`target / 0.45` people counted:

| | bodies needed | highest `headcountCounted` ever observed | |
|---|---|---|---|
| Division | 48,889 | 39,314 | 80% of what is needed |
| Corps | 100,000 | 68,266 | 68% |
| Brigade | 22,222 | 29,238 | *enough bodies* — but Brigade has no conscripts (nothing graduates in four months) and cannot leave `intact`, so its quality never falls below 0.628 |

**A correction to the brief that opened this.** It put the observed body ceiling
at "about 32,000 in any run". The true figure is 39,314 at Division and 68,266
at Corps — the brief was quoting an ESE number where a headcount number was
needed. The conclusion survives, with a smaller margin than it claimed (80% of
what is needed, not 65%), and this is why the ceiling is now stated per
difficulty and per bucket rather than as one number.

**What was done.**

1. **Retired `met_any_broken` and `met_low_any`.** Both described meeting the
   target with a force the model cannot produce. They now fall to the generic
   `fallback`, which is what it is for.
2. **Kept `met_high_strained` and `missed_low_any`,** with the witness runs
   above. `met_high_strained`'s rule said `leadership: "any"` — it behaved as
   *strained* only because two earlier entries happened to absorb `intact` and
   `broken`, which meant retiring `met_any_broken` would have silently widened
   it. Its rule now says `strained`, which is what its id and its text have
   always said.
3. **Added a margin dimension** (`margin: near | clear`, spec §11): how far
   from the target the run finished as a share of it, in whichever direction,
   the direction itself carried by `met`. The boundary is 10% of target. It is
   not a round number chosen for tidiness: at Division it is 2,200 effective
   soldiers, and the benchmark note above records the p10–p90 spread there as
   around 2,000, so a margin this size is inside the simulation's own
   run-to-run noise.
4. **Split both of the big verdicts on it** — `missed_high_intact` (31.3%) and
   `met_high_intact` (20.6%), which between them were half of all endings.
5. **Split `missed_any_broken` (17.0%) on the cause of the break,** which needed
   a second new dimension (`cadre: diverted | swamped`, spec §11) because the
   margin band is no use here — 142 of its 143 endings are `clear` misses.
6. **Fixed three defects where the copy said something untrue**, found by
   sweeping every count placeholder for values that render as zero: two
   verdicts naming a cause the run did not have, and a rounding rule that
   printed a miss as a draw across the verdict, the end screen, the share card
   and the briefing.

**The missed split is better motivated than the concentration made it look.**
`missed_high_intact` was read as the game's thesis — *you did everything right
and still could not do it*. That is true of 42 of its 263 endings. The other 221
are the opposite ending: median headcount **3,612**, which is the regular
deployable slice and nothing else, median Treasury cost **£0.1bn**, and quality
as high as 1.000. The quality figures were excellent because the minister never
mobilised. One verdict was telling both stories, and the good line in it — *the
general told the ally he would rather have this than the number* — only makes
sense for the first. It keeps the near miss; the wide shortfall has new copy.

**The met split falls out of the same boundary, and the data makes the cut for
itself.** `met_high_intact` covered every successful run at every difficulty.
Sorted by how much they cleared the target by, the endings do not overlap at
all:

| | wins | surplus over target |
|---|---|---|
| Brigade | 160 | **19.0% – 104.0%** (median 44–92% by strategy) |
| Division | 18 | **0.4% – 9.2%** (median 4.7%) |
| Corps | 0 | — |

There is a clean gap from 9.2% to 19.0% and the 10% boundary sits inside it, so
the same dimension that splits the missed verdict splits this one without a
second number being invented. **It cuts on the mechanism and gets the
difficulty story for free:** no `difficulty` selector was added, and if a rung
is ever retuned the split follows the margin rather than the label. This is the
opposite of the missed side, where there is no natural gap under player-like
play and the boundary had to be argued rather than found.

What the two halves say is F8 restated from the winning end. A `clear` win is
in practice **the Brigade win** — every one of the 160 is Brigade, and the best
Division run found anywhere reaches 23,809 against the 24,200 a clear win would
need, missing the band by 1.6%. Brigade is won by anyone who calls out the
reserves (F8, *by design*), and the new copy says so: the force was found rather
than built, and the next rung up cannot be. The narrow win keeps the existing
text, whose closing line — *the general's note is one line: it will do* — is the
restrained ending the close-run Division result has earned and the Brigade
walkover has not.

**The broken verdict was two mistakes wearing one coat.** `leadershipFactor`
is `leadersAvailable / leadersNeeded` (§7b), so it falls for two quite
different reasons: the numerator taken away, or the denominator raised past it.
The band computes the counterfactual rather than guessing from a correlation —
hand every diverted junior leader back from the training estate and recompute:

| | scripted (840) | random play (25,000) |
|---|---|---|
| `swamped` — returning every instructor would **not** clear the broken band | 121 (70%) | 19 (25%) |
| `diverted` — it **would**; the schools were the cause | 53 (30%) | 56 (75%) |

Both bands are well populated in both populations, and the ratio inverting
between them is itself the point: the bots over-build capacity and the random
player over-calls. In scripted play the split is almost exactly the difficulty
split — Division is 98% `diverted` and Corps is 100% `swamped` — but that is a
fact about the seven strategies, not about the model, and random play shows it
is not a rule. Cutting on the counterfactual rather than on difficulty is the
same choice made for the margin band, for the same reason.

The old copy was written for the `diverted` case alone: *you called up
conscripts and diverted the corporals who should have led them into the schools
that trained them*. For the 70% of scripted endings where that was not what
went wrong, it was naming the wrong cause. The `swamped` text now says the
thing the counterfactual proves — *recalling every instructor from every
training school would not have closed the gap* — and `diverted` says the
opposite, *hand them back and the cadre holds*, because for those endings it is
literally true.

**Two verdicts were telling players things that were not true, and a sweep
found them.** The instrument is worth keeping: render every verdict across
840 scripted and 40,000 random endings, and flag any count placeholder that
comes out as zero.

- **`resigned_broken`** said *"You had called up {conscripts} conscripts and
  found sergeants for a fraction of them"*. Ten broken endings in 25,000 have
  **no conscripts at all** — the play that buys training capacity, diverting
  the corporals, and then calls nobody up. Those players were told they had
  called up **0 conscripts and found sergeants for a fraction of them**. The
  text no longer names a cause or a count, because this verdict spans both
  cadre bands.
- **`met_mid_any`** listed *"{regulars} regulars, {reservists} reservists of one
  kind or another and {conscripts} conscripts, and the three parts do not yet
  trust each other"*. Under random play the conscript column reads zero in
  **35 of its 35 endings** — it fires at Brigade, where nothing can graduate in
  four months. "The three parts" was false every time. It now reads as a return,
  which may legitimately list a zero.

**The lesson is narrower than the F18 headline and worth having on its own.**
*A verdict that names a cause is making a claim about the run, and a
placeholder is not the same as a claim.* Both defects are the copy asserting
something the selector never guaranteed — and in both cases the bots hid it,
because the bots never produce the state that exposes it.

**Reachability after the change**, same 840 endings:

| Verdict | before | after |
|---|---|---|
| `missed_high_intact_clear` | — | 221 (26.3%) |
| `met_high_intact_clear` | — | 160 (19.0%) |
| `resigned_generic` | 124 | 124 (14.8%) |
| `missed_any_any` | 101 | 101 (12.0%) |
| `missed_broken_swamped` | — | 90 (10.7%) |
| `missed_broken_diverted` | — | 53 (6.3%) |
| `missed_high_intact` | 263 | **42 (5.0%)** |
| `resigned_broken` | 31 | 31 (3.7%) |
| `met_high_intact` | 173 | **13 (1.5%)** |
| `met_mid_any` | 5 | 5 (0.6%) |
| `met_high_strained` | 0 | 0 in bot play; **reachable**, witness above |
| `missed_low_any` | 0 | 0 in bot play; **reachable**, 18 in 90,000 |
| `missed_any_broken` | 143 | *split into the two above* |
| `met_any_broken`, `met_low_any` | 0 | *retired* |
| `fallback` | 0 | 0 |

Thirteen verdicts, all reachable, none shadowed. The largest share falls from
**31.3% to 26.3%**; the three verdicts that once carried **69% of all endings
now carry 41%**, spread over six. `fallback` still fires on nothing, which is
correct.

**The cap was raised from 12 to 14, on purpose.** `tests/content.test.ts`
bounds `verdicts.json` — a content budget in the same spirit as the 33-event cap
on the deck, not a technical limit. It exists so each verdict has to earn its
place, and the reachability sweep is the instrument for judging that. Thirteen
of fourteen are used.

**The benchmark is byte-identical** — all 21 rows across the three difficulties.
Nothing in `src/sim/` changed but `score.ts`, and the change there adds a band
without touching ESE, met, resignation or the leadership factor.

**Two tests now hold this shut**, both in `tests/content.test.ts`. One asserts
that **every entry in the file can be selected** — it fails on the file as it
was, naming `met_any_broken`. The other asserts that **no verdict is written
for an impossible state**. The coverage test it replaces asserted that all 18
band combinations had copy, which is what put dead copy in the file in the first
place: it rewarded writing a verdict for every cell of the grid without ever
asking whether the model could reach it.

**The general lesson.** *Selection is first-match, so order is meaning, and a
test that demands total coverage of a grid will quietly fill the unreachable
cells.* F3's note that "several verdicts were unreachable and now fire" was the
same class of problem found by accident; this is it found on purpose. The
transferable habit is the one this document keeps arriving at from different
directions: **before concluding that the model cannot produce a state, check the
arithmetic rather than the bots.** Two of the four cuts would have been wrong.

**The three formatters are now one.** `formatInt` existed in `src/sim/score.ts`,
`src/ui/dom.ts` (as `fmtInt`) and `src/ui/briefing.ts`, which is how one
rounding rule came to be applied three different ways. They were not merely
duplicated, they **disagreed on nine of nineteen test inputs**:

| | `sim/score` | `ui/dom` | `ui/briefing` |
|---|---|---|---|
| `-1234` | `-1,234` (ASCII hyphen) | `-1,234` (ASCII hyphen) | `−1,234` (U+2212) |
| `NaN` | `NaN` | `NaN` | `n/a` |
| `Infinity` | `Infinity` | `∞` | `n/a` |
| `-0.4` | `0` | **`-0`** | `0` |
| grouping | manual, locale-free | `toLocaleString('en-GB')` | manual, locale-free |

The briefing's was the best of the three and is now canonical, in
`src/format.ts`: non-finite prints `n/a` (reachable — `refusalCaseload` is
infinite when the courts never clear), the minus is U+2212 (the correct glyph
in prose, and digit-width so it aligns in the `tabular-nums` columns the UI
sets — `holding.ts` had already reached for it by hand), grouping cannot shift
with the runtime's locale data, and `-0` prints as `0`.

**Nothing the player saw changed.** Every one of the 3,651 rendered strings
across 252 runs — every monthly briefing and every verdict — is byte-identical
to before, and the two old implementations agree with the new one on all
**2,200,001** non-negative finite values tested, which is the whole domain the
DOM components pass it. The `-0` was latent rather than live: every caller
either passes a count or handles the sign itself.

**The money and percentage pairs were a different problem: real distinctions
under confusable names.** `fmtBn`/`formatGbpBn` and `fmtPct`/`formatPct` were
not duplicates — one of each pair is for a figure in a column and the other for
a figure in a sentence — so merging them would have destroyed something. They
are renamed onto that axis instead, and moved beside `formatInt`:

| | in a column | in a sentence |
|---|---|---|
| money | `gbpTabular` — `£2.35bn` | `gbpProse` — `£90m`, `£2.3bn` |
| percentage | `pctTabular` — `12.3%` | `pctProse` — `12%` |

`*Tabular` holds the unit fixed and carries an extra decimal place, because the
reader is comparing it with the figure above it and the points have to line up
— these are the ones set in `tabular-nums`. `*Prose` picks the natural unit and
rounds harder, because the reader meets it once. **The old names hid that
`formatGbpBn` did not always render billions:** below £1bn it renders `£85m`,
so its name was wrong as well as confusable.

**Renaming them turned up a third pair, and this one was a live inconsistency.**
There were two functions called `signed`, one exported from `ui/dom.ts` and one
private to `ui/briefing.ts`, and they disagreed: `dom`'s printed an ASCII hyphen
and did not round, `briefing`'s went through `formatInt`. So the same interface
showed **`-7 PC` in the action menu and `−7` in the Permanent Secretary's note,
for the same figure**. One `signedInt` now, obeying the one convention. This is
the only change in this pass that a player could see, and it is the correction:
every minus in the game is now U+2212.

**A test now fails if anyone writes a second one of any of them.** It walks
`src/` and asserts exactly one file turns a number into text, naming any file
that reappears — and it lists the *old* names too, so pasting one back fails
there rather than quietly giving the UI two of something again. Same guard F17
put on `isKnownAction`, for the same reason: the failure mode is not writing the
wrong code, it is writing the right code twice.

**Watch for.** Three things.

- If a balance pass raises the body ceiling at Division past about 49,000, or
  lets the target be met with a hollowed cadre, `met_low_any` and
  `met_any_broken` become reachable again and the fallback will start firing on
  real endings. **The `fallback` count is the alarm: it should stay at zero.**
- If Division ESE rises by about 2%, Division starts producing `clear` wins.
  That is not a problem — the copy holds, since a Division winner told a corps
  cannot be found this way is being told the truth — but `met_high_intact` would
  stop being the Division verdict, and its 13 endings are the thinnest margin in
  the file.
- The margin boundary is one number doing two jobs. If either the quality bands
  or the difficulty targets move, re-check that 10% still lands in the gap
  between the Brigade and Division win distributions; today it has 9.8
  percentage points of room on either side.
- The three separate `formatInt` implementations that let one rounding rule be
  applied three different ways are **now one**, in `src/format.ts`. See the
  note below.
- `met_mid_any` is down to **five** scripted endings and `met_high_intact` to
  thirteen. Neither is at risk of being unreachable — both have witnesses — but
  they are the thinnest copy in the file and the first to check if a balance
  change moves the quality bands.

**A third defect of this class was a rounding rule, and it was everywhere.**
`missed_high_intact` rendered *"You fielded 22,000 soldiers against a target of
22,000: 0 short"*. Force Ready is a real number and the target is a whole one,
so rounding each to nearest and independently turned a genuine miss of 0.4 of a
soldier into a printed draw. It is rare — about once in 65,000 endings — and it
was **not only a verdict problem**: the end screen, the share card and the
monthly briefing each did their own `Math.round` on the same figure, so the
share card would have carried the contradiction off-site.

**The rule now is that rounding never flatters the result:** what was achieved
rounds down, the gap rounds up. That is not only honest, it reconciles — for a
whole-numbered target, `floor(ese) + ceil(target − ese) === target` exactly, and
`floor(ese) === target + floor(surplus)` on a run that met it. So the two
figures a player is invited to add up always do. `displayEse`,
`displayShortfall` and `displaySurplus` live in `score.ts` and are used by the
verdict templates, `src/ui/screens/scoring.ts`, `src/ui/share-card.ts` and
`src/ui/briefing.ts`. The sentence now reads *"You fielded 21,999 soldiers
against a target of 22,000: 1 short."*

Two things fell out of the fix that are worth recording because they are the
usual shape of a rounding change. Making the gap round up made **"missed by 1"
reachable for the first time**, so the headline needed a singular — it had been
safe only because the number was never 1. And the scoring screen's *Effective*
bar still printed the un-floored figure next to the corrected headline, which
would have put 22,000 and "missed by 1" on the same screen. **A rounding rule
applied in one place is a rounding rule that disagrees with itself somewhere
else.**

---

### F19 — The game knew when a lever was too late, and did not say · *Addressed*

**Found by playing it**, on 12 September 2026, at 375px, as the review's own
method section said someone had to: a full Division run by a player who did not
already know where the levers were.

**Symptom.** Every lever lands months after it is pulled, and the model has
always known the month. The holding pool said so for people already called
(*"the shortest course is 5 months and there are 3 months left"*); the scripted
strategies guard on it (`strategies.ts` will not start a cadre course without
months left for the graduates to lead anybody). The action rows said nothing.
In the hand-played run:

- The Bill went in during month 1, passed in month 4, and the call-up was set
  in month 4. On the 8-month course nothing called then graduates before month
  13. **On the normal syllabus there is no month at Division in which a
  conscript called after a month-1 Bill can graduate in time**, and only one
  (month 3, after a Day 0 Bill) in which one can. The player found this out
  from the holding pool card in month 5, after 741 people were already in it.
- The call-up field asked for a number against an eligible pool of 2.9 million
  and did not say that the estate had room for **21 a month**. The number
  existed (`spareIntake`, which `holding.ts` already reads) and was shown only
  once a holding pool had formed.
- A cadre course was started in month 11 of 12. It finishes in month 13; its
  instructors were out of the line on the day. The row said *−1 PC*.
- The employer-adjudication event sent 1,294 mobilised reservists home in month
  9 and the next note said nothing about it. Force Ready fell by a thousand
  with no stated cause, which reads as a bug. Event pool effects left a machine
  note (`event:<id>:pool:<pool>:<n>`) that the briefing never rendered.

**Fix, in the UI and the content, with no change to what any lever does.**

1. **Every timed lever states its month, and "after the deadline" when it is.**
   `availability()` in `actions.ts` now carries it on the reason line, which is
   the one line F7 kept on the face of the row: the Bill row gives Royal Assent
   and first-graduation months for both procedures and both syllabi; the
   call-up row gives the estate's room now and after pending stand-ups, and the
   graduation month of anyone called this month; capacity, civilian instructors,
   the compressed syllabus, the cadre course, the equipment order, junior entry,
   and the three reserve levers each say when they land. Booleans are untouched
   — a test walks a whole run and checks — so the bots and the benchmark do not
   see it.
2. **Event consequences are said in the next note.** *"The adjudication
   officer's return: 1,293 mobilised reservists went home to their employers."*
   `briefing.ts` renders the pool notes for the six pools the deck touches, and
   nothing else, ahead of the rotated changes.
3. **The arrivals sentence.** Labels were participles (*"Ex-regulars
   reported"*) and the sentence added *"arrived"*, giving *"1,955 Ex-regulars
   reported and 6,312 Strategic Reserve traced and reporting arrived"* on every
   month-3 screen. The labels are nouns now and the verb is supplied once.
4. **Rounding never flatters, on the percentage too.** 21,963 of 22,000 printed
   as *100%* in the note (`pctProse` rounds). `displayReadyPct` floors it, in the
   note, the gauge and the strip; and the strip and the note now both floor the
   ESE, where the strip rounded and the note floored (21,054 against 21,053 on
   one screen).
5. **The refusal line is said in full once.** It repeated verbatim for seven
   months with advice (*an address to the nation*) that was stale once the
   third address cost capital. Later months say *"71 more of those called did
   not report"*, and the advice drops the address once two have been given.
6. **Copy.** *"cases still unheard when you left"* at a deadline ending is now
   *"at the deadline"*. The Bill row's *−12 to −6 PC* printed ASCII hyphens.
   `methodology.ts` said GDP loss penalises political capital, which F13
   deleted; it now describes the allowance, the court list, the idle charge and
   the delivery credit.
7. **The deck.** Every game opened with the same two events, the second a
   choiceless footnote (`junior_entry_useless`, 90% of runs on turn 1). It now
   fires only after the minister has reinstated junior entry, which is what its
   text was always answering, on a new `junior_entry_taken` condition key.
   `devolved_objection` complained the Act was passed while it was a Bill
   (`bill_status == 2` now). `opposition_motion` scolded *"those who voted for
   the Bill"* in runs with no Bill. `briefing_leak` headlined a holding pool the
   player had never created. `treasury_letter`, one of the best-written events,
   needed £10bn of cumulative cost and the biggest scripted run reached £8.7bn;
   it is £4bn now, which reaches Corps and not Division. The ally events and
   three verdicts said *"division"* at Brigade and Corps; `VerdictVars` has a
   `{formation}` placeholder and the events were reworded.
8. **The share path.** No `og:image`, no `og:url`, no favicon, so a pasted link
   got a text-only card on LinkedIn. A 1200×630 `public/og-image.png` in the
   share card's own idiom, an SVG favicon, and a `%SITE_URL%` the build fills
   from `SITE_URL` (the deploy workflow sets it to the Pages address). A
   **Share** button goes first on the scoring screen where `navigator.share`
   takes files, because the clipboard image API is absent from most in-app
   browsers and that is where the audience arrives from; cancelling the sheet
   is not a failure and does not trigger the download fallback.

**What it cost.** Nothing at the model. The benchmark moved, and the movement
is explained under *Benchmarks* above: a deck reshuffle worth 1% of median ESE
at Division, and the Treasury letter now reaching Corps.

**Watch for.** The reasons are strings computed from parameters. If
`courseMonths`, the stand-up delays or the deadlines change, the tests in
`tests/step.test.ts` ("late levers are said to be late") pin the exact months
and will say so. And the general lesson, for the next lever anyone adds: **if
the model knows when a thing lands, the row has to say so.** The holding pool
learned it first; the rows learned it here.

---

### F20 — The only role the turn screen named was the one the player does not hold · *Addressed*

**Raised by Paul**, 12 September 2026: the game is called *Mobilisation
Minister* and the briefing box is headed *Permanent Secretary*. Those are two
different people.

**What was actually wrong.** The fiction was right and the labelling was not.
The player is the Secretary of State for Defence — a minister, and the minister
of the title; the Permanent Secretary is the department's senior official, who
writes to them. But the only place that said so was one sentence in the third
paragraph of the opening screen, which the player leaves at *Take office* and
never sees again. From then on the sole role named anywhere on screen was
`Permanent Secretary · Month 3`, in the uppercase slot that everywhere else in
this UI holds a heading. Read as a badge rather than a by-line, it makes the
player the civil servant.

**Fix — four lines, no new chrome.**

1. **The note head is a from-and-to**: *Permanent Secretary to the Secretary of
   State*. It names the writer and the reader in the one line the player sees
   every month. The month came off it, because the sticky head directly above
   already carries *Month 3 of 12*; the head wraps to two lines at 375px and
   costs 17px against that.
2. **The Day 0 note names the office** — *"You are the Secretary of State for
   Defence. You may take 2 actions a month…"* — in both seeded variants of the
   closing line. This is the one that matters: it is inside the game rather
   than on the screen before it.
3. **The opening note head** gains the article it was missing, so both screens
   read the same: *Permanent Secretary to the Secretary of State · Personal*.
4. **The methodology page says it plainly**, for anyone who arrives from a
   shared link rather than the front door: the player is the Secretary of
   State, the Permanent Secretary is not the player.

**The end of the run, checked after.** Neither the scoring screen nor the share
card contradicted anything — they named no office at all. The only role words
on either were *Prime Minister* (in the resignation headline) and *the
general*, so a stranger arriving on a replay link or seeing the PNG in a feed
learned who judged the run and not who ran it. Both now carry the same
dateline, in the card's existing accent-uppercase idiom:

> SECRETARY OF STATE FOR DEFENCE · DIVISION · 12 MONTHS

It also tells the scoring screen which difficulty the run was, which that
screen never said. The `og-image.png` needed nothing: it already opens *"You
are the Secretary of State for Defence."*

**Left alone on purpose.** `verdicts.json` and the model's comments call the
player *the minister* in the third person. That is correct — a Secretary of
State is a minister — and it is what ties the title to the role. And the
Permanent Secretary stays the author of the monthly note: a game about the
machinery is better for having the machinery write to you.

**One persona still unnamed, and left that way for now.** The scoring screen's
verdict is headed *The general's verdict*, and the verdict texts say *the
general* throughout. Which general is never stated. The fiction points at the
Chief of the Defence Staff — he asked for the division on the opening screen,
and in `missed_high_intact` it is he who has told the ally — but the CGS is
also on that screen, releasing regulars. This is not a conflict with the
player's own role and the plain word reads better than the appointment; it is
recorded here so it is a choice rather than an oversight.

---

### F21 — The player-facing text cited documents the player cannot open · *Addressed*

**Raised by Paul**, 12 September 2026, of the methodology page: it referred to
the design brief, to `DECISIONS.md` and to finding numbers like F14, none of
which a player will ever see, and few of whom will go to the repository to
look.

**Where it actually was.** Not in the page's prose, which was clean — in
`parameters.json`, in the fields that the source popover and the parameter
table read out. **68 of 174 parameters** carried one:

| in a player-visible field | count |
|---|---|
| `source: "Design brief"` — printed in the table's Source column | 8 |
| `rationale: "Design brief."` — the whole rationale | 30 |
| rationale citing `DECISIONS.md` | 20 |
| visible field citing a finding number (F3, F6, F9, F11, F13, F14, F15) | 8 |
| derivation citing a CSV in `docs/` | 2 |

Because these are popover fields, they were in the game as well as on the
methodology page. A citation that cannot be followed is worse than none: it
advertises that something is being withheld.

**Fix.** The internal names came out of the visible fields and the substance
stayed:

- *"Design brief."* → **"Game design."** and *"Design brief. Tuned in the
  balance pass (see DECISIONS.md)."* → **"Game design, tuned for balance."** —
  the register the rest of the file is written in, and true.
- `source: "Design brief"` → **"Game design"**. Eight rows of the table now
  name the game itself rather than a document, which is what they always meant.
- The scripted strategies stopped being named in player text: `max_effort` is
  *an all-out programme*, `reserves_plus_light` *a reserves-first programme*,
  `conscription_over_capacity` *a programme that conscripts far past the
  training estate's capacity*, *the bots* are *the scripted test runs*, and
  *"Tuned against `npm run dist -- 40`"* is *"tuned over batches of 40 scripted
  runs"*. The tuning arguments survive intact, which matters: they are the
  best evidence on the page that the numbers were argued over.
- Finding numbers were deleted, not translated. *"…which is what the design
  review's F14 warned against shipping"* became *"…which is a clause that
  decides itself"* — the reason, rather than the reference.
- The preamble's verification item no longer opens with what "the design brief
  attributed" or closes with `docs/source-verification.md`; it says what was
  re-sourced and that every figure now carries the source it is read from.

**The trail is not lost.** `note` is a field on a parameter that is rendered
nowhere — not the popover, not the table, not `ASSUMPTIONS.md` — and 21
parameters already used it. That is where a finding number belongs, alongside
the documents themselves.

**It cannot come back.** `validate-parameters.mjs` now fails the build if
`label`, `description`, `rationale`, `derivation` or `source` names a file in
`docs/`, the decisions log, the design brief, the design review, a finding
number, a build command, a source file, or *"the balance pass"*. The error
says where to put it instead. Verified by planting each kind and watching the
build refuse it.

**The general lesson.** Everything in `parameters.json` except `note` is
published. It reads like a working file and is not one.

**Checked afterwards in the game itself**, which is where the same popovers
open: all 73 reachable from a month-4 turn screen, and all 174 on the
methodology page, with the text read out of each. No dangling reference
survived — but two things did.

*Parameter ids in the prose.* Sixteen prose fields and twelve derivations
named another parameter by its id: *"reserve_medical_fail_ex_regular puts the
medical failure rate … at 0.48"*, *"crossing willingness_low_threshold_pct"*,
*"Mirrors pc_blame_subsequent."* The methodology page prints an id under every
label, so a reader there can resolve one; **the game's popover never shows an
id at all**, so in the game it is a word with nothing behind it. All of them
are now written in words — *the willingness threshold*, *the credit for
delivery*, *the relaxed medical standard's 4 points*. Derivations were held to
the same rule rather than exempted as arithmetic: *"Trade-trained strength over
the junior-leader cadre = 70,951 / 29,563 = 2.4"* is no harder to check than
the keyed form, and reads.

*Four rationales wrote `GBP 5bn` where the popover's own headline value says
`£200m`.* Twenty-one occurrences, now `£`.

`validate-parameters.mjs` fails the build on a parameter id in any
player-visible field, by the same route as the dangling references.

---

### F22 — The longest rationale did not fit on a phone · *Addressed*

Found while reading the popovers for F21 rather than by looking for it.

**Symptom.** `cost_pc_allowance_per_month` carries a 1,600-character argument.
At 375×812 it rendered **953px tall in an 812px viewport**: it ran off the
bottom of the screen, under the fixed footer, and reading it meant scrolling
the page with the popover open. Ten of the turn screen's popovers overhung the
fold.

**Why the old rule could not save it.** `position()` placed the popover below
the trigger and flipped it above only if the whole thing fitted there. A
popover taller than the trigger's distance from either edge fits neither way,
so it stayed below and hung over.

**Fix, in two parts.** The popover scrolls inside itself (`max-height`,
`overflow-y: auto`, `overscroll-behavior: contain`), and `position()` now cuts
the height to whichever side has more room, **less the fixed footer's height**
— the footer sits above the popover and was eating its last lines on the turn
screen. Verified by opening all 73 turn-screen popovers at 375×812 and at
667×375 (landscape) and asserting that none is clipped by the viewport or
covered by the footer, and all 174 on the methodology page.

**Watch for.** The rationales are long because the arguments are real, and the
answer was the container rather than the prose. If a popover ever needs to be
shortened, shorten it for a reason about the argument, not about the screen.

---

### F23 — The event cards cited their sources by parameter id · *Addressed*

**Checked on Paul's instruction** after F21 and F22, the event card being the
third thing on the turn screen that carries sourced numbers.

**The text was clean.** All 33 events: no repository reference, no parameter
id, no `GBP` where the game writes `£`, no `ESE`, apostrophes consistent.

**The source line was not.** `renderEvent` printed each chip as
`id.replace(/_/g, ' ')`, so the foot of the Day 0 card read:

> Source: MoD press release, 15 January 2026 · strategic reserve recall age ·
> strategic reserve claimed · **ex regular tracked tri service**

The label was in the data all along — *Ex-Regular Reserve on record, all three
Services* — and is what the chips carry now. 25 distinct parameters across 15
event cards were affected; the id stays as a fallback for a parameter that has
gone missing, which is a bug the popover already announces.

A consequence worth keeping: `sourced()` built its `aria-label` as
`"{display}. {label}. Show source"`, so a chip whose text *is* the label read
it out twice. It now says it once when they are the same.

**Three things found in the same pass and deliberately not changed.** Each is
a judgement about the game rather than a defect, and each is Paul's call:

1. **Numbers inside event text are not tappable.** `renderEvent` escapes the
   text, so the card's figures are plain — the sources are chips at the foot
   instead. 11 of the 33 cards print a figure that has a chip below it. The
   opening screen promises *"Every number can be tapped for its source"*, and
   on these cards that is answered one line down rather than in place. Making
   them tappable means markup in `events.json` and 33 rewrites.
2. **A ratio reads as a ratio in the popover and a percentage in the prose.**
   The card says *"25% of notices served are contested"*; its chip's popover
   was headed **0.247**. ***Taken, on Paul's instruction.*** `headlineValue()`
   prints both — **0.247 (25%)** — and is used by the popover's headline and
   the methodology table's Value column; `build-assumptions.mjs` mirrors it, so
   the generated table says the same thing (41 rows carry the dual form).
   Ranges and prose keep the raw figure, which is what the model multiplies by:
   *"Plausible range: 0.7 – 0.9"* under a headline of *0.8 (80%)*.

   Only ratios that are a **share of something** get the percentage. A guard on
   `0 < v <= 1` leaves `instructor_ratio` (8), `junior_leader_ratio` (2.4) and
   a regression slope (-0.7738) alone, and a value under 1% keeps a decimal
   place rather than rounding to *"0%"*, which would be a lie.
3. **`opening.ts` used curly apostrophes** where every other piece of copy in
   the game uses straight ones — 3 against 96. The cause was mechanical: those
   strings are single-quoted, where a straight apostrophe would need escaping.
   ***Taken, on Paul's instruction:*** the three literals are double-quoted
   now, which costs nothing and needs no backslashes. The game is at 156
   straight apostrophes and none curly.

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
- `docs/next-task.md` — one ready-to-paste prompt for F4's residue, carrying
  the measurements and the three traps this repo has already sprung, plus the
  latent bugs the 12 September audit found and did not take. Delete the brief
  when its work is done.
- `mobilisation-minister-design-brief.md` — the original brief. Its §10.3
  balance criteria are the ones the benchmark table above tests, with one
  change: criterion (d), "a sensible mixed strategy can make Division", is now
  measured against `reserves_plus_light` rather than the strategy formerly
  called `mixed`.
