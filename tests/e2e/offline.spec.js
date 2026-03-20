const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave, waitForModalHidden, waitForModalShown } = require('./helpers/harness');
const { createOfflineSettlementScenario } = require('./helpers/saveFactory');

test('自动吐纳开启时，重新进入会结算离线修为且只弹一次', async ({ page }) => {
    const scenario = createOfflineSettlementScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: scenario.nowMs,
    });

    await waitForModalShown(page, selectors.offline.modal);
    await expect(page.locator(selectors.offline.duration)).toHaveText(scenario.expectedState.durationText);
    await expect(page.locator(selectors.offline.gain)).toHaveText(`修为 +${scenario.expectedState.gain}`);
    await expect(page.locator(selectors.offline.current)).toHaveText(scenario.expectedState.cultivationText);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedState.cultivationText);
    await expect(page.locator(selectors.cultivation.offlineSummary)).toHaveText(scenario.expectedState.offlineSummaryText);

    let save = await readSave(page);
    expect(save.cultivation).toBe(scenario.expectedState.cultivation);
    expect(save.offlineTraining.lastGain).toBe(scenario.expectedState.gain);
    expect(save.offlineTraining.wasCapped).toBe(false);

    await page.click(selectors.offline.closeButton);
    await waitForModalHidden(page, selectors.offline.modal);

    await page.reload();
    await expect(page.locator(selectors.offline.modal)).not.toHaveClass(/show/);
    save = await readSave(page);
    expect(save.offlineTraining.lastGain).toBe(scenario.expectedState.gain);
});

test('自动吐纳未开启时，不结算离线收益也不弹层', async ({ page }) => {
    const scenario = createOfflineSettlementScenario({
        autoCultivate: false,
    });
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: scenario.nowMs,
    });

    await expect(page.locator(selectors.offline.modal)).not.toHaveClass(/show/);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.initialState.cultivationText);
    await expect(page.locator(selectors.cultivation.offlineSummary)).toHaveText(scenario.expectedState.offlineSummaryText);

    const save = await readSave(page);
    expect(save.cultivation).toBe(scenario.initialState.cultivation);
    expect(save.offlineTraining.lastGain).toBe(0);
});

test('离线超过八小时会按封顶时长结算并显示提示', async ({ page }) => {
    const scenario = createOfflineSettlementScenario({
        offlineMs: 12 * 60 * 60 * 1000,
        realmScore: 14,
        cultivation: 1000,
    });
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: scenario.nowMs,
    });

    await waitForModalShown(page, selectors.offline.modal);
    await expect(page.locator(selectors.offline.duration)).toHaveText(scenario.expectedState.durationText);
    await expect(page.locator(selectors.offline.gain)).toHaveText(`修为 +${scenario.expectedState.gain}`);
    await expect(page.locator(selectors.cultivation.offlineSummary)).toHaveText(scenario.expectedState.offlineSummaryText);

    const save = await readSave(page);
    expect(save.offlineTraining.wasCapped).toBe(true);
    expect(save.offlineTraining.lastEffectiveDurationMs).toBe(8 * 60 * 60 * 1000);
});

test('离线收益补满修为时不会自动突破或溢出', async ({ page }) => {
    const scenario = createOfflineSettlementScenario({
        realmScore: 11,
        cultivation: 17_900,
        offlineMs: 2 * 60 * 60 * 1000,
    });
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: scenario.nowMs,
    });

    await waitForModalShown(page, selectors.offline.modal);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedState.realmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedState.cultivationText);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText('渡劫突破');

    const save = await readSave(page);
    expect(save.cultivation).toBe(scenario.expectedState.maxCultivation);
    expect(save.realmIndex).toBe(scenario.expectedState.realmIndex);
    expect(save.stageIndex).toBe(scenario.expectedState.stageIndex);
});
