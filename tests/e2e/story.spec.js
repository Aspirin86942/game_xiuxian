const { test, expect } = require('@playwright/test');
const GameCore = require('../../game-core.js');
const selectors = require('./helpers/selectors');
const { openGame, readSave } = require('./helpers/harness');
const { createStoryScenario, createTribulationEndingScenario } = require('./helpers/saveFactory');

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

test('剧情新徽标在进入剧情页后清除，且剧情页内衔接下一章时不残留', async ({ page }) => {
    const scenario = createQueuedStoryBadgeScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.nav.storyBadge)).toHaveClass(/show/);

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.nav.storyBadge)).not.toHaveClass(/show/);

    let save = await readSave(page);
    expect(save.unreadStory).toBe(false);

    await page.click(selectors.story.skipButton);
    await page.click(selectors.story.choice(scenario.choiceId));

    await expect(page.locator(selectors.nav.storyBadge)).not.toHaveClass(/show/);

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
    expect(save.ending.id).toBe('zouhuorumo');
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
