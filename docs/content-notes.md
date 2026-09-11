# Content notes — events and verdicts

One line per event: id, trigger summary, source status. "Sourced" means the
text quotes a figure as fact and carries a `source` whose `paramIds` resolve to
`src/data/parameters.json`; `tests/content.test.ts` checks that every number in
the prose matches one of those parameters. "Fiction, no numbers" means the
event is invented and quotes nothing as fact.

Conventions: triggers are evaluated against the post-step state (spec §10);
`turn` is months elapsed. Choice effects are deliberately modest (PC −8..+5,
pool percentage changes ≤ 20%). Single-choice events ("Noted") are notices
that carry an effect; empty-choice events are purely informational.

## Events

| id | Trigger | Source status |
|---|---|---|
| `where_are_they` | turn 2–4; ex-regular recall active; no trace attempted | Sourced: `ex_regular_tracked`, `strategic_reserve_claimed` |
| `ninety_day_amendment` | turn 1–4; reserve called out at 180-day notice; none arrived yet | Sourced: `reserve_notice_days_default`, `reserve_notice_days_amended` |
| `instructor_revolt` | capacity purchases ≥ 3 | Fiction, no numbers |
| `medical_scandal` | turn ≥ 4; wartime medical standard; conscripts in training | Fiction, no numbers |
| `refusal_test_case` | conscription active; willingness < 25% | Fiction, no numbers |
| `treasury_letter` | cumulative cost > £10bn; at least one capacity purchase | Fiction, no numbers |
| `ally_asks` | 3 turns remaining; Force Ready ≥ 50% of target | Fiction, no numbers |
| `ally_asks_behind` | 3 turns remaining; Force Ready < 50% of target | Fiction, no numbers |
| `equipment_delay` | turn ≥ 3; equipment ordered, not yet arrived | Fiction, no numbers |
| `poll_bounce` | turn ≥ 1; at least one address to the nation (weight 2) | Fiction, no numbers |
| `reservist_employers` | reservists mobilised > 10,000 | Fiction, no numbers |
| `strategic_records` | turn 0–3; no trace attempted | Sourced: `strategic_reserve_recall_age`, `strategic_reserve_claimed`, `ex_regular_tracked` |
| `employer_assistance_cap` | turn ≥ 2; any reservists mobilised | Sourced: `employer_assistance_daily` |
| `holding_pool_scandal` | holding pool > 5,000 | Fiction, no numbers |
| `body_armour_shortage` | no equipment order; trained conscripts > 500 | Fiction, no numbers |
| `junior_leader_exhaustion` | leadership factor < 0.85; conscripts in training | Fiction, no numbers |
| `phase1_instructor_shortage` | syllabus compressed; conscripts in training | Sourced: `phase1_weeks` |
| `pac_hearing` | turn ≥ 4; cumulative cost > £5bn | Sourced: `training_cost_per_recruit` |
| `gdp_employers` | conscription active; cumulative GDP loss > £2bn | Sourced: `output_per_worker_labour_share`, `output_per_worker_gross` |
| `judicial_review` | minimal exemptions; Bill passed | Fiction, no numbers |
| `devolved_objection` | turn ≥ 2; Bill introduced or passed | Fiction, no numbers |
| `nato_liaison` | turn ≥ 3; trained conscripts > 0; Force Quality < 0.6 — informational | Fiction, no numbers |
| `briefing_leak` | turn ≥ 3 (weight 2) | Fiction, no numbers |
| `recruiting_surge` | turn ≥ 2; at least one address to the nation | Sourced: `regular_untrained_intake_annual` |
| `regular_retention_wobble` | turn ≥ 3; stop-loss not active | Sourced: `regular_voluntary_outflow_annual` |
| `opposition_motion` | turn ≥ 3; political capital < 30 | Fiction, no numbers |
| `strategic_trace_result` | turn ≥ 4; trace attempted — informational | Sourced: `strategic_reserve_untracked` |
| `junior_entry_useless` | turn 1–6 (weight 2) — informational | Sourced: `junior_entry_attrition`, `junior_entry_lead_months` |
| `women_clause_row` | Bill introduced or passed; women excluded — informational | Sourced: `women_included_support_pct`, `ew_pop_18_30`, `ew_pop_f_18_30` |
| `medical_rejections_reality` | peacetime medical standard; conscription active | Sourced: `army_medical_rejections_jul24_jan26` |
| `vetting_backlog` | turn ≥ 2; conscription active | Fiction, no numbers |
| `police_vetting_row` | two months after the military were given vetting priority | Fiction, no numbers |
| `vetting_failure` | three months after the vetting standard was lowered | Fiction, no numbers |

