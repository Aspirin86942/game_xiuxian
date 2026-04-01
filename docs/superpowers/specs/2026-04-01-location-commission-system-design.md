# Location Commission System Design

## 1. Summary

This design replaces the current side-quest concept with a cleaner, location-driven commission system.

The existing side-quest direction in this repository was built around "old debts", "old cases", volume cleanup, and main-story closure. That direction is internally coherent, but it keeps the side system entangled with the main narrative contract. The user requested a reset: remove the old branch-style side content and rebuild it as exploration-oriented commissions that stay independent from main-story progression.

The new system should therefore be defined as:

`a location-driven, realm-gated, fixed-content commission system that does not participate in main-story progression`

Its purpose is not to close main-story obligations. Its purpose is to make the cultivation world feel broader than the main plot by giving each major location its own small, self-contained work, risks, and social texture.

## 2. Goals

- Replace the old debt-recovery side-quest direction with a clearer commission-oriented structure.
- Make commissions primarily driven by location, with realm as an access gate.
- Keep commission content independent from main-story chapter progression.
- Use commissions to enrich local world flavor, cultivation livelihoods, and light resource decisions.
- Keep the system lightweight enough for the current single-screen text RPG structure.
- Ensure each location has a distinct commission identity instead of becoming a generic task list.

## 3. Non-Goals

- No commission should be required to unlock or advance the main story.
- No commission should become a delayed volume-cleanup obligation.
- No commission should introduce cross-volume narrative debt that later chapters must explicitly absorb.
- No commission should act as a disguised second main story.
- No repeatable bounty board or endlessly refreshing MMO-style task loop in this phase.
- No attempt to preserve old "旧事 / 旧账 / 卷末回收" semantics under a new skin.

## 4. Why This Redesign Exists

The current rulebook direction for side quests prioritizes service to volume themes and main-story closure. That is a valid narrative choice, but it conflicts with the newly chosen product direction.

The new direction is intentionally different:

- side content should no longer exist to help a volume "收账";
- side content should no longer compete for narrative responsibility with the main story;
- side content should instead behave like local commissions that reveal how the wider cultivation world works.

This is not a copy edit or a content refresh. It is a system-purpose replacement.

Because of that, later implementation should treat this as a semantic migration, not a simple reskin of the current side-quest pool.

## 5. Chosen Design

Chosen approach: `location board + fixed authored commissions`

Each major location owns a small set of fixed commissions. The player sees commissions because they are in or have reached a location, and because their current realm meets the gate. Each commission is authored by hand, can be accepted explicitly, and resolves permanently as a completed or failed local story.

This approach was chosen over:

- a repeatable bounty system, which would be cleaner for long-term grinding but too template-heavy for the current text-heavy project;
- a pure short-story anthology model, which would be flavorful but too weak as a systems surface.

The design keeps the clear structure of a commission board while borrowing some short-story discipline so each commission still feels like a small cultivation episode instead of a bare reward transaction.

## 6. System Positioning and Boundaries

The new commission system has exactly three responsibilities:

1. Show local world texture.
2. Show non-main-story cultivation livelihoods and encounters.
3. Offer light optional resource and stance decisions.

It must respect four hard boundaries:

1. It does not advance the main story.
Commission completion or failure cannot unlock, block, or rewrite main chapters.

2. It does not create mandatory end-of-volume cleanup.
There should be no expectation that a later main chapter must explain the result of a commission.

3. It may share locations and even familiar NPCs, but not main-story narrative responsibility.
A commission in Huangfeng Valley may mention the sect environment, but it must not become an extension of a core Li Huayuan, Nangong Wan, or Mo Manor arc.

4. It is no longer conceptually "旧事".
The player-facing system identity should move away from debt-and-closure language and toward commission-oriented wording.

## 7. Trigger Model

The commission system is driven by `location first, realm second`.

### 7.1 Location as the primary organizer

Commissions are grouped by location rather than by chapter or by abstract quest category.

This means the player should understand commissions as:

- "things people ask for in Qingniu Town,"
- "things scattered cultivators need in Tainan Mountain,"
- "things sect disciples get dragged into in Huangfeng Valley,"
- "things sea cultivators gamble with in the Star Sea."

### 7.2 Realm as a gate, not the core identity

Realm exists to control difficulty, reward tier, and unlock timing.

Realm does **not** define the narrative identity of a commission. A Qingniu Town commission should still feel like Qingniu Town even if it is only available to early-stage players.

### 7.3 Main-story progress as world access only

The main story may still indirectly matter by determining whether a location is reachable or already part of the player's active world, but commissions themselves should not be authored as chapter-attached obligations.

