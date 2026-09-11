# Mobilisation Minister — Design Brief for Claude Code

**Version:** 1.0 — 11 September 2026
**Author:** Paul (Head of Engineering, Certes) with Claude
**Companion files (read these first):** `conscription-calculator-parameters.md` (v0.7, sourced parameter table), `sps_1jul2026_key_figures.csv`, `ew_population_single_year_mid2025.csv`

---

## 1. What we are building

A single-page, turn-based crisis game in which the player is the UK Secretary of State for Defence and must field a deployable force within a deadline using only the real levers available under UK law and the real capacity of the UK training system.

The game is a **calculator wearing a costume**. Every number the player sees is drawn from a sourced dataset. The fun comes from the trade-offs; the credibility comes from the sourcing. If a choice must be made between "more fun" and "traceable to a primary source", sourcing wins.

**Audience:** LinkedIn, many of them senior defence professionals. They will check the numbers. They will also share it if it makes a point they already suspect but have never seen quantified.

**The point the game makes:** the UK's constraint on mobilisation is not people or money; it is the training pipeline and the leadership cadre. Headcount is easy. Trained, led, equipped soldiers are slow.

**Not a goal:** realism in the military-simulation sense. No combat, no maps, no units on a board. This is a resource-and-consequence game about the *process* of raising a force.

---

## 2. Non-negotiable constraints

1. **Every number is sourced.** Every parameter lives in `src/data/parameters.json` with `value`, `source`, `url`, `asOf`, and `confidence` (`primary`, `derived`, `assumption`). The UI must be able to show the source for any number on screen via a consistent affordance (see §8).
2. **Assumptions are labelled as assumptions in the UI**, not just in code. If the player sees an effectiveness multiplier of 0.35, they must be able to see that it is a modelling assumption and read the one-line rationale.
3. **No fabricated data.** If a mechanic needs a number we do not have, use a clearly labelled assumption with a plausible range, and add it to `ASSUMPTIONS.md`. Never invent a source.
4. **No backend.** Static site, deployable to GitHub Pages. No accounts, no server state. Share cards are generated client-side.
5. **Single HTML entry point.** Vite + TypeScript + vanilla DOM (or Preact if component structure helps — your call, but keep the bundle small). No heavy frameworks. Must load fast on mobile over LinkedIn's in-app browser.
6. **Deterministic given a seed.** Random events use a seeded PRNG so that a run can be replayed from a URL parameter (`?seed=…`). This matters for shareability and for debugging.
7. **Accessible.** Keyboard navigable, sensible focus order, WCAG AA contrast, no information conveyed by colour alone. Gauges have text values.
8. **Tone.** Dry, civil-service, faintly gallows. Think a Permanent Secretary's private briefing note, not a wargame. No jingoism, no gore, no real named politicians or serving officers.

---

## 3. Game structure

### 3.1 The premise (opening screen)

> *Day 0. A NATO ally has been attacked. Article 5 has been invoked. The Chief of the Defence Staff has told the Prime Minister that the UK's contribution must be a deployable division — 25,000 trade-trained personnel with their enablers — ready to move in 12 months. The regular Army's trade-trained strength this morning is 70,951. You are the Secretary of State for Defence. The Prime Minister has asked you to make it happen.*

Player picks a **difficulty** which sets the deadline and target:

| Difficulty | Target (trade-trained, effectiveness-weighted) | Deadline |
|---|---|---|
| Brigade | 8,000 effective-soldier equivalents | 12 months |
| Division | 25,000 | 12 months |
| Corps | 60,000 | 18 months |

"Effective-soldier equivalents" (ESE) is defined in §5.4. The player is told up front that raw headcount is not the score.

### 3.2 The loop

- One turn = one calendar month. The game runs for the deadline length plus a final scoring turn.
- Each turn:
  1. **Briefing** — a short note from the Permanent Secretary summarising the state of the three gauges and anything that changed last month. Two to four sentences. Generated from templates, not free text.
  2. **Event** (some turns) — a scripted or random event with a binary or ternary choice (see §6).
  3. **Decisions** — the player may take up to **two actions** from the action menu (§4). Some actions are one-shot, some are toggles, some are continuous.
  4. **End turn** — the simulation advances (§5). Gauges update with a short animation. Any consequences of last turn's decisions are narrated in the next briefing.
- At the deadline: **Scoring screen** (§7) and share card.

### 3.3 The three gauges

Always visible, top of screen:

