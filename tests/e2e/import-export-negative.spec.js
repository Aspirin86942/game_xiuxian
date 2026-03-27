const fs = require('fs');

const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const {
    expectSaveUnchanged,
    openGame,
    snapshotSave,
    waitForModalShown,
} = require('./helpers/harness');
const { createCustomSaveScenario, createInvalidSaveFixtures } = require('./helpers/saveFactory');

const FIXED_NOW = 1_710_000_000_000;

async function attemptImportAndCaptureDialog(page, savePath) {
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
    });

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);

    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click(selectors.settings.importButton),
    ]);
    await fileChooser.setFiles(savePath);

    await expect.poll(() => dialogMessage).not.toBe('');
    return dialogMessage;
}

async function openWithStableSave(page) {
    const scenario = createCustomSaveScenario();
    await openGame(page, {
        serializedSave: scenario.serialized,
        nowMs: FIXED_NOW,
    });
    return snapshotSave(page);
}

test('导入非 JSON 文本时会提示失败且不污染当前存档', async ({ page }, testInfo) => {
    const fixtures = createInvalidSaveFixtures();
    const snapshot = await openWithStableSave(page);
    const filePath = testInfo.outputPath('invalid-non-json.json');
    fs.writeFileSync(filePath, fixtures.nonJson, { encoding: 'utf8' });

    const dialogMessage = await attemptImportAndCaptureDialog(page, filePath);
    expect(dialogMessage).toContain('导入失败：');
    await expectSaveUnchanged(page, snapshot);
});

test('导入截断 JSON 时会提示失败且不污染当前存档', async ({ page }, testInfo) => {
    const fixtures = createInvalidSaveFixtures();
    const snapshot = await openWithStableSave(page);
    const filePath = testInfo.outputPath('invalid-truncated.json');
    fs.writeFileSync(filePath, fixtures.truncatedJson, { encoding: 'utf8' });

    const dialogMessage = await attemptImportAndCaptureDialog(page, filePath);
    expect(dialogMessage).toContain('导入失败：');
    await expectSaveUnchanged(page, snapshot);
});

test('导入不受支持的旧版存档时会阻断覆盖', async ({ page }, testInfo) => {
    const fixtures = createInvalidSaveFixtures();
    const snapshot = await openWithStableSave(page);
    await page.click(selectors.tabs.story);
    const storyTitleBeforeImport = await page.locator(selectors.story.title).textContent();
    const filePath = testInfo.outputPath('unsupported-legacy-save.json');
    fs.writeFileSync(filePath, fixtures.unsupportedLegacy, { encoding: 'utf8' });

    const dialogMessage = await attemptImportAndCaptureDialog(page, filePath);
    expect(dialogMessage).toContain('旧版存档');
    await expectSaveUnchanged(page, snapshot);

    await page.click(selectors.settings.closeButton);
    await page.click(selectors.tabs.story);
    await expect(page.locator(selectors.story.title)).toHaveText(storyTitleBeforeImport || '');
});

test('导入更高版本存档时会阻断覆盖', async ({ page }, testInfo) => {
    const fixtures = createInvalidSaveFixtures();
    const snapshot = await openWithStableSave(page);
    const filePath = testInfo.outputPath('future-version-save.json');
    fs.writeFileSync(filePath, fixtures.futureVersion, { encoding: 'utf8' });

    const dialogMessage = await attemptImportAndCaptureDialog(page, filePath);
    expect(dialogMessage).toContain('更高版本存档');
    await expectSaveUnchanged(page, snapshot);
});

test('导入超大字段文件时会被提前阻断', async ({ page }, testInfo) => {
    const fixtures = createInvalidSaveFixtures();
    const snapshot = await openWithStableSave(page);
    const filePath = testInfo.outputPath('oversized-save.json');
    fs.writeFileSync(filePath, fixtures.oversizedField, { encoding: 'utf8' });

    const dialogMessage = await attemptImportAndCaptureDialog(page, filePath);
    expect(dialogMessage).toContain('存档文件过大');
    await expectSaveUnchanged(page, snapshot);
});
