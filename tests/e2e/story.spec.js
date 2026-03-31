const { test, expect } = require('@playwright/test');
const GameCore = require('../../game-core.js');
const StoryData = require('../../story-data.js');
const selectors = require('./helpers/selectors');
const { openGame, readSave } = require('./helpers/harness');
const {
    createBlockedMainChapterScenario,
    createShengxianlingChapterScenario,
    createStoryScenario,
    createVolumeTwoEntryScenario,
    createVolumeTwoCloseScenario,
    createVolumeThreeEntryScenario,
    createVolumeThreeExitScenario,
    createVolumeFourEntryScenario,
    createVolumeFourExitScenario,
    createVolumeFiveEntryScenario,
    createVolumeOneLedgerClosureScenario,
    createVolumeOneApothecaryClosureScenario,
    createTribulationEndingScenario,
} = require('./helpers/saveFactory');

const ADAPTED_VOLUME_LABELS = Object.freeze({
    volume_two_ascending_path: StoryData.VOLUME_DISPLAY_META.volume_two_ascending_path.displayLabel,
    volume_three_magic_invasion: StoryData.VOLUME_DISPLAY_META.volume_three_magic_invasion.displayLabel,
    volume_four_overseas: StoryData.VOLUME_DISPLAY_META.volume_four_overseas.displayLabel,
    volume_five_homecoming: StoryData.VOLUME_DISPLAY_META.volume_five_homecoming.displayLabel,
});

function formatAdaptedVolumeLabel(volumeId, order) {
    return `${ADAPTED_VOLUME_LABELS[volumeId]}·第 ${order} 章`;
}

function createQueuedStoryBadgeScenario() {
    const state = GameCore.createInitialState();
    state.ui.activeTab = 'cultivation';
    GameCore.ensureStoryCursor(state);
    state.unreadStory = true;

    const nextChapterState = GameCore.mergeSave(JSON.parse(GameCore.serializeState(state)));
    GameCore.skipStoryPlayback(nextChapterState);
    const choiceView = GameCore.getStoryView(nextChapterState);
    const selectedChoice = choiceView.choices.find((choice) => !choice.disabled) || choiceView.choices[0];
    GameCore.chooseStoryOption(nextChapterState, selectedChoice.id);

    return {
        serialized: GameCore.serializeState(state),
        choiceId: selectedChoice.id,
        expectedStoryProgress: nextChapterState.storyProgress,
    };
}

function createAvailableSideQuestScenario() {
    const state = GameCore.createInitialState();
    state.ui.activeTab = 'story';
    state.storyProgress = 8;
    state.flags.protectedMoHouse = true;
    GameCore.ensureStoryCursor(state);

    const visibleQuest = GameCore.getVisibleSideQuests(state).find((quest) => quest.id === 'old_medicine_ledger');
    const previewState = GameCore.mergeSave(JSON.parse(GameCore.serializeState(state)));
    GameCore.acceptSideQuest(previewState, 'old_medicine_ledger');
    GameCore.chooseSideQuestOption(previewState, 'old_medicine_ledger', 'return_ledgers');

    return {
        serialized: GameCore.serializeState(state),
        questId: 'old_medicine_ledger',
        title: visibleQuest.title,
        choiceId: 'return_ledgers',
        choiceText: visibleQuest.choices.find((choice) => choice.id === 'return_ledgers').text,
        completedSummary: previewState.sideQuests.old_medicine_ledger.lastResult.summary,
        expectedLingshi: previewState.inventory.lingshi,
        expectedRelation: previewState.npcRelations['墨彩环'],
    };
}

function createMissedSideQuestScenario() {
    const state = GameCore.createInitialState();
    state.ui.activeTab = 'story';
    state.storyProgress = 8;
    state.flags.protectedMoHouse = true;
    GameCore.getVisibleSideQuests(state);
    state.storyProgress = 11;
    GameCore.getVisibleSideQuests(state);
    GameCore.ensureStoryCursor(state);

    return {
        serialized: GameCore.serializeState(state),
        questId: 'old_medicine_ledger',
        title: '旧药账',
        expectedSummary: state.sideQuests.old_medicine_ledger.lastResult.summary,
        expectedDetail: state.sideQuests.old_medicine_ledger.lastResult.detail,
    };
}

