const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave, waitForModalShown } = require('./helpers/harness');
const { createConsumableScenario, createHighTierBreakthroughScenario } = require('./helpers/saveFactory');

test('背包可使用丹药并同步更新主界面与存档', async ({ page }) => {
    const scenario = createConsumableScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    await expect(page.locator(selectors.inventory.list)).toContainText('聚气丹');

    await page.click(selectors.inventory.useButton(scenario.itemId));
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedCultivationText);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('渡劫突破');
    await expect(page.locator(selectors.cultivation.adventureButton)).toHaveText('出门游历');
    await expect(page.locator(selectors.cultivation.adventureButton)).not.toBeDisabled();

    const save = await readSave(page);
    expect(save.inventory.juqidan || 0).toBe(scenario.expectedInventoryCount);
});

test('高阶突破丹在低境界时会被阻断', async ({ page }) => {
    const scenario = createHighTierBreakthroughScenario();
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
    });

    await openGame(page, { serializedSave: scenario.serialized });
    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    await page.click(selectors.inventory.useButton(scenario.itemId));

    await expect.poll(() => dialogMessage).toContain(scenario.expectedError);
    const save = await readSave(page);
    expect(save.inventory.huashendan || 0).toBe(scenario.expectedInventoryCount);
});
