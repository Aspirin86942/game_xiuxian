const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave } = require('./helpers/harness');
const { createBreakthroughScenario } = require('./helpers/saveFactory');

test('近满修为种子档可突破并在刷新后保留状态', async ({ page }) => {
    const scenario = createBreakthroughScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: 0.01,
    });

    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.initialRealmLabel);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('渡劫突破');

    await page.click(selectors.cultivation.mainButton);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedRealmLabel);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('吐纳聚气');

    let save = await readSave(page);
    expect(save.realmIndex).toBe(scenario.expectedState.realmIndex);
    expect(save.stageIndex).toBe(scenario.expectedState.stageIndex);
    expect(save.cultivation).toBe(scenario.expectedState.cultivation);

    await page.reload();
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedRealmLabel);
    save = await readSave(page);
    expect(save.realmIndex).toBe(scenario.expectedState.realmIndex);
    expect(save.stageIndex).toBe(scenario.expectedState.stageIndex);
});