async function advanceStoryUntilKeywordGroupsMatch(page, keywordGroups, maxSteps = 6) {
    for (let step = 0; step <= maxSteps; step += 1) {
        const titleText = await page.locator(selectors.story.title).textContent();
        const summaryText = await page.locator('#story-summary').textContent();
        const lineText = await page.locator(selectors.story.line).textContent();
        const pageText = [titleText, summaryText, lineText].filter(Boolean).join('\n');
        const matched = keywordGroups.every((group) => group.some((keyword) => pageText.includes(keyword)));
        if (matched) {
            return;
        }
        const continueButton = page.locator(selectors.story.continueButton);
        if (await continueButton.isDisabled()) {
            break;
        }
        await continueButton.click();
    }
    throw new Error(`剧情页未能在 ${maxSteps} 次翻页内命中关键词组：${JSON.stringify(keywordGroups)}`);
}

test('剧情页支持继续、跳至抉择和完成分支选择', async ({ page }) => {
    const scenario = createStoryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.story.line)).toHaveText(scenario.initialLine);
    await expect(page.locator(selectors.story.pressure)).toContainText(scenario.initialPressureText);
    await expect(page.locator(selectors.story.pressure)).not.toContainText(/\d/);
    await expect(page.locator(selectors.journey.npcs)).toBeVisible();
    await expect(page.locator(selectors.journey.clues)).toBeVisible();

    await page.click(selectors.story.continueButton);
    if (scenario.continuedLine) {
        await expect(page.locator(selectors.story.line)).toHaveText(scenario.continuedLine);
    }
    await expect(page.locator(selectors.story.progress)).toHaveText(scenario.continuedProgressText);

    await page.click(selectors.story.skipButton);
    await expect(page.locator(selectors.story.progress)).toContainText('抉择');
    const choiceLocator = page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`);
    await expect(choiceLocator).toBeVisible();
    await expect(choiceLocator).toContainText(scenario.expectedChoiceMeta.promiseLabel);
    await expect(choiceLocator).toContainText(scenario.expectedChoiceMeta.riskLabel);
    await expect(choiceLocator).toContainText(scenario.expectedChoiceMeta.visibleCostLabel);
    await expect(choiceLocator).not.toContainText('战意');
    await expect(choiceLocator).not.toContainText('劫煞');
    await expect(choiceLocator).not.toContainText(/\d+\s*(战意|劫煞)/);

    await choiceLocator.click();
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.pressure)).toContainText(scenario.expectedPressureText);
    await expect(page.locator(selectors.story.pressure)).not.toContainText(/\d/);
    await expect(page.locator(`${selectors.story.echoList} .echo-item`)).toHaveCount(1);
    await expect(page.locator(`${selectors.story.echoList} .echo-item strong`)).toHaveText(scenario.expectedImpact.title);
    await expect(page.locator(`${selectors.story.echoList} .echo-item p`)).toHaveText(scenario.expectedImpact.detail);
    await expect(page.locator(`${selectors.story.echoList} .echo-item .echo-meta`)).toHaveText(scenario.expectedImpact.meta);

    const save = await readSave(page);
    expect(save.chapterChoices['0']).toBe(scenario.choiceId);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
    expect(save.recentChoiceOutcome).not.toBeNull();
    expect(save.recentChoiceOutcome.choiceId).toBe(scenario.choiceId);
    expect(save.decisionHistory).toHaveLength(1);
    expect(save.pendingEchoes.length).toBeGreaterThan(0);
    expect(save.endingSeeds.length).toBeGreaterThan(0);
    expect(save.storyConsequences.pressureTier).toBe('安全');
    expect(save.storyConsequences).not.toHaveProperty('battleWillGain');
    expect(save.storyConsequences).not.toHaveProperty('tribulationGain');
});

test('主线待解锁时会明确提示太南小会与筑基门槛', async ({ page }) => {
    const scenario = createBlockedMainChapterScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText('前路未启');
    await expect(page.locator(selectors.story.line)).toContainText(scenario.expectedHint);
    await expect(page.locator(selectors.story.goal)).toContainText(scenario.expectedGoal);
});

test('太南小会竞拍升仙令后会正常入包并推进到下一章', async ({ page }) => {
    const scenario = createShengxianlingChapterScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await page.click(selectors.tabs.inventory);
    await expect(page.locator(selectors.inventory.list)).toContainText('升仙令');

    const save = await readSave(page);
    expect(save.inventory.shengxianling).toBe(scenario.expectedTokenCount);
    expect(save.flags.hasShengxianling).toBe(true);
    expect(save.storyProgress).toBe(11);
});

test('第二卷入口会渲染新卷标签并推进到凡俗旧债未清', async ({ page }) => {
    const scenario = createVolumeTwoEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_two_ascending_path', 1));
    await expect(page.locator(selectors.story.title)).toContainText('离开旧地');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_two_ascending_path', 2));
    await expect(page.locator(selectors.story.title)).toContainText('凡俗旧债未清');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第二卷入口摘要使用场景钩子而不是总论句', async ({ page }) => {
    const scenario = createVolumeTwoEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator('#story-summary')).toHaveText('越国边境风硬，回头路也硬。你还没走远，旧地的人与事却已经开始在背后追。');
    await expect(page.locator('#story-summary')).not.toContainText('真正离开旧地，不是走远');
});

test('第二卷卷末收束后会立刻交给血色禁地入口', async ({ page }) => {
    const scenario = createVolumeTwoCloseScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_two_ascending_path', 8));
    await expect(page.locator(selectors.story.title)).toContainText('此卷尽处');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).not.toContainText(formatAdaptedVolumeLabel('volume_two_ascending_path', 8));
    await expect(page.locator(selectors.story.title)).toContainText('血色禁地');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第三卷入口会渲染新卷标签并推进到情债与筑基', async ({ page }) => {
    const scenario = createVolumeThreeEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_three_magic_invasion', 1));
    await expect(page.locator(selectors.story.title)).toContainText('血色禁地');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_three_magic_invasion', 2));
    await expect(page.locator(selectors.story.title)).toContainText('情债与筑基');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第三卷卷末收束后会离开第三卷并进入后续入口', async ({ page }) => {
    const scenario = createVolumeThreeExitScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_three_magic_invasion', 8));
    await expect(page.locator(selectors.story.title)).toContainText('再别天南');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).not.toContainText(formatAdaptedVolumeLabel('volume_three_magic_invasion', 8));
    await expect(page.locator(selectors.story.title)).toContainText('初入星海');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第四卷入口会渲染新卷标签并推进到海外立足', async ({ page }) => {
    const scenario = createVolumeFourEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_four_overseas', 1));
    await expect(page.locator(selectors.story.title)).toContainText('初入星海');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_four_overseas', 2));
    await expect(page.locator(selectors.story.title)).toContainText('海外立足');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第四卷卷末收束后会离开第四卷并进入重返天南', async ({ page }) => {
    const scenario = createVolumeFourExitScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_four_overseas', 8));
    await expect(page.locator(selectors.story.title)).toContainText('星海余波');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).not.toContainText(formatAdaptedVolumeLabel('volume_four_overseas', 8));
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_five_homecoming', 1));
    await expect(page.locator(selectors.story.title)).toContainText('重返天南');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第五卷第 1 章选择后会进入旧账与旧名', async ({ page }) => {
    const scenario = createVolumeFiveEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_five_homecoming', 1));
    await expect(page.locator(selectors.story.title)).toContainText('重返天南');

    const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
    await expect(choiceLocator).toContainText(scenario.choiceText);
    await choiceLocator.click();

    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedNextTitle);
    await expect(page.locator(selectors.story.title)).toContainText(formatAdaptedVolumeLabel('volume_five_homecoming', 2));
    await expect(page.locator(selectors.story.title)).toContainText('旧账与旧名');

    const save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
});

test('第五卷入口摘要使用场景钩子而不是怀旧总论', async ({ page }) => {
    const scenario = createVolumeFiveEntryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator('#story-summary')).toHaveText('天南风物仍旧，认你的人却已经不是当年那一批。');
    await expect(page.locator('#story-summary')).not.toContainText('真正涌上来的不是怀旧');
});

test('正式支线可在同行回响区接取并卡内结算', async ({ page }) => {
    const scenario = createAvailableSideQuestScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.journey.sideQuestCard(scenario.questId))).toContainText(scenario.title);
    await expect(page.locator(selectors.journey.sideQuestStatus(scenario.questId))).toHaveText('可应旧事');
    await expect(page.locator(selectors.journey.sideQuestAccept(scenario.questId))).toHaveText('应下这桩旧事');

    await page.click(selectors.journey.sideQuestAccept(scenario.questId));
    await expect(page.locator(selectors.journey.sideQuestStatus(scenario.questId))).toHaveText('进行中');

    const choiceButton = page.locator(selectors.journey.sideQuestChoice(scenario.questId, scenario.choiceId));
    await expect(choiceButton).toBeVisible();
    await expect(choiceButton).toContainText(scenario.choiceText);
    await page.click(selectors.journey.sideQuestChoice(scenario.questId, scenario.choiceId));

    await expect(page.locator(selectors.journey.sideQuestStatus(scenario.questId))).toHaveText('已了结');
    await expect(page.locator(selectors.journey.sideQuestCard(scenario.questId))).toContainText(scenario.completedSummary);
    await expect(page.locator(selectors.journey.sideQuestCard(scenario.questId))).toContainText('这一桩已结算清楚');

    const save = await readSave(page);
    expect(save.sideQuests.old_medicine_ledger.state).toBe('completed');
    expect(save.sideQuests.old_medicine_ledger.selectedChoiceId).toBe(scenario.choiceId);
    expect(save.inventory.lingshi).toBe(scenario.expectedLingshi);
    expect(save.npcRelations['墨彩环']).toBe(scenario.expectedRelation);
});

test('错过窗口的正式支线会在同行回响区显示错过结果', async ({ page }) => {
    const scenario = createMissedSideQuestScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.journey.sideQuestCard(scenario.questId))).toContainText(scenario.title);
    await expect(page.locator(selectors.journey.sideQuestStatus(scenario.questId))).toHaveText('已错过');
    await expect(page.locator(selectors.journey.sideQuestCard(scenario.questId))).toContainText(scenario.expectedSummary);
    await expect(page.locator(selectors.journey.sideQuestCard(scenario.questId))).toContainText(scenario.expectedDetail);
    await expect(page.locator(selectors.journey.sideQuestAccept(scenario.questId))).toHaveCount(0);

    const save = await readSave(page);
    expect(save.sideQuests.old_medicine_ledger.state).toBe('missed');
    expect(save.sideQuests.old_medicine_ledger.lastResult.outcome).toBe('missed');
});

test('旧药账完成后会在第一卷卷末主线出现收口解释', async ({ page }) => {
    const scenario = createVolumeOneLedgerClosureScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await advanceStoryUntilKeywordGroupsMatch(page, scenario.expectedKeywordGroups, 6);
    await expect(page.locator(selectors.journey.sideQuestStatus(scenario.questId))).not.toHaveText('进行中');

    const save = await readSave(page);
    expect(save.sideQuests.old_medicine_ledger.state).toBe('completed');
    expect(save.sideQuests.old_medicine_ledger.selectedChoiceId).toBe('return_ledgers');
});

test('药童残影完成后会在第一卷卷末主线解释曲魂旧案', async ({ page }) => {
    const scenario = createVolumeOneApothecaryClosureScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    await advanceStoryUntilKeywordGroupsMatch(page, scenario.expectedKeywordGroups, 6);
    await expect(page.locator(selectors.journey.sideQuestStatus(scenario.questId))).not.toHaveText('进行中');

    const save = await readSave(page);
    expect(save.sideQuests.apothecary_boy_echo.state).toBe('completed');
    expect(save.sideQuests.apothecary_boy_echo.selectedChoiceId).toBe('trace_the_voice');
});

test('剧情新徽标在进入剧情页后清除，且剧情页内衔接下一章时不残留', async ({ page }) => {
    const scenario = createQueuedStoryBadgeScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.nav.storyBadge)).toBeVisible();

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.nav.storyBadge)).toBeHidden();

    let save = await readSave(page);
    expect(save.unreadStory).toBe(false);

    await page.click(selectors.story.skipButton);
    await page.click(selectors.story.choice(scenario.choiceId));

    await expect(page.locator(selectors.nav.storyBadge)).toBeHidden();

    save = await readSave(page);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
    expect(save.unreadStory).toBe(false);
});

test('劫煞积满时进入走火入魔结局并可重开', async ({ page }) => {
    const scenario = createTribulationEndingScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    const choiceLocator = page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`);
    await expect(choiceLocator).toBeVisible();
    await expect(choiceLocator).toContainText(scenario.expectedChoiceMeta.promiseLabel);
    await expect(choiceLocator).toContainText(scenario.expectedChoiceMeta.riskLabel);
    await expect(choiceLocator).toContainText(scenario.expectedChoiceMeta.visibleCostLabel);
    await expect(choiceLocator).not.toContainText('战意');
    await expect(choiceLocator).not.toContainText('劫煞');
    await expect(choiceLocator).not.toContainText(/\d+\s*(战意|劫煞)/);

    await choiceLocator.click();
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedEndingTitle);
    await expect(page.locator(selectors.story.pressure)).toContainText(scenario.expectedPressureText);
    await expect(page.locator(selectors.story.pressure)).not.toContainText(/\d/);
    await expect(page.locator(`${selectors.story.echoList} .echo-item`)).toHaveCount(1);
    await expect(page.locator(`${selectors.story.echoList} .echo-item strong`)).toHaveText(scenario.expectedImpact.title);
    await expect(page.locator(`${selectors.story.echoList} .echo-item p`)).toHaveText(scenario.expectedImpact.detail);
    await expect(page.locator(`${selectors.story.echoList} .echo-item .echo-meta`)).toHaveText(scenario.expectedImpact.meta);
    await expect(page.locator(selectors.story.endingChain)).toBeVisible();
    await expect(page.locator(selectors.story.endingChain)).toContainText('关键承诺链');
    await expect(page.locator(selectors.story.endingChain)).toContainText(scenario.expectedRecapText);

    let save = await readSave(page);
    expect(save.ending.id).toBe('zouhuo_rumo');
    expect(save.storyConsequences.tribulation).toBe(scenario.expectedTribulationValue);
    expect(save.storyConsequences.pressureTier).toBe('失控');
    expect(save.ending.recapLines.length).toBeGreaterThanOrEqual(2);
    expect(save.ending.recapLines.length).toBeLessThanOrEqual(4);

    await page.click(`${selectors.story.choices} [data-ending-action="reset"]`);
    await page.click(selectors.settings.confirmResetButton);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedResetRealmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedResetCultivationText);

    save = await readSave(page);
    expect(save.ending).toBeNull();
    expect(save.storyConsequences.pressureTier).toBe('安全');
    expect(save.storyConsequences.tribulation).toBe(0);
    expect(save.recentChoiceOutcome).toBeNull();
    expect(save.decisionHistory).toEqual([]);
    expect(save.pendingEchoes).toEqual([]);
    expect(save.endingSeeds).toEqual([]);
});