| Gauge | What it measures | Range |
|---|---|---|
| **Force Ready** | ESE delivered so far vs target | 0 → target (progress bar with number) |
| **Force Quality** | Weighted average effectiveness of everything counted in Force Ready | 0.0 → 1.0 |
| **Political Capital** | Abstract measure of the government's ability to keep doing this | 0 → 100; game over below 0 |

Plus a **ledger** (collapsible): cumulative Treasury cost, cumulative GDP output loss, months elapsed, headcount by category (regular, mobilised reservist, ex-regular recalled, conscript in training, conscript trained).

---

## 4. Actions (the levers)

Each action has: a prerequisite (usually legal), a cost in Political Capital, an effect on the pipeline, and a delay before it starts producing. All effects are in `parameters.json`. The list below is the design intent; tune numbers against the parameter table.

### 4.1 Reserve actions (available from turn 1 — no new legislation)

| Action | Prereq | Effect | PC cost | Delay | Source basis |
|---|---|---|---|---|---|
| **Call out the Army Reserve** (RFA 1996 s.52) | none | Up to 23,517 trained volunteer reservists become available; reach the front at effectiveness 0.7–0.9 after a refresher | −10 | 6 months at default notice; slider option to legislate 90-day notice (−5 PC more) | SPS Table 6a; Hansard AF Bill Cttee |
| **Recall the Ex-Regular Reserve** (s.52/s.54) | none | 34,755 tracked; each turn a fraction is located and reports (see event "Where are they?"). Effectiveness 0.5–0.7 | −8 | 2–4 months | SPS Table 8a |
| **Attempt to trace the Strategic Reserve** (the remaining ~60,000 of the claimed 95,000) | none | Spend 1 turn and −3 PC; yields a random 20–50% of the untracked pool at effectiveness 0.4–0.6 | −3 | 3 months | Forces News Jan 2026; MoD statement that records are incomplete |
| **Stop-loss** (extend engagements, suspend voluntary outflow) | none | Removes the ~3,311/yr Army trained voluntary outflow from the model | −12 | immediate | SPS Table 4 |

### 4.2 Conscription actions (require legislation)

| Action | Prereq | Effect | PC cost | Delay | Source basis |
|---|---|---|---|---|---|
| **Introduce a National Service Bill** | none | Starts a legislative clock: 3 months (emergency procedure, −15 PC) or 6 months (normal, −8 PC). Nothing else in this section is available until it passes | −8/−15 | 3–6 months | Assumption; AF Bill timetable as comparator |
| **Set the age band** | Bill passed | 18–25 / 18–30 / 18–40 / 18–65. Pool sizes from ONS E&W single-year data × 1.12 UK scaling | 0 | — | ONS MYEB2 |
| **Include women** | Bill passed | Toggles the female half of the cohort. Default: on (72% public support). Turning it off halves the pool and costs −5 PC | 0 / −5 | — | ONS; YouGov Jan 2024 |
| **Medical standard** | Bill passed | Peacetime (35–45% pass) / Relaxed (55–65%) / Wartime (70–80%). Lower standards raise the training-attrition rate and lower starting effectiveness | 0 / −3 / −8 | — | MoD FOI (6.8 medical rejections per intake); YouGov Jul 2026 (52% self-declared ineligible) |
| **Exemptions regime** | Bill passed | Strict (reserved occupations only, ~15% of pool) / Broad (students, carers, key workers, ~35%) / Minimal (~5%, −10 PC) | 0 / 0 / −10 | — | 1939 Schedule of Reserved Occupations as comparator (assumption) |
| **Selective call-up size** | Bill passed | How many to call per month. Capped by training capacity — see §5.2. Calling more than you can train produces "holding pool" headcount that costs money and PC but produces no ESE | 0 | — | — |

### 4.3 Pipeline actions (the ones that actually matter)

