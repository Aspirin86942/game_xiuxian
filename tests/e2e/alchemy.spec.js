const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave, waitForModalShown } = require('./helpers/harness');
const { createAlchemyScenario, createCombatScenario } = require('./helpers/saveFactory');

test('丹炉页可炼制基础丹药并写回存档', async ({ page }) => {
    const scenario = createAlchemyScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await page.click(selectors.tabs.alchemy);
    await expect(page.locator(selectors.pages.alchemy)).toHaveClass(/active/);
    await expect(page.locator(selectors.alchemy.ruleText)).toContainText(scenario.expectedRuleTextFragment);

    await page.click(selectors.alchemy.craftButton(scenario.recipeId));

    const save = await readSave(page);
    expect(save.inventory).toEqual(scenario.expectedState.inventory);
});

test('战斗中不能切入丹炉页', async ({ page }) => {
    const scenario = createCombatScenario();
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
    });

    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: 0,
    });

    await expect(page.locator(selectors.cultivation.adventureButton)).toHaveText('出门游历');
    await page.click(selectors.cultivation.adventureButton);
    await waitForModalShown(page, selectors.combat.modal);

    await page.locator(selectors.tabs.alchemy).evaluate((button) => button.click());

    await expect.poll(() => dialogMessage).toContain('战斗中不可分心炼丹。');
    await expect(page.locator(selectors.pages.cultivation)).toHaveClass(/active/);
});
