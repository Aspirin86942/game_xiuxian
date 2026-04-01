const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, waitForModalHidden, waitForModalShown } = require('./helpers/harness');
const { createFreshScenario } = require('./helpers/saveFactory');

test('新档支持修行/丹炉/剧情切换、模态开关，且不再存在独立游历页签', async ({ page }) => {
    const scenario = createFreshScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.status.playerName)).toHaveText(scenario.expectedPlayerName);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedRealmLabel);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('闭关修炼');
    await expect(page.locator(selectors.cultivation.mainButton)).toBeDisabled();
    await expect(page.locator(selectors.cultivation.adventureButton)).toHaveText('出门游历');
    await expect(page.locator(selectors.status.lingshi)).toBeVisible();
    await expect(page.locator('[data-tab="adventure"]')).toHaveCount(0);
    await expect(page.locator('[data-page="adventure"]')).toHaveCount(0);

    await page.click(selectors.tabs.alchemy);
    await expect(page.locator(selectors.pages.alchemy)).toHaveClass(/active/);
    await expect(page.locator(selectors.alchemy.summary)).toBeVisible();
    await expect(page.locator(selectors.alchemy.list)).toBeVisible();

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).not.toHaveText('前路未启');
    await expect(page.locator(selectors.journey.npcs)).toBeVisible();
    await expect(page.locator(selectors.journey.commissions)).toBeVisible();

    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    await page.click(selectors.inventory.closeButton);
    await waitForModalHidden(page, selectors.inventory.modal);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);
    await expect(page.locator(selectors.settings.saveModeNote)).toContainText('此地只留本机存档');
    await page.click(selectors.settings.closeButton);
    await waitForModalHidden(page, selectors.settings.modal);
});
