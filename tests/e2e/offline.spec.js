const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame } = require('./helpers/harness');
const { createFreshScenario } = require('./helpers/saveFactory');

test('刷新后不再出现离线收益弹层，也不存在旧离线锚点', async ({ page }) => {
    const scenario = createFreshScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator('#offline-modal')).toHaveCount(0);
    await expect(page.locator('#offline-summary-text')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('#offline-modal')).toHaveCount(0);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('出门游历');
});