| Action | Prereq | Effect | PC cost | Delay | Source basis |
|---|---|---|---|---|---|
| **Expand training capacity** | none | Each purchase adds +5,000/yr trained output. Each one pulls **625 junior leaders** (at 1:8) out of the field force, reducing Force Quality of the regular component and shrinking the deployable regular pool. Costs £ (see §5.5) | −4 each | 2 months to stand up | SPS Table 5b (5,933/yr baseline); SPS Table 11a (29,600 junior leaders) |
| **Compress the syllabus** | none | Phase 1 14→10 weeks, Phase 2 average 20→12 weeks. Throughput ×1.5; graduate effectiveness −0.15; attrition +5pp | −6 | immediate | HL1629; assumption |
| **Contract civilian instructors** | none | +2,000/yr capacity without drawing on junior leaders, but only for non-combat trades; costs £ | −2 | 3 months | Assumption (Capita precedent) |
| **Reinstate Harrogate-style junior entry** | none | Flavour only in v1; no effect. Include as a deliberately useless option with a briefing note explaining why (30% attrition, two-year lead) | −1 | — | AFC Harrogate |
| **Emergency equipment buy** | none | Required for any conscript cohort to count toward Force Ready. Without it, trained conscripts sit at "trained, unequipped" and count at 0.25 ESE. Costs £3.5–5k per head; lead time 4 months | −3 | 4 months | Absolute Military Mar 2026 [VERIFY]; DIP 30 Jun 2026 |

### 4.4 Political actions

| Action | Effect | PC cost |
|---|---|---|
| **Address the nation** | +8 PC once; +4 the second time; 0 thereafter. Also nudges willingness-to-serve up 5pp for 3 turns | 0 |
| **Raise defence spending** | Unlocks bigger £ budget; −6 PC; lowers GDP-loss tolerance threshold | −6 |
| **Blame the previous government** | +3 PC first use, −5 PC every subsequent use | see effect |

---

## 5. The simulation (per turn)

Implement as a pure function `step(state, actions, rng) → state`. No DOM access. Unit-test it.

### 5.1 Pools

Track headcount in these buckets:

```
regular_trained            (starts 70,951; effectiveness 1.0)
regular_untrained          (starts 3,111; converts to trained at 5,933/yr baseline)
reserve_volunteer_trained  (starts 23,517 available; 0 mobilised)
reserve_ex_regular_tracked (34,755)
reserve_strategic_untracked(~60,000 claimed, unverified)
conscript_pool_called      (called up, not yet processed)
conscript_in_training      (with a start month, so cohorts graduate on schedule)
conscript_trained_unequipped
conscript_trained_equipped
holding_pool               (called but no training slot — costs money, produces nothing)
```

### 5.2 Throughput

```
monthly_training_capacity = (baseline_5933 + purchased_capacity + civilian_instructor_capacity) / 12
                            × syllabus_multiplier
```

Conscripts move from `conscript_pool_called` → `conscript_in_training` up to capacity. Excess goes to `holding_pool`. Each cohort in training graduates after `phase1_weeks + phase2_weeks` (default 34 weeks ≈ 8 months; compressed 22 weeks ≈ 5 months), minus attrition (default 26% — SPS 5a/5c; +5pp compressed; +10pp on wartime medical standard).

### 5.3 Outflow

Unless stop-loss is active, `regular_trained` loses 3,311/12 per month to voluntary outflow (SPS Table 4). Show this in the ledger so the player sees the bathtub draining.

### 5.4 Effectiveness and ESE

```
ESE = Σ (headcount_in_bucket × effectiveness_of_bucket × leadership_factor)
```

Bucket effectiveness (from §5b of the parameter table — all labelled `assumption` in the UI):

| Bucket | Effectiveness |
|---|---|
| Regular trained | 1.0 |
| Volunteer reservist, after refresher | 0.8 |
| Ex-regular recalled, tracked | 0.6 |
| Strategic reserve, traced | 0.5 |
| Conscript, trained + equipped, normal syllabus | 0.5 at graduation, +0.05/month of collective training, cap 0.7 |
| Conscript, trained + equipped, compressed syllabus | 0.35 at graduation, same growth, cap 0.6 |
| Conscript, trained, unequipped | 0.25 |
| Holding pool / in training | 0 |

**Leadership factor:** `min(1, available_junior_leaders / (recruits_in_training / 8))`. Available junior leaders = 29,600 − (leaders diverted to training capacity) − (leaders lost to outflow). When the ratio falls below 1:8 the factor drops below 1 and applies to *every* conscript bucket. This is the Russian-2022 mechanic and should bite hard if the player over-expands.

**Force Quality gauge** = ESE / total headcount counted.

### 5.5 Money

Per-head monthly costs (from §4 of parameter table):

- Regular: £27,282 × 1.735 / 12 (pay incl. X-Factor, plus AFPS employer 73.5%)
- Conscript in training: NLW-based ~£24,800 × 1.735 / 12, plus one-off £49k training cost amortised over the course
- Mobilised reservist: as regular, plus Reservist Award top-up (assumption: average £8k/yr) plus employer assistance £110/day
- Equipment: £4,000 one-off per conscript when equipment buy is active
- Training capacity expansion: £50m one-off per +5,000/yr (assumption; label it)

