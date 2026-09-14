# Next task: one brief

**Written:** 12 September 2026, at the end of the session that did F13, F14, F15
and F17.
**What this is:** a prompt to paste into a fresh chat session, kept here rather
than in a chat log because the measurements in it took a while to make and the
obvious approach is the wrong one. Brief 1 (the verdict screen) was done as F18
and has been removed.

**Delete the brief when its work is done.**

**The state of things.** Of the review's 19 findings, 14 are addressed or by
design. The model is in good shape; what is left is refinement. F19 was found by
playing a fresh Division run at 375px on 12 September, and the benchmark table
was re-baselined that day (see the Benchmarks section of the design review for
why). One **ASK** is open in `DECISIONS.md`: whether the Division floor and
ceiling of 53% and 63% stand.

---

## Brief 2 — F4's residue: the three Bill clauses that still do nothing

```
Work on the Mobilisation Minister repo at /Users/paul/Claude/Mobilisation.

TASK: the residue of finding F4 in docs/design-review.md — the three Bill
clauses that still resolve into a pool that never binds: inclusion of women,
medical standard, exemptions regime.

START BY READING, in this order:
  - docs/design-review.md — "How to read this", "How to reproduce the review",
    the Benchmarks section, then F4 in full. F3 is the lesson the fix depends
    on; F14 is the worked example of the fix; F13 and F15 are what not to do.
  - The last five entries of DECISIONS.md (newest last).
  - docs/sim-spec.md sections 3.1, 4, 5, 9a and 10a.

WHAT IS ALREADY MEASURED — do not re-derive, but sanity-check anything you act
on.

  - THE POOL IS NEVER WITHIN TWO ORDERS OF MAGNITUDE OF BINDING. Most conscripts
    any strategy ever calls, against the eligible pool it was called from:
      Division reserves_plus_light   11,114 of 3.75m   0.30%
      Division max_effort            32,077 of 3.75m   0.86%
      Corps    max_effort            86,528 of 3.38m   2.56%
      Corps    conscription_over_capacity 222,000 of 3.38m  6.58%
    The training estate and the vetting ceiling bind first, every time. No
    resizing of the pool can ever matter. This is F3's lesson — the constraints
    are in series — and it is why the three clauses are dead.

  - What each clause does to the pool today, millions, at the default band and
    a relaxed medical standard:
      exemptions   strict 5.74   broad 4.39   minimal 6.41
      medical      peacetime 2.93   relaxed 4.39   wartime 5.48
      women        excluding them roughly halves whatever the figure is
    All of these are changes to a number that is 100x too big to matter.

  - THE ONE CLAUSE THAT WORKS, AND HOW. The age band was fixed by giving it a
    consequence upstream of the training pipeline instead of downstream of
    nothing: band -> willingness -> strong opposition -> refusal rate -> who
    actually reports (spec 10a), and since F15 the refusals themselves are
    charged as a court caseload (spec 9a). It also carries a political-capital
    clause cost and an age-keyed training attrition add. Attrition is the other
    place a clause cost can land, because it acts on the people actually on the
    course rather than on the pool.

  - Parameters as they stand:
      exemption_strict 0.15, exemption_broad 0.35, exemption_minimal 0.05  (all assumption)
      medical_pass_peacetime 0.40, _relaxed 0.60, _wartime 0.75            (all assumption)
      women_included_support_pct 72                                        (derived — a real poll)
      pc_cost_exclude_women -5, pc_cost_exemptions_minimal -8,
      pc_cost_medical_relaxed -2, pc_cost_medical_wartime -6               (all assumption)
    The medical standard is the one that is already half-alive: it feeds
    attrition_relaxed_medical_add / attrition_wartime_medical_add as well as
    the pool, so it has a live effect today. Check whether that effect is big
    enough to be felt before spending effort on it.

DECISIONS THAT ARE PAUL'S, NOT YOURS — put them to him before building.
  1. Whether it is acceptable for a second and third clause to route through
     willingness. It is the proven method and it would give each clause its own
     span — but three clauses all pulling the same lever risks making
     willingness the answer to everything, which is its own kind of thin. The
     alternative for exemptions is more interesting and less certain: a regime
     decides WHO you get, not just how many, so a minimal regime that conscripts
     doctors and engineers could cost something real. That needs sourcing and
     might not find any.
  2. Whether excluding women should cost willingness rather than only a one-off
     5 political capital. There is a sourced number for this already
     (women_included_support_pct = 72), which is more than the other two have.
  3. Whether any of this is worth it at all, against the alternative on the
     table: F6's residue, the fifteen event choices that are still a flat
     capital delta against a small thing. That is content work in events.json
     with no balance risk, and the deck is at its 33-event cap so they are
     rewrites rather than additions.

CONSTRAINTS THAT MUST HOLD. Re-run "npm run dist -- 40" after any number moves.
  - reserves_plus_light at Division meets the target on 53% of seeds. Below
    ~25% F2 reopens; above ~65% it is a walkover. This is the floor, and the
    ceiling is known: a player who uses accelerate_promotion at every
    opportunity reaches 63% (F17, re-baselined under F19; an ASK on whether
    that pair stands is open in DECISIONS.md).
  - Median leadership factor for capacity_heavy and max_effort: 0.66 and 0.48
    at Division, 0.52 and 0.34 at Corps. If either returns to 1.00, F3's
    mechanic has stopped firing.
  - do_nothing must not improve, and must still resign on 100% of Corps seeds.

HOUSE RULES, which are not optional here:
  - Every parameter carries source, url, asOf and confidence; assumptions need a
    range and a rationale; the build fails otherwise. Run "npm run validate" and
    "npm run assumptions".
  - CHECK docs/ FOR A CSV BEFORE CONCLUDING A FIGURE NEEDS SOURCING. There are
    two — ew_population_single_year_mid2025.csv and sps_1jul2026_key_figures.csv
    — and the last session missed the first one and recorded a wrong reason for
    a decision because of it.
  - Any change that moves the benchmark updates the tables in
    docs/design-review.md IN THE SAME COMMIT, including the "at commit" hash
    line and the three watch numbers.
  - Record the reasoning in DECISIONS.md (newest last), and update the status
    line on F4. Items needing Paul's confirmation are marked ASK.
  - npm run sim is enough to see whether a mechanic fires; it is NOT enough to
    balance against. Use npm run dist for anything that changes a number.
  - If you hand-play in the browser, localStorage.clear() first.
  - The scripted strategies always take event choice 0 and never re-plan, so the
    benchmark is blind to anything living in choice 1. Cover those with direct
    tests. Treat all bot numbers as a floor.

THREE TRAPS THIS REPO HAS ALREADY SPRUNG. All three cost a session's work.
  - A BYTE-IDENTICAL BENCHMARK IS A CLAIM TO CHECK, NOT A RESULT. An action can
    be asked for and silently dropped (F17). There are tests for the two lists
    that used to allow it; if you add an action, make sure both still pass.
  - A CHARGE THAT ROUNDS EACH MONTH IS NOT SENSITIVE TO A SMALL LEVER. F15's
    first attempt made an address to the nation worth exactly zero. If a number
    exists to make a lever matter, prove the lever moves it.
  - POLITICAL CAPITAL IS ABUNDANT AT DIVISION AND SCARCE AT CORPS. Pricing
    anything in capital charges the rung that does not need it and misses the
    one that does (F17). Bound a lever with time or a rule, not a price.

Finish with: what moved, what it cost at each difficulty, which watch numbers
shifted and whether that was deliberate, and anything worth a new finding.
```

