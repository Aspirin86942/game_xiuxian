# Narrative Repair Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the main story so late-game chapters read as scenes instead of essay summaries, restore live character voice in the return-home arc, and tighten the story panel copy without changing save format or chapter topology.

**Architecture:** Keep the current linear `storyProgress -> chapter -> nextChapterId` flow intact and treat this as a content-and-presentation repair, not a branching-system rewrite. Implement the repair in three layers: add deterministic smoke guards first, rewrite the worst late-game chapter text in `story-data.js`, then make a small story-panel copy adjustment in `src/ui/renderers.js` so the UI stops adding extra explanatory prose on top of the authored text.

**Tech Stack:** Vanilla JavaScript, Node.js assert smoke tests, Playwright E2E, static HTML/CSS

---

## File Map

- `story-data.js`
  - Rewrite late-game chapter `summary` and `beats()` content.
  - Preserve current `nextChapterId`, save keys, and choice ids.
- `src/ui/renderers.js`
  - Keep the story panel rendering contract stable while removing extra explanatory copy from the summary area.
- `tests/story-smoke.js`
  - Add deterministic narrative-contract checks for dialogue presence and anti-thesis wording.
- `tests/e2e/story.spec.js`
  - Add player-visible assertions for rewritten story summaries.
- `docs/narrative-decision-system/04-change-worklog.md`
  - Record the scope boundary for this phase and the specific late-game narrative fixes.

## Scope Boundary

- This plan does **not** introduce real divergent `nextChapterId` paths.
- This plan does **not** change save structure, `storyProgress` ids, or DOM anchors.
- This plan does **not** rebalance combat, cultivation, inventory, or side-quest state machines.
- Real branching topology should be planned separately after this pass lands and stays green.

### Task 1: Add Dialogue Guardrails And Rewrite The Return-Home Character Chapters

**Files:**
- Modify: `tests/story-smoke.js`
- Modify: `story-data.js`
- Test: `tests/story-smoke.js`

- [ ] **Step 1: Write the failing smoke tests for live-character chapters**

```js
function getChapterTexts(chapterId, configure) {
    const { state, view } = getChapterChoiceView(chapterId, configure);
    return {
        state,
        summary: view.chapter.summary,
        beats: view.story.beats.map((item) => item.text),
        dialogueCount: view.story.beats.filter((item) => item.speaker !== '旁白').length,
    };
}

function testReturnHomeCharacterChaptersUseLiveDialogue() {
    ['23_mocaihuan_return', '24_old_debt_and_name'].forEach((chapterId) => {
        const { dialogueCount } = getChapterTexts(chapterId);
        assert(dialogueCount >= 2, `章节 ${chapterId} 至少应有 2 段人物对白，避免整章只剩旁白总结`);
    });
}
```

- [ ] **Step 2: Register the new smoke test and run it to verify it fails**

```js
testReturnHomeCharacterChaptersUseLiveDialogue();
```

Run: `node tests/story-smoke.js`

Expected: FAIL with at least one assertion like `章节 23_mocaihuan_return 至少应有 2 段人物对白` or `章节 24_old_debt_and_name 至少应有 2 段人物对白`.

- [ ] **Step 3: Rewrite the two worst late-game chapters in `story-data.js`**

Replace the `summary` and `beats()` blocks for `23_mocaihuan_return` with:

```js
summary: '一封家书把你重新拽回嘉元城。院门还在，等门的人已经学会不再把答案只押在你身上。',
beats(state) {
    const debtLine = state.flags.madeAmendsToMocaihuan || state.flags.mendedMoHouseDebt
        ? '你上次留下的补偿还在起作用，可那并不等于这次进门就能当作什么都没欠。'
        : '你带回来的不是迟到的义气，而是一个早该亲自回来交代的人。';
    return [
        beat('旁白', '信纸并不名贵，边角却被人折得很平。你在海上看惯了生死和试探，反倒是这样一封只写日常的来信，让手指迟迟没能松开。'),
        beat('旁白', debtLine),
        beat('旁白', '再回嘉元城时，墨府门前的石阶已经换过两块。门里灯火不旺，却也没有你想象中的那种“只等你来定生死”的气息。'),
        beat('墨彩环', '你总算肯回来一趟。别紧张，我不是来逼你补一张旧账单的。只是有些话若再不当面说，就真要烂在旧屋里了。'),
        beat('你', '我欠下的，不止一张账单。只是这些年总想着先把命保住，回头便回得越来越晚。'),
        beat('墨彩环', '凡人的日子不是给你存着的。你回来，我认；你不回来，我们也照样过。可你若进了这道门，总得先说明白，这次是来认人，还是只来看看。'),
        beat('旁白', '她说话不急，分量却比责怪更重。你这才真听见这些年被自己一句“以后再补”压下去的声音。'),
    ];
},
```

