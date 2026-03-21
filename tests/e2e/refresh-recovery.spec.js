const { test, expect } = require('@playwright/test');
const GameCore = require('../../game-core.js');
const selectors = require('./helpers/selectors');
const {
    advanceClock,
    openGame,
    reloadAndReadSave,
    snapshotSave,
    waitForModalShown,
} = require('./helpers/harness');
const {
    createCombatScenario,
    createCustomSaveScenario,
    createStoryScenario,
} = require('./helpers/saveFactory');

const FIXED_NOW = 1_710_000_000_000;

function createRecoveryRefreshScenario() {
    const state = GameCore.createInitialState();
    GameCore.setRealmScore(state, 8);
    state.ui.activeTab = 'cultivation';
    state.playerStats.hp = 1;
    state.recovery.lastCheckedAt = FIXED_NOW;
    return {
        serialized: GameCore.serializeState(state),
        initialHp: state.playerStats.hp,
    };
}

test('空闲态刷新只结算一次自然回血', async ({ page }) => {
    const scenario = createRecoveryRefreshScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: FIXED_NOW,
    });

    let save = await snapshotSave(page);
    expect(save.playerStats.hp).toBe(scenario.initialHp);

    await advanceClock(page, 30_000);
    save = await reloadAndReadSave(page);
    expect(save.playerStats.hp).toBeGreaterThan(scenario.initialHp);
    expect(save.recovery.lastCheckedAt).toBe(FIXED_NOW + 30_000);

    const recoveredSnapshot = await snapshotSave(page);
    const secondReloadSave = await reloadAndReadSave(page);
    expect(secondReloadSave).toEqual(recoveredSnapshot);
});

test('背包和设置打开时刷新后不会残留模态，也不会丢失状态', async ({ page }) => {
    const scenario = createCustomSaveScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: FIXED_NOW,
    });

    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    let snapshot = await snapshotSave(page);
    let reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave).toEqual(snapshot);
    await expect(page.locator(selectors.inventory.modal)).not.toHaveClass(/show/);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);
    snapshot = await snapshotSave(page);
    reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave).toEqual(snapshot);
    await expect(page.locator(selectors.settings.modal)).not.toHaveClass(/show/);
});

test('剧情播放前后刷新不会重复推进，也不会重复写入抉择结果', async ({ page }) => {
    const scenario = createStoryScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: FIXED_NOW,
    });

    await page.click(selectors.tabs.story);
    let snapshot = await snapshotSave(page);
    let reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave.storyProgress).toBe(snapshot.storyProgress);
    expect(reloadedSave.chapterChoices).toEqual(snapshot.chapterChoices);
    await expect(page.locator(selectors.story.line)).toHaveText(scenario.initialLine);

    await page.click(selectors.story.skipButton);
    await page.click(selectors.story.choice(scenario.choiceId));
    snapshot = await snapshotSave(page);
    reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave).toEqual(snapshot);
    expect(reloadedSave.storyProgress).toBe(scenario.expectedStoryProgress);
    expect(reloadedSave.chapterChoices['0']).toBe(scenario.choiceId);
});

test('战斗进行中刷新不会残留战斗模态，也不会重复结算', async ({ page }) => {
    const scenario = createCombatScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomSequence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        nowMs: FIXED_NOW,
    });

    await page.click(selectors.cultivation.mainButton);
    await waitForModalShown(page, selectors.combat.modal);
    const snapshot = await snapshotSave(page);
    const reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave).toEqual(snapshot);
    await expect(page.locator(selectors.combat.modal)).not.toHaveClass(/show/);
});

test('战斗结算后刷新不会重复奖励，也不会残留战斗模态', async ({ page }) => {
    const scenario = createCombatScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomSequence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        nowMs: FIXED_NOW,
    });

    await page.click(selectors.cultivation.mainButton);
    await waitForModalShown(page, selectors.combat.modal);
    await expect(page.locator(selectors.combat.modal)).not.toHaveClass(/show/, { timeout: 15_000 });

    const snapshot = await snapshotSave(page);
    const reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave).toEqual(snapshot);
    await expect(page.locator(selectors.combat.modal)).not.toHaveClass(/show/);
});
