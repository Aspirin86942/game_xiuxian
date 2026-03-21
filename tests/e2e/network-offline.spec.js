const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const {
    openGame,
    readSave,
    reloadAndReadSave,
    snapshotSave,
    waitForModalShown,
} = require('./helpers/harness');
const { createJourneyScenario } = require('./helpers/saveFactory');

test('页面已加载后切离线，仍可执行核心循环并在恢复网络后刷新恢复', async ({ page }) => {
    const scenario = createJourneyScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: scenario.resourceRandomValue,
    });

    await page.context().setOffline(true);
    await page.click(selectors.cultivation.adventureButton);
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.expectedAfterResource.lingshi));
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterResource.cultivationText);

    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    await page.click(selectors.inventory.useButton(scenario.itemId));
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterItemUse.cultivationText);

    const offlineSave = await snapshotSave(page);
    expect(offlineSave.inventory[scenario.itemId] || 0).toBe(scenario.expectedAfterItemUse.inventoryCount);
    expect(offlineSave.inventory.lingshi || 0).toBe(scenario.expectedAfterResource.lingshi);

    await page.context().setOffline(false);
    const reloadedSave = await reloadAndReadSave(page);
    expect(reloadedSave).toEqual(offlineSave);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterItemUse.cultivationText);
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.expectedAfterResource.lingshi));

    const restoredSave = await readSave(page);
    expect(restoredSave).toEqual(offlineSave);
});