Replace the `summary` and `beats()` blocks for `24_old_debt_and_name` with:

```js
summary: '嘉元城与黄枫谷都还记得你。难的不是回来，而是回来后不能再把该认的都推给明天。',
beats(state) {
    const flags = state.flags || {};
    const relationMo = state.npcRelations['墨彩环'] || 0;
    const relationLi = state.npcRelations['李化元'] || 0;
    const returnLine = flags.tiannanReturnMode === 'settlement'
        ? '你既已决定回来清账，旧地就不会再允许你只做一个过路人。'
        : flags.tiannanReturnMode === 'bonds'
            ? '你先承认了人，所以旧账也跟着站到了眼前。很多债并不会因为你先认了情就自行变轻。'
            : '你本想只处理最低限度的部分，可真走到旧屋旧门前时，才知道最难压下去的从来不是旁人的目光，而是自己心里那句“其实我知道该认”。';
    const moLine = relationMo >= 45 || flags.daoLvPromise || flags.mendedMoHouseDebt
        ? '墨府那一笔已经不能再被你说成“以后再补”。不管是补偿、认错还是断开，你都得给它一个像样的落点。'
        : '嘉元城没有追着你算账，可也正因为如此，你更知道这笔账若还要拖，只会越来越像你自己的心病。';
    const liLine = relationLi >= 30 || flags.liDisciple || flags.enteredLihuayuanLineage
        ? '黄枫谷旧门墙也在等你回话。真正要认的不是名分，而是你这些年借过、背过、又想甩开的那些东西。'
        : '就算你没有正式把名字落在门墙里，旧宗门与旧战局也不会真把你当成无关人。';
    return [
        beat('旁白', '回乡之后最先围上来的不是刀，而是两种完全不同的目光：一种来自还在等你给话的人，一种来自早就把你算进旧案里的人。'),
        beat('墨彩环', '你若只把灵石放下，和从前把事往后拖，其实没多大分别。'),
        beat('旁白', returnLine),
        beat('黄枫谷执事', '李师叔当年替你压过的话，如今总该有人亲口回一句。你要认门墙，还是认完便走，今天都得说清。'),
        beat('旁白', moLine),
        beat('旁白', liLine),
        beat('你', '我今天回来，不是为了把旧名重新挂回身上，而是为了把该我自己接的那一段先接住。'),
        beat('旁白', '话一出口，旧屋、旧门和旧案才像真的落回了地上。很多年里你第一次不再只想着怎么脱身，而是先想怎么把这一步站稳。'),
    ];
},
```

- [ ] **Step 4: Run the smoke test again and verify the new guard now passes**

Run: `node tests/story-smoke.js`

Expected: PASS with the final line `story smoke passed`.

- [ ] **Step 5: Commit the chapter-voice repair**

```bash
git add tests/story-smoke.js story-data.js
git commit -m "fix: restore live dialogue in return-home chapters"
```

### Task 2: Add Anti-Thesis Guards And Rewrite Entry/Exit/Final Chapter Hooks

**Files:**
- Modify: `tests/story-smoke.js`
- Modify: `story-data.js`
- Test: `tests/story-smoke.js`

- [ ] **Step 1: Add a smoke test that blocks the repeated “作者总结腔”**

