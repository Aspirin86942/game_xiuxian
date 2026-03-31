# Narrative Repair Phase 2 Design

## 1. Summary

Phase 2 continues the narrative repair after Phase 1. Phase 1 removed the worst late-game thesis prose from a small set of high-visibility chapters and aligned the story panel summary copy. Phase 2 should widen that cleanup into a system-level pass: runtime text emitters, late-game chapter body copy, ending copy, default fallback copy, test contracts, and rulebook language must all speak in the same voice.

This phase is still a content-and-presentation repair, not a topology rewrite. It may reorganize how late-game text is generated and validated, but it must not change save format, chapter ids, `nextChapterId` topology, DOM anchors, or core gameplay loops.

## 2. Goals

- Remove remaining late-game "author thesis" prose from player-visible runtime text.
- Unify late-game narrative voice across chapter body text, `getChapterEchoes()`, ending text, fallback UI copy, tests, and rulebooks.
- Reduce mismatch between runtime behavior, player-visible labels, and authoring contracts.
- Add stronger regression protection for late-game copy so future edits cannot silently reintroduce the old tone.

## 3. Non-Goals

- No real branching-topology rewrite.
- No save-schema or `storyProgress` id changes.
- No new combat, cultivation, inventory, or side-quest mechanics.
- No retuning of battle balance, economy, or breakthrough pacing.
- No large UI restructure beyond copy-level or small rendering-contract cleanup.

## 4. Scope Boundary

Phase 2 is allowed to touch generation logic when that logic is the source of stale or inconsistent late-game copy. Specifically, it may adjust the contract around late-game text emitters such as `getChapterEchoes()` and related renderer/test helpers. That flexibility exists only to support wording cleanup and consistency; it does not authorize state-machine rewrites.

Included scope:

- Late-game main-story body copy.
- `getChapterEchoes()` and other late-game narrative emitters.
- Ending text and pre-ending "问心" copy.
- Story-panel and choice fallback copy tied to late-game narrative tone.
- Rulebooks and authoring-interface docs that define late-game narrative wording.
- Smoke/E2E coverage that protects the updated tone and wording contract.

Excluded scope:

- New chapter topology.
- New save fields.
- New chapter ids.
- Expanded ending tree logic.
- Non-narrative gameplay systems.

## 5. Design Choice

Chosen approach: layered cleanup with one shared contract.

This phase should not start by rewriting isolated strings. It should first define a late-game narrative contract, then apply that contract in three synchronized layers:

1. Runtime emitters and player-visible surfaces.
2. Regression tests and test helpers.
3. Rulebooks and author-facing documentation.

This avoids repeating the Phase 1 pattern where the immediate player-visible fix landed, but surrounding runtime emitters, tests, and docs still carried older phrasing or assumptions.

## 6. Narrative Contract

Late-game copy in this phase should follow these rules:

- Prefer scene, gesture, object, timing, and interpersonal pressure over abstract thesis statements.
- Prefer consequences that feel observed in-world over narrated conclusions about "what this chapter really means".
- Keep judgment in character, situation, or material detail instead of author summary voice.
- Keep fallback text in-world; avoid explanatory product-style prose in runtime UI.
- Use one consistent naming contract for adapted volumes across runtime, tests, and docs.

Disallowed late-game tendencies:

- Repeated "真正……不是……而是……" meta-summary templates.
- Paragraph endings that explain the chapter's thesis instead of landing on a scene or pressure point.
- Test helpers that verify only absence of a few bad phrases but do not protect target late-game copy.
- Rulebook language that implies one volume-label contract while runtime shows another.

## 7. Runtime Targets

Phase 2 should audit and repair the following runtime surfaces:

### 7.1 Chapter Body Copy

- Late-game chapter summaries.
- Late-game chapter body closing beats.
- Transitional paragraph endings in late volumes that still sound like retrospective thesis statements.

### 7.2 Echo Emitters

- `getChapterEchoes()` late-volume cases.
- Any helper-generated summary or echo text appended after base beats.
- Any runtime fallback that still reintroduces old thesis tone even after chapter text was cleaned.

### 7.3 Ending Surfaces

- Ending descriptions.
- Pre-ending "门前问心" or similar convergence text.
- Runtime copy shown when the player reaches ending choice states.

