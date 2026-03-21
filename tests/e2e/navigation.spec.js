const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, waitForModalHidden, waitForModalShown } = require('./helpers/harness');
const { createFreshScenario } = require('./helpers/saveFactory');

test('新档支持四页签切换与模态开关', async ({ page }) => {
    const scenario = createFreshScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.status.playerName)).toHaveText(scenario.expectedPlayerName);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedRealmLabel);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('吐纳聚气');

    await page.click(selectors.tabs.alchemy);
    await expect(page.locator(selectors.pages.alchemy)).toHaveClass(/active/);
    await expect(page.locator(selectors.alchemy.summary)).toBeVisible();
    await expect(page.locator(selectors.alchemy.list)).toBeVisible();

    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.pages.story)).toHaveClass(/active/);
    await expect(page.locator(selectors.story.title)).not.toHaveText('暂无新剧情');

    await page.click(selectors.tabs.adventure);
    await expect(page.locator(selectors.pages.adventure)).toHaveClass(/active/);
    await expect(page.locator(selectors.adventure.button)).toHaveText('出门游历');

    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    await page.click(selectors.inventory.closeButton);
    await waitForModalHidden(page, selectors.inventory.modal);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);
    await page.click(selectors.settings.closeButton);
    await waitForModalHidden(page, selectors.settings.modal);
});

