# Mobilisation Minister

A single-page, turn-based crisis game. You are the UK Secretary of State for
Defence. A NATO ally has been attacked; the Prime Minister wants a deployable
division in twelve months. You have the levers UK law actually gives you and
the capacity the UK training system actually has.

The game is the mechanics of mobilisation. Every number on screen is drawn
from `src/data/parameters.json`, where each entry carries a value, a source, a
URL, an as-of date and a confidence tag (primary, derived, assumption). Tap any
number in the game to see where it came from.

The point it makes: the constraint on mobilisation is not people or money. It
is the training pipeline and the junior leadership cadre.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # vitest: deterministic scenarios, invariants, content checks
npm run sim -- --all # balance matrix: every scripted strategy × every difficulty, one seed
npm run dist -- 40   # the same over 40 seeds: percentiles, met and resignation rates
npm run build        # validates parameters, regenerates ASSUMPTIONS.md, typechecks, builds to dist/
```

Replay any run from its share link: `?seed=42&difficulty=division`. Add
`&auto=capacity_heavy` (or any strategy id from `src/sim/strategies.ts`) to have a
scripted strategy play the run to the scoring screen.

## Layout

```
index.html / methodology.html   two static pages, one bundle
src/
  main.ts                       screens and routing
  methodology.ts                the methodology page
  types.ts                      the contract between sim, content and UI
  sim/                          pure simulation: step, actions, effectiveness, money, politics, events, score
  data/parameters.json          every number, with source metadata
  data/events.json              events with triggers, choices and effects
  data/verdicts.json            the general's verdicts
  ui/                           screens, components, briefing templates, share card
scripts/
  validate-parameters.mjs       fails the build if any parameter lacks source metadata
  build-assumptions.mjs         regenerates ASSUMPTIONS.md from parameters.json
  sim.ts                        CLI balance runner
tests/                          step, invariants (1,000 fuzz runs), content
docs/sim-spec.md                the model, section by section
docs/design-review.md           standing findings on playability, with benchmarks
docs/                           source verification, transcribed source CSVs
ASSUMPTIONS.md                  generated; every assumption with range and rationale
```

The decision log (`DECISIONS.md`) and the original design brief are kept
locally and are not in the repository, so references to them in the docs and
code comments point to files outside it.

`docs/design-review.md` is the standing record of what makes the game hard to
play, what has been fixed and what has not, and the seed-distribution
benchmarks a balance change must be checked against. Read it before changing a
mechanic or a difficulty number.

## Updating the numbers when the next SPS lands

The MoD publishes *UK armed forces quarterly service personnel statistics*
each quarter. The 1 October 2026 edition is due in December 2026. To update:

1. Download the accessible Excel tables from gov.uk.
2. In `src/data/parameters.json`, update `value`, `asOf` and the date in
   `source` for each entry below. Do not change `confidence`.

   | Parameter | SPS table | Row |
   |---|---|---|
   | `regular_trained_start` | 3a | Army (FTTTS), latest column |
   | `regular_untrained_start` | 3e | Army Full-Time Untrained Personnel |
   | `regular_gains_annual` | 5b | Army GTTS, 12 months ending |
   | `regular_untrained_intake_annual` | 5a | Intake to Army Untrained |
   | `regular_voluntary_outflow_annual` | 4 or 5d | Army Trade Trained Voluntary Outflow |
   | `training_attrition` | 5c ÷ 5a | Outflow from Army Untrained ÷ Intake to Army Untrained (update `derivation`) |
   | `reserve_volunteer_trained` | 6a | Army Reserve Future Reserves 2020 |
   | `ex_regular_tracked` | 8a | Reserve Land Forces, Regular Reserve (Army; use the latest non-estimated column) |
   | `ex_regular_tracked_tri_service` | 8a | Tri-Service UK Reserve Forces, Ex-Regular Reserve |
   | `junior_leaders` | 11a | Army OR-4 + OR-6 + OR-7 + OF-1 + OF-2 (1 April figures; update `derivation`) |
   | `strategic_reserve_untracked_tri_service` | derived | `strategic_reserve_claimed − ex_regular_tracked_tri_service` |
   | `strategic_reserve_untracked` | derived | the above × `ex_regular_tracked ÷ ex_regular_tracked_tri_service` |
   | `junior_leader_ratio` | derived | `regular_trained_start ÷ junior_leaders`; recompute when either moves |
   | `leaders_per_capacity_purchase` | derived | `capacity_purchase_annual ÷ instructor_ratio`; unchanged unless the instructor ratio changes |

3. Update the SPS `url` on those entries to the new release page.
4. Regenerate `docs/sps_<date>_key_figures.csv` (the transcription script is
   in `docs/`; or copy the pattern of the existing file).
5. Run `npm run validate`, `npm test`, and `npm run sim -- --all`. If the
   balance criteria in the brief no longer hold, adjust only assumption-tagged
   parameters within their ranges, or change the difficulty table. Never
   adjust a primary figure to make the game work.
6. Bump `version` in `parameters.json` and give the reasoning in the commit
   message.

ONS mid-year population estimates follow the same pattern (`ew_pop_*`
entries, dataset MYE2, England and Wales row) and `uk_population_scaling`
(UK ÷ England and Wales).

## Deploying

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every
push to `main`. It sets `BASE_PATH` to `/<repo-name>/` so a project site
works, and `SITE_URL` to the absolute Pages address, which the build writes
into the `og:url` and `og:image` tags that give a pasted link its preview
card; for a custom domain, remove the first and change the second. Enable
Pages with source "GitHub Actions" in the repository settings before the
first push. The preview image is `public/og-image.png` and the favicon
`public/favicon.svg`. The preview image is drawn by the same code as the
share card: after changing either, run the dev server, open `/?card=og`, and
press *Save og-image.png*; the dev server writes the file. The same page saves
*social-preview.png* to `docs/`, at the 1280×640 with a 40px safe border that
GitHub's repository card wants; upload it by hand under Settings, General,
Social preview, since there is no API for it. LinkedIn caches
a link's card for about a week, so after deploying a new image put the URL
through its Post Inspector to refresh it.

## Sourcing rules

- Every parameter has `source`, `url`, `asOf`, `confidence`. The build fails otherwise.
- Assumptions have a `range` and a one-line `rationale`, both shown in the UI.
- Events that quote a number carry a `source` and the `paramIds` it uses.
- Never invent a source. If a figure cannot be sourced, it becomes a labelled assumption.

## Licence

Content and code © 2026 Paul Warner. Source data © Crown copyright, Open
Government Licence v3.0. Polling figures © YouGov, reproduced under fair
dealing for the purpose of comment.