Cumulative cost shown in ledger. Cost feeds Political Capital: every £5bn cumulative → −2 PC per turn thereafter (assumption).

### 5.6 GDP loss

```
monthly_gdp_loss = (conscripts_called_total + reservists_mobilised) × £53,000 × age_multiplier / 12
```

£53k is the labour-share figure (§5 of parameter table); show the £89k gross alternative in the source popover. Age multiplier 0.6 for 18–25 band, 0.75 for 18–30, 0.9 for 18–40, 1.0 for 18–65. Feeds PC: every 0.25% of GDP cumulative → −3 PC per turn (assumption).

### 5.7 Political Capital

Starts at 60. Each turn:
- −1 baseline (the crisis grinds on)
- action costs
- cost/GDP penalties above
- event outcomes
- +2 if Force Ready progressed by ≥ 5% of target this turn (momentum)
- Willingness modifier: if conscription is active and the willingness parameter (default 20% from YouGov Jul 2026, adjustable by events/address) is below 30%, −2/turn ("refusal cases in the courts")

Below 0: game over — "The Prime Minister has accepted your resignation." Show scoring anyway.

---

## 6. Events

Stored in `src/data/events.json`. Each has `id`, `trigger` (turn range and/or state condition), `weight`, `text`, `choices[]` with effects, and `source` where the event is grounded in a real number. Seeded RNG picks at most one event per turn from those whose triggers are met. Aim for 25–30 events in v1. Examples:

| id | Trigger | Text (abridged) | Choices |
|---|---|---|---|
| `where_are_they` | ex-regular recall active, turn 2–4 | Only 34,755 of the 95,000 "Strategic Reserve" appear on any current record. The MoD's data has addresses for perhaps half of the rest. | Spend a month tracing (−3 PC, +traced pool) / Move on |
| `ninety_day_amendment` | reserve called out, notice = 180 | A backbench amendment would cut Army Reserve notice to 90 days. The Treasury opposes it. | Back it (−5 PC, reservists arrive 3 months sooner) / Let it fail |
| `instructor_revolt` | training capacity purchased ≥ 3 | Commanding officers report they have lost a third of their section commanders to the training estate. | Accept (leadership factor drops) / Return 50% (capacity −50%) |
| `medical_scandal` | medical = wartime, turn ≥ 4 | A conscript with an undiagnosed cardiac condition has died on a Phase 1 run. | Restore peacetime standard (−pool) / Hold the line (−8 PC) |
| `refusal_test_case` | conscription active, willingness < 25% | The first conscientious-objection case reaches the High Court. | Broad exemption (pool −10%, +3 PC) / Contest (−6 PC, 50% chance of losing badly) |
| `treasury_letter` | cumulative cost > £10bn | The Chancellor writes to the PM. | Cut capacity purchases (−1 capacity) / Raise spending (−6 PC) |
| `ally_asks` | turn = deadline − 3 | The ally asks whether the division will be on time. | Tell the truth (PC by actual status) / Promise (+5 PC now, −15 at scoring if missed) |
| `equipment_delay` | equipment buy active, turn ≥ 3 | The body-armour supplier reports a 2-month slip. | Accept / Source abroad (+£, −2 PC) |
| `poll_bounce` | random, weight low | A poll shows willingness to serve up 6 points after the address. | (no choice; +willingness) |
| `reservist_employers` | reserve mobilised > 10,000 | NHS trusts report ward closures from mobilised reservists. | Exempt clinical staff (−2,000 reservists) / Hold (−5 PC) |

