# Next task: F13 and F14, as one change

**Written:** 11 September 2026, at the end of the session that produced F11–F14.
**What this is:** a prompt to paste into a fresh chat. It is here rather than in
a chat log because the facts in it took a while to measure and are annoying to
re-derive, and because the ordering constraint in it is the kind of thing a new
session would get wrong.

**Why it exists.** F13 (neither money penalty ever fires) and F14 (every age
band starts at 18) look like two findings and are one change: F14's fix needs
F13's fix as its counterweight, or it ships a free lever. Everything below is
in `design-review.md` and `DECISIONS.md` as well; this is the short form.

**Delete this file once the work is done** — the findings are the durable
record, not the prompt.

---

```
Work on the Mobilisation Minister repo at /Users/paul/Claude/Mobilisation.

TASK: findings F13 and F14 in docs/design-review.md, as one change. F13 is that
neither money penalty ever fires; F14 is that every conscription age band starts
at 18 so the Bill's age-band clause has almost no range. They are one change
because F14's fix needs F13's fix as its counterweight — see below.

START BY READING, in this order:
  - docs/design-review.md — the standing review. Read "How to read this", "How to
    reproduce the review", the Benchmarks section, then F13 and F14 in full. F2,
    F3, F4, F6 and F8 are the context for what must not break.
  - The last four entries of DECISIONS.md (newest last).
  - docs/sim-spec.md sections 8, 8a, 9 and 10a.

WHAT IS ALREADY MEASURED — do not spend time re-deriving, but do sanity-check
anything you are about to act on:

  - Final cumulative COST across 40 seeds: Division max 3.7bn (max_effort),
    Corps 4.6-11.1bn. cost_pc_penalty_threshold is 5bn, range [2.5bn, 10bn].
    At the range floor of 2.5bn the cost penalty WOULD bite at Division.
  - Final cumulative GDP LOSS: Division max 1.34bn, Corps max 4.35bn. One
    penalty step is gdp_pc_penalty_step_pct = 0.25% of GDP = 7.6bn of lost
    output. Range is [0.1, 0.5]; even at the floor a step is 3.0bn, so the GDP
    penalty STILL cannot fire at Division inside its stated range. Fixing that
    means re-justifying the range, not retuning inside it. That is a decision
    for Paul, not an assumption to make.
  - Population-weighted YouGov support by band: 18-25 28.6%, 18-30 32.8%
    (the default), 18-40 35.7%, 25-40 39.0%, 25-50 39.5%, 18-65 42.2%. The
    achievable span across militarily plausible bands is 15.2 points.
  - gdp_age_multiplier_* are now DERIVED from ASHE 6.1a and ONS A05:
    18-25 0.407, 18-30 0.547, 18-40 0.717, 18-65 0.762. A 25-40 band works out
    at 0.852 — the highest, because it takes people at peak earnings. That is
    the intended price of the popular band.

THE ORDER MATTERS. A 25-40 band is more willing AND has a bigger pool than
18-30. Its only cost is peak earnings. While the GDP penalty is dormant, peak
earnings cost the player nothing, so shipping the band first would put a
strictly better option in the Bill — a free lever. Most of the recent work on
this repo has been removing free levers; do not add one.

DECISIONS THAT ARE PAUL'S, NOT YOURS — put them to him before building:
  1. How hard to make the money penalties bite, and whether gdp_pc_penalty_step_pct
     may go below its stated range floor of 0.1 (with a re-justified range and
     rationale) or whether GDP stays a scoring-screen quantity only.
  2. Which four age bands the Bill should offer. A candidate set is
     18-25 / 18-30 / 25-40 / 18-65, which keeps two, drops 18-40 and adds the
     popular-but-expensive option.
  3. Whether to model the things a 25-40 band would really carry and currently
     does not: medical_pass_* is keyed to standard not age, and exemption_* to
     regime not age, so an older band gets the same pass rate and exemption
     share as an 18-25 one. That is generous to it. Either source it or state
     the simplification in the parameter notes — do not leave it silent.

CONSTRAINTS THAT MUST HOLD. Re-run "npm run dist -- 40" after any number moves
and check all three:
  - reserves_plus_light at Division meets the target on 43% of seeds now. Below
    ~25% F2 reopens (the difficulty becomes a coin flip); above ~65% it is a
    walkover. Expect this to FALL — say by how much and decide deliberately.
  - Median leadership factor for capacity_heavy and max_effort: 0.67 and 0.47 at
    Division. If either returns to 1.00, F3's mechanic has stopped firing.
  - do_nothing must not improve, and must still resign on 100% of Corps seeds.

HOUSE RULES, which are not optional here:
  - Every parameter carries source, url, asOf and confidence; assumptions need a
    range and a rationale; the build fails otherwise. Run "npm run validate" and
    "npm run assumptions".
  - Any change that moves the benchmark updates the tables in
    docs/design-review.md IN THE SAME COMMIT, including the "at commit" hash
    line and the three watch numbers.
  - Record the reasoning in DECISIONS.md (newest last), and update the status
    lines on F13 and F14. Items needing Paul's confirmation are marked ASK.
  - npm run sim is enough to see whether a mechanic fires; it is NOT enough to
    balance against. Use npm run dist for anything that changes a number.
  - If you hand-play in the browser, localStorage.clear() first — a saved run
    resumes silently and you will measure a state you did not play.
  - The scripted strategies always take event choice 0 and never re-plan, so the
    benchmark is blind to anything living in choice 1. Cover those with direct
    tests. Treat all bot numbers as a floor.

Finish with: what moved, what it cost at each difficulty, which watch numbers
shifted and whether that was deliberate, and anything you found that is worth a
new finding.
```
