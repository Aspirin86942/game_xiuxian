const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const {
    openGame,
    waitForModalHidden,
    waitForModalShown,
} = require('./helpers/harness');
const { createLongChoiceScenario } = require('./helpers/saveFactory');

const VIEWPORTS = [
    { name: '375x667', width: 375, height: 667 },
    { name: '390x844', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
    test.describe(`移动端可操作性 ${viewport.name}`, () => {
        test.use({
            viewport: { width: viewport.width, height: viewport.height },
            deviceScaleFactor: 2,
            hasTouch: true,
            isMobile: true,
        });

        test('首屏 CTA、剧情选项、底部页签与模态关闭按钮在移动端可达', async ({ page }) => {
            const scenario = createLongChoiceScenario();
            await openGame(page, { serializedSave: scenario.serialized });

            await expect(page.locator(selectors.nav.tabList)).toBeVisible();
            await expect(page.locator(selectors.nav.tab('story'))).toBeVisible();
            await expect(page.locator(selectors.nav.tab('inventory'))).toBeVisible();
            await expect(page.locator(selectors.nav.tab('settings'))).toBeVisible();

            await page.click(selectors.nav.tab('cultivation'));
            await expect(page.locator(selectors.cultivation.mainButton)).toBeVisible();
            await expect(page.locator(selectors.cultivation.adventureButton)).toBeVisible();
            await page.locator(selectors.cultivation.mainButton).click({ trial: true });
            await page.locator(selectors.cultivation.adventureButton).click({ trial: true });

            await page.click(selectors.nav.tab('story'));
            await expect(page.locator(selectors.story.title)).toHaveText(scenario.expectedTitle);
            await expect(page.locator(selectors.story.choiceButtons)).toHaveCount(scenario.expectedChoiceCount);

            const choiceLocator = page.locator(selectors.story.choice(scenario.choiceId));
            await expect(choiceLocator).toBeVisible();
            const choiceBox = await choiceLocator.boundingBox();
            expect(choiceBox).not.toBeNull();
            expect(choiceBox.y).toBeLessThan(viewport.height);
            await choiceLocator.click({ trial: true });

            await page.click(selectors.nav.tab('inventory'));
            await waitForModalShown(page, selectors.inventory.modal);
            await expect(page.locator(selectors.modal.close('inventory-modal'))).toBeVisible();
            const inventoryMetrics = await page.locator(selectors.modal.body('inventory-modal')).evaluate((node) => ({
                scrollHeight: node.scrollHeight,
                clientHeight: node.clientHeight,
            }));
            expect(inventoryMetrics.scrollHeight).toBeGreaterThan(inventoryMetrics.clientHeight);
            const scrolledTop = await page.locator(selectors.modal.body('inventory-modal')).evaluate((node) => {
                node.scrollTop = 120;
                return node.scrollTop;
            });
            expect(scrolledTop).toBeGreaterThan(0);
            await page.click(selectors.modal.close('inventory-modal'));
            await waitForModalHidden(page, selectors.inventory.modal);

            await page.click(selectors.nav.tab('settings'));
            await waitForModalShown(page, selectors.settings.modal);
            await expect(page.locator(selectors.modal.close('settings-modal'))).toBeVisible();
            await page.click(selectors.modal.close('settings-modal'));
            await waitForModalHidden(page, selectors.settings.modal);
        });
    });
}
