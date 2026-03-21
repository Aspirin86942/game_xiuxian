const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave } = require('./helpers/harness');
const { createTrainingScenario } = require('./helpers/saveFactory');

test('闭关批次可切换，闭关后进入突破并在刷新后保留状态', async ({ page }) => {
    const scenario = createTrainingScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: 0,
    });

    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.initialState.realmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.initialState.cultivationText);
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.initialState.lingshi));

    await page.click(selectors.cultivation.batchButton('10'));
    await expect(page.locator(selectors.cultivation.trainCost)).toContainText('将消耗 2 枚灵石');

    await page.click(selectors.cultivation.mainButton);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.afterTraining.cultivationText);
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.afterTraining.lingshi));
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText(scenario.afterTraining.mainButtonText);

    await page.click(selectors.cultivation.mainButton);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.afterBreakthrough.realmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.afterBreakthrough.cultivationText);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('闭关修炼');

    let save = await readSave(page);
    expect(save.realmIndex).toBe(scenario.afterBreakthrough.realmIndex);
    expect(save.stageIndex).toBe(scenario.afterBreakthrough.stageIndex);

    await page.reload();
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.afterBreakthrough.realmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.afterBreakthrough.cultivationText);
    save = await readSave(page);
    expect(save.realmIndex).toBe(scenario.afterBreakthrough.realmIndex);
    expect(save.stageIndex).toBe(scenario.afterBreakthrough.stageIndex);
});