That distinction matters:

- world access can depend on story progress;
- commission meaning cannot depend on story cleanup.

## 8. Commission Lifecycle

The new system should be intentionally simple.

### 8.1 Recommended states

- `hidden`: location unavailable or realm gate not met
- `available`: can be accepted
- `active`: currently accepted
- `completed`: resolved successfully
- `failed`: entered but failed internally

The old narrative-heavy ideas such as "volume close", "seed forward", "convert to main", and volume-end reinterpretation should not remain in the new contract.

### 8.2 Active commission limit

Recommended rule: only one active commission at a time.

Reasons:

- the project is already UI-dense in a fixed 375x667 viewport;
- multiple concurrent commissions would quickly bloat the panel and save structure;
- a single active commission better matches the feeling of "the one errand under your feet right now."

### 8.3 Commission length

Each commission should stay small:

`briefing -> acceptance -> one core situation -> one key choice -> resolution`

At most, a commission should contain one to two meaningful choice points. It should never read like a parallel main-story chapter.

### 8.4 Failure model

Failure should come from internal commission logic only:

- losing a linked fight,
- lacking required resources,
- abandoning the job,
- choosing a route that closes the job badly.

Failure should not primarily come from unrelated main-story time pressure.

### 8.5 After resolution

Once completed or failed, the commission leaves the active pool permanently and becomes a short history record at most. It should not remain hanging as unresolved narrative debt.

## 9. Location Content Identity

The system only stays clean if each location has a strong authored identity.

### 9.1 Qingniu Town

Theme: mortal-edge cultivation errands.

Suitable commission types:

- medicine delivery
- searching for missing people or animals
- mountain-path escort
- suspected haunting or strange noise investigation
- herb gathering for low-level talismans or remedies

What this location should express:

Cultivation power beginning to touch ordinary life.

### 9.2 Tainan Mountain

Theme: scattered cultivator market and gray-zone exchange.

Suitable commission types:

- material purchasing
- shipment escort
- rumor verification
- small cave scouting
- stall disputes
- theft tracing
- black-market delivery

What this location should express:

Information, bargaining, and risk pricing matter as much as raw strength.

### 9.3 Huangfeng Valley

Theme: sect errands and low-ranking institutional survival.

Suitable commission types:

- medicine garden tasks
- patrol duty
- outer-mountain investigation
- pill room cleanup
- warehouse accounting trouble
- errands for senior disciples

What this location should express:

Sect life is not only major plot events. It is also rules, labor, hierarchy, concealment, and practical responsibility.

### 9.4 Star Sea

Theme: dangerous maritime livelihoods.

Suitable commission types:

- demon hunting
- escorting boats or cargo
- sea mist disappearance searches
- ruined formation probing
- isolated island gathering
- black-market transfer
- temporary alliance risk jobs

What this location should express:

The sea is freer, colder, and more openly lethal than inland cultivation society.

## 10. Reward and Consequence Design

The reward philosophy should stay restrained.

### 10.1 Reward tier

Commission rewards should generally sit:

- above a normal random encounter,
- below a main-story milestone.

They should feel worthwhile, not mandatory.

### 10.2 Appropriate rewards

- spirit stones
- herbs
- demon cores
- low or mid-tier pills
- crafting materials
- consumables
- modest equipment drops
- small relation changes
- small route-lean adjustments

### 10.3 Inappropriate rewards

- main-story key items
- volume-defining closure flags
- decisive long-term bond locks with core main-story NPCs
- unusually strong progression accelerants that distort cultivation pacing

### 10.4 Consequence philosophy

Each commission outcome should ideally leave at least two light traces, chosen from:

- resource changes
- local relation or trust changes
- small route tilt
- a short history record
- a location-specific completion mark

What it should not leave is a future main-story debt.

## 11. Relationship to Existing Systems

### 11.1 Relationship to random encounters

Random encounters are accidental.
Commissions are intentional.

An encounter answers:
"What suddenly happened on the road?"

A commission answers:
"Now that you are here, do you want to take on this local job?"

This means commissions should always have a visible source such as a notice, sect assignment, stall request, rumor lead, or direct appeal.

### 11.2 Relationship to expedition and combat

Commissions may use exploration or combat steps, but they must not collapse into:

`accept -> auto-fight -> get reward`

Each commission should include at least one authored judgment point so it remains a story-shaped decision, not a thin wrapper around combat.

### 11.3 Relationship to the main story

The main story remains responsible for:

- chapter progression,
- volume structure,
- core NPC fate,
- long-term route identity,
- ending logic.

The commission system remains responsible for:

- local world slices,
- optional resource pressure relief,
- social texture outside the main plot,
- light stance shaping.