Every event that quotes a number must carry `source`. Events that are pure fiction (the cardiac death, the Chancellor's letter) must not quote numbers as fact.

---

## 7. Scoring and share card

At the deadline (or resignation):

1. **Headline:** target met / missed, by how much, in ESE.
2. **What you actually fielded:** a stacked bar — regulars, reservists, ex-regulars, conscripts — with raw headcount and ESE side by side. The gap between the two bars is the point of the game; make it visually obvious.
3. **Cost:** Treasury £ and GDP loss, each as £bn and as % of the 2025 defence budget / % of GDP.
4. **The general's verdict:** one of ~8 template paragraphs selected by (met/missed, Force Quality band, leadership factor band). E.g. *"You delivered 27,000 bodies and 11,400 soldiers. The division exists on paper. The 2nd Battalion has one experienced sergeant per forty men."*
5. **Share card:** a 1200×630 PNG rendered client-side (canvas) with: difficulty, headcount vs ESE, months, cost, one-line verdict, seed URL. Button: "Copy image" and "Copy link".
6. **"How this works"** link to the methodology page (§8).

---

## 8. Sourcing UI and methodology page

- Every number rendered in the game passes through a `<Sourced value=… paramId=…>` helper that renders the value with a subtle dotted underline. Click/tap opens a popover: value, one-line description, source name, "as of" date, confidence badge (Primary / Derived / Assumption), link.
- `/methodology` (a second static page, same bundle): renders `parameters.json` as a table grouped by section, plus `ASSUMPTIONS.md` rendered as prose, plus the effectiveness table with its caveats (Dupuy critiques, Brown, Biddle), plus a "what this game deliberately ignores" list: equipment industrial base beyond personal kit, estate capacity, tooth-to-tail, Scotland/NI population detail, women's role restrictions, the Royal Navy and RAF entirely.
- Footer on every screen: *"All figures from MoD Service Personnel Statistics 1 Jul 2026, ONS mid-2025 estimates, and sources listed on the methodology page. Effectiveness multipliers are modelling assumptions."*

---

## 9. Repository layout

```
/
  index.html
  methodology.html
  src/
    main.ts                 entry, routing between screens
    sim/
      step.ts               pure simulation step
      pools.ts              bucket definitions
      effectiveness.ts      ESE + leadership factor
      money.ts
      politics.ts
      rng.ts                seeded PRNG (mulberry32 or similar)
    data/
      parameters.json       ALL numbers, with source metadata
      events.json
      verdicts.json
    ui/
      screens/              opening, turn, event, scoring, methodology
      components/           gauges, ledger, sourced-value, action-menu
      share-card.ts         canvas renderer
    types.ts
  tests/
    step.test.ts            deterministic scenarios
    invariants.test.ts      pools never negative, ESE ≤ headcount, etc.
  ASSUMPTIONS.md
  README.md
  docs/
    conscription-calculator-parameters.md   (copy in)
    sps_1jul2026_key_figures.csv
    ew_population_single_year_mid2025.csv
```

---

## 10. Build order

Work in this sequence and stop for review at the end of each stage.

1. **Data layer.** Transcribe `parameters.json` from the parameter table. Every entry has source metadata. Write a script that fails the build if any parameter lacks `source` or `confidence`.
2. **Simulation core.** `step.ts` and friends, with tests. Provide a CLI runner (`npm run sim -- --seed 42 --strategy reserves_only`) that plays scripted strategies and prints the ledger, so we can balance before any UI exists. Ship at least four scripted strategies: *reserves only*, *conscription max capacity*, *conscription over capacity*, *do nothing*.
3. **Balance pass.** Using the CLI, confirm: (a) "do nothing" fails Division; (b) "reserves only" nearly makes Brigade; (c) "conscription over capacity" produces a large holding pool, low quality, and a PC collapse; (d) a sensible mixed strategy can make Division in 12 months at Force Quality ≈ 0.6. Adjust *assumption-tagged* parameters only. Never adjust a primary figure to make the game work — if a primary figure makes the game unwinnable, that is the finding, and the difficulty table changes instead.
4. **UI.** Opening → turn loop → event → scoring. Mobile first (LinkedIn in-app browser). Gauges, ledger, action menu, sourced-value popovers.
5. **Share card + methodology page.**
6. **Polish.** Briefing template variety, verdict text, transitions. Lighthouse ≥ 90 on mobile.

---

## 11. Definition of done (v1)

- All three difficulties playable start to finish on a phone.
- Every on-screen number has a working source popover.
- Methodology page complete; `ASSUMPTIONS.md` lists every assumption with its range and rationale.
- Deterministic replay from `?seed=`.
- Tests pass; invariants hold under 1,000 random-action fuzz runs.
- README explains how to update `parameters.json` when the December 2026 SPS lands.
- Deployed to GitHub Pages.

---

## 12. Things to ask Paul before deciding

- Whether the RN and RAF should be represented at all in v1 (recommendation: no — say so on the methodology page).
- Whether to include a "Steadfast Defender 2027" easter-egg event (the MoD has been directed to exercise Strategic Reserve call-up during it).
- Whether the verdict text should name a fictional CDS or stay anonymous (recommendation: anonymous).
- Preferred visual direction. Default: restrained, government-document aesthetic — off-white, a single accent colour, system fonts or a single licensed sans, no stock imagery.
