const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave, waitForModalHidden, waitForModalShown } = require('./helpers/harness');
const { createCombatScenario } = require('./helpers/saveFactory');

test('游历会进入自动战斗并把结算写回状态', async ({ page }) => {
    const scenario = createCombatScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: 0,
    });

    await page.click(selectors.tabs.adventure);
    await page.click(selectors.adventure.button);

    await waitForModalShown(page, selectors.combat.modal);
    await expect(page.locator(selectors.combat.title)).toContainText(scenario.expectedMonsterName);
    await expect(page.locator(selectors.combat.log)).toContainText('遭遇');
    await expect(page.locator(selectors.combat.log)).toContainText('第 1 回合');

    await waitForModalHidden(page, selectors.combat.modal, 15_000);
    await expect(page.locator(selectors.adventure.preview)).toContainText('游历会自动战斗');

    const save = await readSave(page);
    expect(save.cultivation).toBe(scenario.expectedState.cultivation);
    expect(save.playerStats.hp).toBe(scenario.expectedState.playerHp);
    expect(save.inventory).toEqual(scenario.expectedState.inventory);
});

