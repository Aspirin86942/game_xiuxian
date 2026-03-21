const fs = require('fs');

const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const { openGame, readSave, waitForModalShown } = require('./helpers/harness');
const { createCustomSaveScenario, createLegacySaveScenario } = require('./helpers/saveFactory');

test('设置开关在刷新后保留', async ({ page }) => {
    await openGame(page);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);

    await page.uncheck(selectors.settings.audioToggle);
    await page.uncheck(selectors.settings.musicToggle);

    await page.click(selectors.settings.closeButton);
    await page.reload();

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);
    await expect(page.locator(selectors.settings.audioToggle)).not.toBeChecked();
    await expect(page.locator(selectors.settings.musicToggle)).not.toBeChecked();

    const save = await readSave(page);
    expect(save.settings.audioEnabled).toBe(false);
    expect(save.settings.musicEnabled).toBe(false);
});

test('存档可导出、重开并重新导入恢复', async ({ page }, testInfo) => {
    const scenario = createCustomSaveScenario();
    await openGame(page, { serializedSave: scenario.serialized });

    await expect(page.locator(selectors.status.playerName)).toHaveText(scenario.expectedState.playerName);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedState.realmLabel);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);

    const downloadPath = testInfo.outputPath('exported-save.json');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click(selectors.settings.exportButton),
    ]);
    await download.saveAs(downloadPath);

    const exported = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    expect(exported.version).toBe(5);
    expect(exported.playerName).toBe(scenario.expectedState.playerName);
    expect(exported.inventory.lingshi).toBe(scenario.expectedState.lingshi);

    await page.click(selectors.settings.resetButton);
    await page.click(selectors.settings.confirmResetButton);
    await expect(page.locator(selectors.status.playerName)).toHaveText('无名散修');
    await expect(page.locator(selectors.status.realm)).toHaveText('炼气·初期');

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click(selectors.settings.importButton),
    ]);
    await fileChooser.setFiles(downloadPath);

    await expect(page.locator(selectors.status.playerName)).toHaveText(scenario.expectedState.playerName);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedState.realmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedState.cultivationText);

    const save = await readSave(page);
    expect(save.playerName).toBe(scenario.expectedState.playerName);
    expect(save.inventory.lingshi).toBe(scenario.expectedState.lingshi);
    expect(save.settings.audioEnabled).toBe(scenario.expectedState.audioEnabled);
    expect(save.settings.musicEnabled).toBe(scenario.expectedState.musicEnabled);
});

test('导入旧版存档时阻断并提示，且不污染当前进度', async ({ page }, testInfo) => {
    const scenario = createCustomSaveScenario();
    const legacyScenario = createLegacySaveScenario();
    const legacyPath = testInfo.outputPath('legacy-save-v4.json');
    fs.writeFileSync(legacyPath, legacyScenario.serialized, 'utf8');

    await openGame(page, { serializedSave: scenario.serialized });
    await expect(page.locator(selectors.status.playerName)).toHaveText(scenario.expectedState.playerName);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);

    const dialogPromise = page.waitForEvent('dialog');
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click(selectors.settings.importButton),
    ]);
    await fileChooser.setFiles(legacyPath);

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain(legacyScenario.expectedAlertFragment);
    expect(dialog.message()).toContain('升级到 v5');
    await dialog.accept();

    await expect(page.locator(selectors.status.playerName)).toHaveText(scenario.expectedState.playerName);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedState.realmLabel);

    const save = await readSave(page);
    expect(save.version).toBe(5);
    expect(save.playerName).toBe(scenario.expectedState.playerName);
    expect(save.inventory.lingshi).toBe(scenario.expectedState.lingshi);
});