```js
function testLateVolumeHooksAvoidMetaThesisLines() {
    const banned = [
        '这一章真正留下的',
        '这一卷真正',
        '真正的问题已经不再是',
        '到了这里，真正要收拢的',
    ];

    [12, '12_mortal_debt', 23, 24, 25, '25_final_branch'].forEach((chapterId) => {
        const { summary, beats } = getChapterTexts(chapterId);
        const sample = [summary, beats[beats.length - 1]].join('\n');
        assertTextContainsNone(sample, banned, `章节 ${chapterId} 仍带有作者总结腔`);
    });
}
```

- [ ] **Step 2: Register the new smoke test and run it to verify it fails**

```js
testLateVolumeHooksAvoidMetaThesisLines();
```

Run: `node tests/story-smoke.js`

Expected: FAIL on at least one of `12`, `23`, `24`, `25`, or `25_final_branch`.

- [ ] **Step 3: Replace the late-game chapter summaries and closing beats with scene hooks**

Apply these exact text replacements in `story-data.js`:

```diff
- summary: '真正离开旧地，不是走远，而是承认凡俗旧路已经不能再替你兜底。',
+ summary: '越国边境风硬，回头路也硬。你还没走远，旧地的人与事却已经开始在背后追。',

- beat('旁白', '从这里起，你才算真正离开旧地。不是换了个落脚处，而是往后连活法都得跟着改。'),
+ beat('旁白', '官道拐向太南山时，你终于把最后一次回头忍住了。前路还没稳，旧地也没断，只是从这一步起，它再不会替你挡风。'),

- summary: '真正麻烦的，不是旧债还在，而是别人已经替你把这些年过完了。',
+ summary: '嘉元城门没变，变的是门里那些等不起的人。',

- beat('旁白', '凡俗旧债并没有因为你走远就自动失效。你在这里怎么认账，后面就会怎么理解“修仙之后还认不认人”。'),
+ beat('旁白', '你走出嘉元城时没有比来时轻松多少，只是终于知道：这地方欠你的会疼，你欠这地方的也会疼。'),

- summary: '虚天殿之前，真正的考验不是战力，而是你会不会在关键时刻改口。',
+ summary: '虚天将开，海雾里每一句“同行”都像先写好的试探。',

- beat('旁白', '虚天殿真正留下的，不是宝物本身，而是最窄那一步里你到底更像哪一类人。'),
+ beat('旁白', '殿门后的风还带着盐气，你却先记住了是谁在最窄那一步伸手，谁在最窄那一步松手。'),

- summary: '你回到天南时才发现，真正涌上来的不是怀旧，而是那些还没认完的人、账与名字。',
+ summary: '天南风物仍旧，认你的人却已经不是当年那一批。',

- beat('旁白', '回到天南之后，嘉元城的旧屋、黄枫谷的门墙和禁地里的名字，都会轮番来认你。'),
+ beat('旁白', '你才踏进天南几步，旧屋、门墙和故人的名字便一个接一个撞了上来，谁都没打算让你安静路过。'),

- summary: '飞升前最后要认的，不是自己够不够强，而是这一生的关系、旧账与路数你究竟肯不肯承认。',
+ summary: '天门未开，案上的旧物先把你这一生照亮了一半。',

- beat('旁白', '大道尽头，从来没有早已摆好的几扇门任人挑选。你这一生结下的因果、欠下的旧账与斩不断的尘缘，终会自己拼出那个属于你的答案。'),
+ beat('旁白', '案上的旧物一件件摊开后，你才发现门前最响的不是天风，而是那些一路被你压到今天才肯一起出声的旧事。'),

- summary: '到了这里，真正要收拢的，是你一路留下的人、账与活法，而后它们自会合成你的答案。',
+ summary: '门前无人催你，倒是一路没说完的话先挤到了喉间。',

- beat('旁白', '到了最后，最会追上来的不是别人，而是你一路以来最熟悉的迟疑：总想以后再说。'),
+ beat('旁白', '门缝里有风，你却先听见自己这些年最熟悉的那句拖延又一次追了上来：再晚一点，再往后一点。'),
```

- [ ] **Step 4: Re-run the smoke suite and verify the anti-thesis guard passes**

Run: `node tests/story-smoke.js`

Expected: PASS with the final line `story smoke passed`.

- [ ] **Step 5: Commit the scene-hook rewrite**

```bash
git add tests/story-smoke.js story-data.js
git commit -m "fix: replace late-game thesis hooks with scene hooks"
```

