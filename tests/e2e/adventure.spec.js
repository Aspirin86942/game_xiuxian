const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave, waitForModalHidden, waitForModalShown } = require('./helpers/harness');
const { createCombatScenario, createResourceExpeditionScenario } = require('./helpers/saveFactory');

test('游历资源事件只增加灵石，不直接增加修为', async ({ page }) => {
    const scenario = createResourceExpeditionScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: 0.5,
    });

    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('闭关修炼');
    await expect(page.locator(selectors.cultivation.mainButton)).toBeDisabled();
    await expect(page.locator(selectors.cultivation.adventureButton)).toHaveText('出门游历');
    await page.click(selectors.cultivation.adventureButton);

    await expect(page.locator(selectors.journey.preview)).toContainText('最近游历');
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.expectedLingshi));
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedCultivationText);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('闭关修炼');
    await expect(page.locator(selectors.cultivation.mainButton)).not.toBeDisabled();

    const save = await readSave(page);
    expect(save.inventory.lingshi).toBe(scenario.expectedLingshi);
    expect(`${save.cultivation}/${save.maxCultivation}`).toBe(scenario.expectedCultivationText);
});

test('游历战斗事件会弹出战斗模态并把结算写回存档', async ({ page }) => {
    const scenario = createCombatScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomSequence: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('闭关修炼');
    await expect(page.locator(selectors.cultivation.mainButton)).toBeDisabled();
    await expect(page.locator(selectors.cultivation.adventureButton)).toHaveText('出门游历');
    await page.click(selectors.cultivation.adventureButton);

    await waitForModalShown(page, selectors.combat.modal);
    await expect(page.locator(selectors.combat.title)).toContainText(scenario.expectedMonsterName);
    await expect(page.locator(selectors.combat.log)).toContainText('遭遇');

    await waitForModalHidden(page, selectors.combat.modal, 15_000);
    await expect(page.locator(selectors.journey.preview)).toContainText('最近游历');

    const save = await readSave(page);
    expect(save.cultivation).toBe(scenario.expectedState.cultivation);
    expect(save.inventory.lingshi || 0).toBe(scenario.expectedState.lingshi);
    expect(save.playerStats.hp).toBe(scenario.expectedState.hp);
});
