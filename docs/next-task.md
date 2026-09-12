# Next tasks: two briefs, in this order

**Written:** 12 September 2026, at the end of the session that did F13, F14, F15
and F17.
**What this is:** two prompts to paste into fresh chat sessions. They are here
rather than in a chat log because the measurements in them took a while to make
and are annoying to re-derive, and because in both cases the obvious approach is
the wrong one.

**Do brief 1 first.** It is smaller, it carries no balance risk, and it is worth
more: it is the screen every player reads last and the one the share card
carries. Brief 2 is the older and harder job.

**Each brief is self-contained.** Delete a brief when its work is done, and the
file when both are.

**Before either: the state of things.** Of the review's 17 findings, 12 are
addressed or by design. The model is in good shape; what is left is refinement.
The single most valuable thing nobody can do in a chat session is **play it** —
four mechanical changes have landed and no one has played it fresh, and the
review's own method section is emphatic that hand-play found F1 and F7 where no
test would have. That needs someone who does not already know where the levers
are.

---

## Brief 1 — the verdict screen: four verdicts that can never fire

```
Work on the Mobilisation Minister repo at /Users/paul/Claude/Mobilisation.

TASK: four of the twelve entries in src/data/verdicts.json can never be
selected. The verdict is the payoff — the last thing a player reads, and what
the share card carries — and three verdicts currently cover 69% of endings.

START BY READING, in this order:
  - docs/design-review.md — "How to read this", then F3 (which moved this once
    before: "Several verdicts in verdicts.json were unreachable and now fire"),
    F9 and F10 for what the endings are meant to teach.
  - docs/sim-spec.md section 11 (scoring, bands, verdict selection).
  - src/sim/score.ts and src/data/verdicts.json.

WHAT IS ALREADY MEASURED — do not re-derive. Every ending of 3 difficulties x 7
scripted strategies x 40 seeds, 840 in all.

  Verdict                 fires   share
  missed_high_intact        263   31.3%
  met_high_intact           173   20.6%
  missed_any_broken         143   17.0%
  resigned_generic          124   14.8%
  missed_any_any            101   12.0%
  resigned_broken            31    3.7%
  met_mid_any                 5    0.6%
  met_any_broken              0    NEVER
  met_high_strained           0    NEVER
  met_low_any                 0    NEVER
  missed_low_any              0    NEVER
  fallback                    0    (correct — it is the safety net)

  The combinations that actually occur:
    263  missed / high / intact / served
    173  met    / high / intact / served
    113  missed / high / intact / resigned
     93  missed / mid  / strained / served
     91  missed / low  / broken / served
     52  missed / mid  / broken / served
     31  missed / low  / broken / resigned
     11  missed / mid  / strained / resigned
      8  missed / mid  / intact / served
      3  met    / mid  / intact / served
      2  met    / mid  / strained / served

THE BANDS ARE NOT THE PROBLEM, AND THIS IS THE POINT. Quality across the 840
endings runs 0.243 to 1.000 (median 0.697) and leadership 0.264 to 1.000; 122
endings are in the "low" quality band and 280 are not "intact". Both bands are
well populated. This is NOT the F13 shape where a threshold sat outside the
range the game produces. There are two different causes and they need different
answers:

  1. ORDERING SHADOW. `missed_low_any` is unreachable because
     `missed_any_broken` sits earlier in the list and selection is first-match
     (spec 11). Every low-quality ending in the data is also broken-leadership,
     so the earlier entry always wins. The copy exists and can never be chosen.
     Either reorder, or decide the two are the same case and retire one.

  2. GENUINELY IMPOSSIBLE STATES. `met_any_broken`, `met_high_strained` and
     `met_low_any` describe meeting the target with a cadre that is not intact.
     That combination does not occur and probably cannot: the leadership factor
     multiplies everything raised, so meeting the target essentially requires
     intact leadership. These three are writing for states the model cannot
     produce.

DECISIONS THAT ARE PAUL'S, NOT YOURS — put them to him before building.
  1. Retire the three impossible verdicts, or make those states reachable? The
     second is a simulation change and a much bigger question — it would mean
     the target can be met with a broken cadre, which contradicts what F3
     established. Retiring them is almost certainly right; say so and let him
     confirm.
  2. For the ordering shadow: reorder so `missed_low_any` can fire, or accept
     that low quality and broken leadership are the same story and keep one?
     Look at the two texts before advising — if they say the same thing in
     different words, one of them should go.
  3. Whether the 69%-in-three-verdicts concentration is worth splitting. The
     most common ending by far is "missed / high / intact / served" at 31%:
     you did everything right and still could not do it, which IS the game's
     thesis. It may deserve more than one way of being said, given how many
     players will see it.

VERIFY BEFORE RETIRING ANYTHING. The scripted strategies are a floor, not a
ceiling — they never re-plan. Before concluding met+broken is impossible, check
the arithmetic rather than the bots: meeting 22,000 effective at a quality below
0.45 needs roughly 49,000 bodies, against a maximum of about 32,000 seen in any
run. Show the working in the finding.

CONSTRAINTS THAT MUST HOLD.
  - This should need NO simulation change. If you find yourself editing
    src/sim/*.ts other than score.ts, stop and re-read the task — the benchmark
    tables in docs/design-review.md should come back byte-identical, and if
    they do not, something has gone wrong.
  - Check `verdictOneLiner` as well as `text`. The one-liner is what goes on
    the share card, which is how this reaches a second player.
  - Verdict text is filled from VerdictVars with {placeholders}. Any verdict you
    rewrite must still resolve every placeholder it uses — there is a test in
    tests/content.test.ts; make sure it still covers whatever you change.

HOUSE RULES, which are not optional here:
  - Record the reasoning in DECISIONS.md (newest last). Items needing Paul's
    confirmation are marked ASK.
  - Add the finding to docs/design-review.md with the reachability table above
    as its evidence, and number it F18.
  - Run "npm test", "npm run validate" and "npm run assumptions".
  - The prose and the register are the project's other credibility, alongside
    the sourcing: the Permanent Secretary's notes, the event text and the
    general's verdicts are good and the dry civil-service tone is consistent.
    Hold any new copy to that standard and read the neighbouring verdicts first.

Finish with: which verdicts were retired or rewritten and why, the reachability
table re-run to prove it, confirmation the benchmark is unchanged, and anything
worth a new finding.
```

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
  - reserves_plus_light at Division meets the target on 43% of seeds. Below
    ~25% F2 reopens; above ~65% it is a walkover. This is the floor, and the
    ceiling is known: a player who uses accelerate_promotion at every
    opportunity reaches 55%, which was put to Paul and stands (F17).
  - Median leadership factor for capacity_heavy and max_effort: 0.68 and 0.49
    at Division, 0.46 and 0.32 at Corps. If either returns to 1.00, F3's
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
  lives in the training-pipeline group, which is shut on Day 0 and costs 45px.
  F7 has not regressed.
- **Playtesting the 55% ceiling (F17).** Real, and Paul's rather than a fresh
  session's: it needs a human who does not already know where the lever is.