### Task 3: Align Story Panel Copy With The New Authored Text

**Files:**
- Modify: `src/ui/renderers.js`
- Modify: `tests/e2e/story.spec.js`
- Test: `tests/e2e/story.spec.js`

- [ ] **Step 1: Add a focused E2E assertion for the rewritten story summaries**

Append these tests to `tests/e2e/story.spec.js`:

```js
test('第二卷入口摘要使用场景钩子而不是总论句', async ({ page }) => {
    const scenario = createVolumeTwoEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator('#story-summary')).toHaveText('越国边境风硬，回头路也硬。你还没走远，旧地的人与事却已经开始在背后追。');
    await expect(page.locator('#story-summary')).not.toContainText('真正离开旧地，不是走远');
});

test('第五卷入口摘要使用场景钩子而不是怀旧总论', async ({ page }) => {
    const scenario = createVolumeFiveEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator('#story-summary')).toHaveText('天南风物仍旧，认你的人却已经不是当年那一批。');
    await expect(page.locator('#story-summary')).not.toContainText('真正涌上来的不是怀旧');
});
```

- [ ] **Step 2: Run the focused E2E test to verify it fails before the renderer cleanup**

Run: `npx playwright test tests/e2e/story.spec.js --grep "摘要使用场景钩子"`

Expected: FAIL because the old authored summary text is still visible or the renderer is still appending extra explanatory prose.

- [ ] **Step 3: Remove extra explanatory copy from the story panel**

Replace the summary and default choice-cost lines in `src/ui/renderers.js` with:

```js
ctx.elements.storySummary.textContent = view.chapter.summary;
```

```js
<span class="choice-cost">${choice.visibleCostLabel || (choice.costs ? `消耗：${ctx.GameCore.formatCosts(choice.costs)}` : '代价未明：这一步得先踏出去，回头再看余波。')}</span>
```

The first replacement removes the appended level-event explanation. The second replacement replaces the essay-like default cost line with a shorter in-world prompt.

- [ ] **Step 4: Re-run the focused E2E test and then the full story E2E file**

Run: `npx playwright test tests/e2e/story.spec.js --grep "摘要使用场景钩子"`

Expected: PASS for both new tests.

Run: `npx playwright test tests/e2e/story.spec.js`

Expected: PASS with the story-specific Playwright file fully green.

- [ ] **Step 5: Commit the story-panel copy alignment**

```bash
git add src/ui/renderers.js tests/e2e/story.spec.js
git commit -m "fix: align story panel copy with authored scene hooks"
```

### Task 4: Record The Narrative Contract Change And Run Full Regression

**Files:**
- Modify: `docs/narrative-decision-system/04-change-worklog.md`
- Test: `tests/story-smoke.js`
- Test: `tests/e2e/story.spec.js`

- [ ] **Step 1: Record the scope and boundaries in the narrative worklog**

Append this entry to `docs/narrative-decision-system/04-change-worklog.md`:

```md
## 2026-03-31 Narrative Repair Phase 1

- 目标：清掉晚期主线最重的作者总结腔，补回“归乡 / 认账 / 门前问心”链路里的活人对白。
- 涉及文件：`story-data.js`、`src/ui/renderers.js`、`tests/story-smoke.js`、`tests/e2e/story.spec.js`
- 保持不变：`storyProgress` 流程、`nextChapterId` 收束拓扑、存档结构、DOM 锚点
- 结论：本轮只修文本与呈现，不把“真分支拓扑”混进同一次回归
```

- [ ] **Step 2: Run the smoke suite**

Run: `npm run test:smoke`

Expected: PASS, including the final `story smoke passed`.

- [ ] **Step 3: Run the E2E suite**

Run: `npm run test:e2e`

Expected: PASS with the Playwright suite green.

- [ ] **Step 4: Run the full default test command**

Run: `npm test`

Expected: PASS because the project contract says `npm test` should serialize smoke and E2E together.

- [ ] **Step 5: Commit the docs and verification pass**

```bash
git add docs/narrative-decision-system/04-change-worklog.md
git commit -m "docs: record narrative repair phase one scope"
```
