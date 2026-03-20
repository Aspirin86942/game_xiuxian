const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave } = require('./helpers/harness');
const { createStoryScenario, createTribulationEndingScenario } = require('./helpers/saveFactory');

test('剧情页支持继续、跳至抉择和完成分支选择', async ({ page }) => {
    const scenario = createStoryScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.story.line)).toHaveText(scenario.initialLine);

    await page.click(selectors.story.continueButton);
    if (scenario.continuedLine) {
        await expect(page.locator(selectors.story.line)).toHaveText(scenario.continuedLine);
    }
    await expect(page.locator(selectors.story.progress)).toHaveText(scenario.continuedProgressText);

    await page.click(selectors.story.skipButton);
    await expect(page.locator(selectors.story.progress)).toContainText('抉择');
    await expect(page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`)).toBeVisible();
    await expect(page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`)).not.toContainText('战意');
    await expect(page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`)).not.toContainText('劫煞');

    await page.click(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
    if (scenario.expectedEchoTitle) {
        await expect(page.locator(selectors.story.echoList)).toContainText(scenario.expectedEchoTitle);
    }

    const save = await readSave(page);
    expect(save.chapterChoices['0']).toBe(scenario.choiceId);
    expect(save.storyProgress).toBe(scenario.expectedStoryProgress);
    expect(save.recentChoiceOutcome).not.toBeNull();
    expect(save.recentChoiceOutcome.choiceId).toBe(scenario.choiceId);
});

test('劫煞积满时进入走火入魔结局并可重开', async ({ page }) => {
    const scenario = createTribulationEndingScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.story);
    await expect(page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`)).toBeVisible();
    await expect(page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`)).not.toContainText('战意');
    await expect(page.locator(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`)).not.toContainText('劫煞');

    await page.click(`${selectors.story.choices} [data-choice-id="${scenario.choiceId}"]`);
    await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedEndingTitle);
    await expect(page.locator(selectors.story.echoList)).toContainText('抉择余波');

    let save = await readSave(page);
    expect(save.ending.id).toBe('zouhuorumo');
    expect(save.storyConsequences.tribulation).toBe(42);

    await page.click(`${selectors.story.choices} [data-ending-action="reset"]`);
    await page.click(selectors.settings.confirmResetButton);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedResetRealmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedResetCultivationText);

    save = await readSave(page);
    expect(save.ending).toBeNull();
    expect(save.storyConsequences).toEqual({ battleWill: 0, tribulation: 0 });
    expect(save.recentChoiceOutcome).toBeNull();
});