---

## Not these, and why

- **F16 — the bots' idle handling.** Ungating one test would take
  `reserves_only` at Corps from 38% resignations to 15% and reset every number
  in the benchmark table. It is a change to the instrument, not the game, and it
  buys the player nothing. Worth doing eventually, on its own, with the whole
  table re-baselined in the same commit.
- **F6's residue — fifteen flat event choices.** Real and low-risk: fifteen of
  the deck's 58 choices are still a political-capital delta against a small
  thing. It is diffuse content work with no single measurable outcome, and the
  deck is at its 33-event cap so they are rewrites rather than additions. A good
  third brief.
- **Event choice-1 test coverage.** 14 of the 28 multi-choice events have no
  direct test, so their second arm ships unexercised by the benchmark (which
  always takes choice 0). The five riskiest were checked by hand on 12 September
  — the three that move `leaders_spareable_add`, which F17 changed, and the two
  that move `willingness`, which F15 made consequential — and **all five work
  correctly**. So this is a test gap, not a live bug. Worth closing; not urgent.
- **A phone-layout pass.** Already checked on 12 September: Day 0 at 375x812 is
  **3.47 screens and 414 words**, against the 4.5 screens and 643 words recorded
  when F7 was closed. `accelerate_promotion` is the sixteenth action but it
  lived in the training-pipeline group, which was shut on Day 0 and cost 45px.
  F7 had not regressed. (Since 14 September that group opens on Day 0, so these
  figures are now an underestimate; re-measure before quoting them.)
- **Playtesting the 55% ceiling (F17).** Real, and Paul's rather than a fresh
  session's: it needs a human who does not already know where the lever is.

## Latent bugs from the 12 September audit, not taken

A read of `src/sim/` against `docs/sim-spec.md` confirmed four defects a player
cannot reach today and some documentation drift. Recorded so they are not
re-found. None moves the benchmark.

- **`?auto=` accepts prototype keys.** `auto in STRATEGIES` is true for
  `__proto__` and `toString`; the first crashes boot, the second silently plays
  `do_nothing`. `Object.hasOwn` in `main.ts`.
- **A share link overwrites an in-progress run without asking.** `main.ts`
  boot: a saved run with a different seed or difficulty is replaced by the URL's
  game and saved over. `restart()` asks; this path does not. Also `?seed=42`
  with no `difficulty` neither resumes nor starts.
- **`?seed=churchill` is documented and ignored.** `rng.ts` hashes string seeds
  and the tests use them, but `main.ts` does `Number(seed)`, so a word becomes a
  random seed.
- **`callup_cap`: an indefinite ceiling acquires an expiry** from a later
  temporary one (`events.ts`, the merge rule); latent because every content use
  carries a duration.
- **`flag` effects are write-only.** `opposition_motion`'s
  `review_conceded` is set and read by nothing. Either a hook or dead.
- **Spec drift.** `politics.ts` comment quotes the old allowance figures; spec
  §7c quotes a spareable cadre of 10,700 (it is 8,869); §11 undersells
  `scoring_pc_if_missed`, which can resign a minister at the score; §8's
  `removed` formula names the wrong total. The version-2 compatibility guards
  are all dead since `version: 3` and could go.