The two systems share a world, not narrative debt.

## 12. First-Batch Prototype Pool

Recommended first production batch: `4 locations x 4 commissions`

Total: 16 fixed commissions.

This is enough to prove location identity without exploding authoring cost.

### 12.1 Qingniu Town prototypes

- Mountain medicine delivery
- Rear-hill strange noise
- Lost ox in the fog
- Dawn dew herb gathering for talisman crafting

### 12.2 Tainan Mountain prototypes

- Fake cinnabar at the stall
- Scout an abandoned cave first
- Night-market cargo escort
- Material purchasing for a rushed cultivator

### 12.3 Huangfeng Valley prototypes

- Failed pill furnace cleanup
- Stolen herb patch
- Outer-mountain missing disciple search
- Warehouse account discrepancy

### 12.4 Star Sea prototypes

- Lost ship in sea fog
- Demon hunt during abnormal tide
- Black-market transfer
- Isolated island broken formation probe

### 12.5 Recommended rollout order

First batch to implement:

- Qingniu Town
- Tainan Mountain

Second batch to implement after the structure proves stable:

- Huangfeng Valley
- Star Sea

This staging reduces balancing risk and lets the team validate the commission format in earlier, simpler ecosystems first.

## 13. Naming Recommendation

The player-facing system should move away from "旧事".

Recommended base term: `委托`

Why:

- clearer than `风闻` as a systems label,
- more neutral than `差使`,
- flexible enough to adapt by location.

Suggested usage:

- system-level label: `地点委托`
- Qingniu Town flavor: `坊间委托`
- Huangfeng Valley flavor: `山门差使`
- Star Sea flavor: `海上委托` or `海上悬赏`

This preserves clarity while allowing local tone variation.

## 14. Migration Principles

Later implementation should treat this as a semantic replacement.

### 14.1 Remove old responsibility definitions

The current side-quest language around old debts, old cases, volume cleanup, and follow-up hooks should not remain the purpose of the new system.

### 14.2 Clear the old content pool

The current authored side-quest set should not be treated as the seed of the new commission system. The new pool should be authored fresh around location identity.

### 14.3 Reuse structure only where it stays neutral

If current runtime state handling, acceptance flow, and UI containers are still technically useful, they may be reused.

But their meaning, naming, and authoring contract must change.

### 14.4 Remove volume-end contract fields from the new authoring model

Fields like:

- `closureMode`
- `followupHook`
- volume-end cleanup semantics

should be removed or retired from the new commission content contract unless they are repurposed into a strictly local, non-main-story meaning. The preferred direction is to remove them from the commission model.

## 15. Rulebook Impact

If this design moves forward, later documentation work must update both rulebook families.

### 15.1 `docs/side-quest-system/`

This rulebook must be rewritten from:

"side content serves volume themes and closure"

to:

"location commissions serve world texture and optional local decisions"

The following sections will need major revision:

- system purpose
- status definitions
- content authoring principles
- player-facing terminology
- migration notes and change log

### 15.2 `docs/narrative-decision-system/`

This rulebook should narrow its discussion of side-content interaction.

The new contract should state:

- main story owns volume structure;
- commissions do not own volume cleanup;
- both systems may share locations and assets without sharing narrative closure obligations.

## 16. Acceptance Criteria for the Future Implementation Plan

Any implementation plan based on this design should preserve these acceptance standards:

- the commission system is visibly location-driven;
- realm gates exist but do not erase location identity;
- commissions do not alter main-story unlock logic;
- commissions do not require later volume-end explanation;
- the player-facing wording no longer presents the system as `旧事`;
- at least two locations demonstrate clearly different commission identities;
- the first implemented commissions feel authored and local, not like repeatable generic tasks.

## 17. Risks

- semantic drift: code and docs may partially keep old side-quest meaning under new labels;
- content drift: commissions may lose location identity and become generic errands;
- reward creep: optional commissions may become efficient enough to distort progression pacing;
- UI drift: the fixed mobile layout may become crowded if the panel tries to show too many commissions or too much history;
- overlap drift: commissions may collapse into random encounters or mini-main-story chapters unless the format stays disciplined.

## 18. Recommendation for Planning

The implementation plan should begin with contract-setting and migration boundaries, not immediate content writing.

Recommended planning order:

1. redefine the player-facing system identity and runtime contract;
2. decide which parts of the current side-quest state machine survive;
3. strip old narrative-semantic fields from the authoring model;
4. implement one early-location commission slice end to end;
5. validate UI density, save behavior, and reward balance;
6. expand to the rest of the first batch only after the slice proves stable.