### 7.4 UI Fallback Surfaces

- Story summary fallback logic.
- Default `choice-cost` copy when no explicit `visibleCostLabel` exists.
- Any late-story default prompt or empty-state wording that still speaks in old meta prose.

## 8. Runtime Design

### 8.1 Source of Truth

`story-data.js` remains the source of truth for authored late-game chapter text. Phase 2 may refactor how helper-generated echoes or defaults are selected, but it should not split authored data into a new storage model in this phase.

### 8.2 Emitter Cleanup

If `getChapterEchoes()` is still carrying stale thesis phrasing, Phase 2 may:

- rewrite the individual case text,
- rename local helper concepts for clarity,
- tighten how tests identify "echo beat" vs authored body text,
- centralize repeated late-game wording fragments if that reduces drift.

It should not:

- change chapter reachability,
- move story logic into a different subsystem,
- or add a second competing narrative data table.

### 8.3 Renderer Cleanup

Renderers should present authored text plainly. If the runtime adds explanatory suffixes or default prose, those additions must remain short, in-world, and contract-tested.

## 9. Test Strategy

Phase 2 needs stronger tests than Phase 1 in two ways.

### 9.1 Positive Contract Tests

Late-game smoke tests should assert expected target fragments or exact strings for the highest-risk emitters. Do not rely only on banned-phrase checks.

### 9.2 Surface-Specific Coverage

Tests should distinguish:

- authored chapter body text,
- appended echo text,
- ending text,
- fallback renderer copy.

The contract should not rely on "last beat in array" unless that ordering is itself guaranteed and intentional.

### 9.3 UI Regression Coverage

Focused E2E should cover at least:

- late-story summary copy,
- at least one fallback `choice-cost` rendering path,
- at least one ending or pre-ending player-visible copy path if Phase 2 changes those surfaces.

## 10. Rulebook Alignment

Rulebooks and authoring docs must be updated in the same phase, not later. Specifically:

- `docs/narrative-decision-system/`
- `docs/side-quest-system/` where terms overlap
- authoring-interface docs that define chapter, echo, ending, and volume-label language

These docs should define the same adapted-volume contract and the same late-game narrative voice expectations used by runtime and tests.

## 11. Implementation Shape

Phase 2 should likely break into the following workstreams:

### Workstream A: Contract Definition

- Write down the late-game wording contract.
- Identify target surfaces and forbidden old templates.
- Decide which runtime labels and docs are canonical.

### Workstream B: Runtime Cleanup

- Clean late-game chapter body text.
- Clean `getChapterEchoes()` and ending emitters.
- Clean fallback player-visible renderer text.

### Workstream C: Regression Hardening

- Add smoke helpers that understand body-vs-echo-vs-ending surfaces.
- Add focused E2E for fallback copy and selected late-game visible text.

### Workstream D: Rulebook Sync

- Rewrite rulebooks and authoring docs to match runtime contract.
- Record scope and rationale in change logs.

## 12. Acceptance Criteria

Phase 2 is complete when all of the following are true:

- Late-game player-visible text no longer falls back into obvious author-thesis phrasing on the targeted surfaces.
- Runtime emitters, tests, and docs use one consistent adapted-volume and late-game narrative contract.
- No save structure changes were introduced.
- No chapter topology changes were introduced.
- `npm run test:smoke` passes.
- `npm run test:e2e` passes.
- `npm test` passes.

## 13. Risks

- Scope creep: allowing runtime cleanup can accidentally turn into topology or systems work.
- Mixed contracts: docs may be updated without fully cleaning runtime emitters, or vice versa.
- False confidence: banned-phrase tests alone can miss new but equally abstract prose.
- Dirty-history risk: if unrelated narrative-contract edits are already present in the worktree, commits can become impure unless staging is tightly controlled.

## 14. Recommendation for Planning

The implementation plan for Phase 2 should keep the same task discipline as Phase 1:

- one bounded task at a time,
- implementer subagent,
- spec review,
- code quality review,
- verification after every task.

But unlike Phase 1, the first task should be contract-setting, not immediate string replacement. Phase 2 will go faster if every later text change is checked against one explicit runtime-and-doc wording contract.