## Notes on particular events

- `junior_entry_useless`: `ConditionKey` has no key for the junior-entry action
  having been taken, so the event cannot fire *because* the player chose it.
  It fires as a circulated proposal in turns 1–6 instead. The briefing
  (`src/ui/briefing.ts`) does see `state.juniorEntryTaken` and explains the
  option's uselessness when the sim adds a note matching `/junior/` to
  `briefing.notes`.
- `ally_asks` / `ally_asks_behind`: effects cannot branch on state, so the
  brief's "PC by actual status" is implemented as two events keyed on
  `force_ready_pct` either side of 50%.
- `poll_bounce`: the brief wants an effect with no choice; the schema has no
  top-level effects, so it is a single-choice notice ("Noted").
- `medical_rejections_reality` and `medical_scandal` change the medical
  standard by effect; `medical_rejections_reality` charges the clause cost
  explicitly (`pc −3`) in case `applyEffects` does not.
- `instructor_revolt` / `treasury_letter` use `capacity_purchases: −1`; whether
  the diverted junior leaders return is the sim's decision.
- The vetting trilogy (`vetting_backlog` → `police_vetting_row` /
  `vetting_failure`) is the deck's only branching chain. The opening event's
  three choices are mutually exclusive and each has its own consequence:
  giving the military priority brings the Commissioner's letter two months
  later; lowering the standard brings the recruit who should not have been
  cleared three months later; doing nothing imposes the vetting ceiling on the
  call-up (`vetting_throughput_monthly`, six months, spec §5.1) and brings
  nothing after it, because the queue is the consequence. No figure appears in
  the prose: the player meets the ceiling as a number in the call-up control
  and the briefing, carrying its source popover like every other parameter,
  rather than as a claim in the text. The two ceilings are the only event
  magnitudes in the deck that are parameterised, because they are the only ones
  that model a real-world rate rather than a political consequence; both are
  `assumption` with a range, and the UKSV evidence behind their order of
  magnitude is in `docs/source-verification.md` item 22.
- Numbers deliberately not quoted anywhere because they could not be sourced
  (see `docs/source-verification.md`): the £49k Phase 1 + 2 training cost,
  the £3.5–5k per-head kit cost, "6.8 medical rejections per intake", the
  ~20-week Phase 2 average, and the "two-year" junior-entry course. Dates
  (2005 regulations, July 2024–January 2026) are written in words so that no
  unsourced digit appears in prose.

## Verdicts

Ordered for first-match selection: two resignation verdicts first
(`resigned_broken`, `resigned_generic`), then target-met (`met_high_intact`,
`met_any_broken`, `met_high_strained`, `met_mid_any`, `met_low_any`), then
missed (`missed_high_intact`, `missed_any_broken`, `missed_low_any`,
`missed_any_any`), then `fallback` last. Placeholders used: `{headcount}`,
`{ese}`, `{target}`, `{shortfall}`, `{months}`, `{costBn}`, `{gdpLossBn}`,
`{conscripts}`, `{reservists}`, `{regulars}`. `{quality}` and `{leadership}`
are avoided because the scorer fills placeholders as formatted integers.
