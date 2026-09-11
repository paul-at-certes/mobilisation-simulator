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

Output of `npm run dist -- 40`, at commit `56f7721`. **If a change moves these,
update this table in the same commit.** Median final ESE, percentage of the 40
seeds that met the target, percentage that ended in resignation, and the median
leadership factor at the end.

### Brigade — target 10,000 in 4 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,591 | 3,611 | 3,611 | 0 | 0 | 1.00 |
| reserves_only | 16,978 | 18,828 | 19,999 | 100 | 0 | 1.00 |
| reserves_plus_light | 17,722 | 19,199 | 20,198 | 100 | 0 | 1.00 |
| conscription_max_capacity | 3,466 | 3,466 | 3,486 | 0 | 0 | 1.00 |
| conscription_over_capacity | 3,560 | 3,560 | 3,580 | 0 | 0 | 1.00 |
| capacity_heavy | 13,367 | 14,402 | 14,402 | 100 | 0 | 1.00 |
| max_effort | 11,901 | 12,936 | 12,936 | 100 | 0 | 1.00 |

### Division — target 22,000 in 12 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,699 | 3,699 | 3,699 | 0 | 0 | 1.00 |
| reserves_only | 19,401 | 20,466 | 21,702 | **3** | 0 | 1.00 |
| **reserves_plus_light** | 20,803 | **21,910** | 22,934 | **45** | 0 | 0.94 |
| conscription_max_capacity | 4,974 | 5,418 | 5,866 | 0 | 10 | 0.60 |
| conscription_over_capacity | 4,307 | 4,915 | 5,256 | 0 | 80 | 1.00 |
| capacity_heavy | 18,322 | 19,427 | 20,764 | 0 | 0 | 0.64 |
| max_effort | 15,958 | 17,336 | 18,897 | 0 | 0 | 0.45 |

### Corps — target 45,000 in 24 months

| strategy | p10 | median | p90 | met% | resign% | lead |
|---|---|---|---|---|---|---|
| do_nothing | 3,742 | 3,764 | 3,797 | 0 | **100** | 1.00 |
| reserves_only | 20,365 | 21,446 | 22,717 | 0 | 38 | 1.00 |
| **reserves_plus_light** | 22,575 | **22,737** | 22,898 | 0 | **35** | 0.68 |
| conscription_max_capacity | 6,568 | 7,251 | 7,968 | 0 | 100 | 0.35 |
| conscription_over_capacity | 4,307 | 4,915 | 5,805 | 0 | 100 | 1.00 |
| capacity_heavy | 19,956 | 20,288 | 20,875 | 0 | 15 | 0.40 |
| max_effort | 17,762 | 18,536 | 19,076 | 0 | 38 | 0.27 |

**The three numbers to watch.** If any of these drifts, something has broken:

- `reserves_plus_light` at Division meets the target on **45%** of seeds. Below
  ~25% the headline difficulty is a coin flip again (F2); above ~65% it is a
  walkover.
- The median leadership factor for `capacity_heavy` and `max_effort` is **0.64
  and 0.45**. If either returns to 1.00, the mechanic has stopped firing (F3).
- `do_nothing` is **17%** of Division and **36%** of Brigade, and still resigns
  on **100%** of Corps seeds. If it climbs past ~60% of any rung, that rung is
  free; if it stops resigning at Corps, the delivery credit has become an idle
  income (F6).

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
| `reserves_only` median | 21,592 | **20,466** |
| `reserves_plus_light` median | 21,951 | **21,910** |
| marginal value of active play | +359 (1.7%) | **+1,444 (7.1%)** |
| `reserves_only` met% | 33 | **3** |
| `reserves_plus_light` met% | 43 | **45** |

Reserves alone no longer make a division; reserves plus a restrained pipeline
still do, on 45% of seeds. The one-shot shape is gone — the event fires its
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

**Options, none yet taken.** Either give the clauses a consequence that is not
pool size — willingness, refusal rates, the shape of the event deck, the
quality of the intake — or reduce them to a single "how hard do you push"
control and let the prose carry the subject matter.

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
unchanged: 35 of 60 event effects are still PC deltas and most event choices
are still a flat tax with no strategic angle. What existed was a ledger with
only one side; there are now two. Making the outgoing side interesting is a
content problem in `events.json`, not a model one.

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
does, the answer is a supply-side lever (below), not a softer factor.

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

## The next mechanic, if one is wanted

The honest model now says: **you cannot lead what you raise.** That is true and
it is the point, but a constraint with no counter-lever is a wall rather than a
puzzle. Historically the counter is exactly what you would expect —
war-substantive rank, accelerated promotion, short commissioning courses.

An action that *makes* junior leaders — converting trade-trained regulars into
cadre after a delay, at a cost in the effectiveness of those it promotes —
would turn the leadership factor from a penalty into something the player plays
against. It would also give the middle game a decision that is not a reserve
switch (F1), and give Corps a way to buy its way past the wall (F9).

This is a proposal, not a decision. It needs sourcing for the delay and the
effectiveness cost, and both are likely to be assumptions.

---

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
