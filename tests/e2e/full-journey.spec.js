const fs = require('fs');

const { test, expect } = require('@playwright/test');
const selectors = require('./helpers/selectors');
const {
    openGame,
    readSave,
    reloadAndReadSave,
    snapshotSave,
    waitForModalShown,
    waitForModalHidden,
} = require('./helpers/harness');
const { createJourneyScenario } = require('./helpers/saveFactory');

const FIXED_NOW = 1_710_000_000_000;

async function runJourneyToExport(page, scenario, downloadPath, testInfo) {
    await openGame(page, {
        serializedSave: scenario.serialized,
        randomValue: scenario.resourceRandomValue,
        nowMs: FIXED_NOW,
    });

    await page.click(selectors.cultivation.mainButton);
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.expectedAfterResource.lingshi));
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterResource.cultivationText);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText(scenario.expectedAfterResource.mainButtonText);

    await page.click(selectors.cultivation.batchButton(scenario.trainBatch));
    await page.click(selectors.cultivation.mainButton);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterTraining.cultivationText);
    await expect(page.locator(selectors.status.lingshi)).toHaveText(String(scenario.expectedAfterTraining.lingshi));
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText(scenario.expectedAfterTraining.mainButtonText);

    await page.click(selectors.tabs.inventory);
    await waitForModalShown(page, selectors.inventory.modal);
    await page.click(selectors.inventory.useButton(scenario.itemId));
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterItemUse.cultivationText);
    await expect(page.locator(selectors.cultivation.mainButton)).toHaveText(scenario.expectedAfterItemUse.mainButtonText);
    let save = await readSave(page);
    expect(save.inventory[scenario.itemId] || 0).toBe(scenario.expectedAfterItemUse.inventoryCount);
    await page.click(selectors.inventory.closeButton);
    await waitForModalHidden(page, selectors.inventory.modal);

    await page.click(selectors.cultivation.mainButton);
    await expect(page.locator(selectors.status.realm)).toHaveText(scenario.expectedAfterBreakthrough.realmLabel);
    await expect(page.locator(selectors.status.cultivation)).toHaveText(scenario.expectedAfterBreakthrough.cultivationText);

    await page.click(selectors.tabs.story);
    await page.click(selectors.story.skipButton);
    await page.click(selectors.story.choice(scenario.levelChoiceId));
    await page.click(selectors.story.skipButton);
    await page.click(selectors.story.choice(scenario.mainChoiceId));

    save = await readSave(page);
    expect(save.version).toBe(scenario.expectedExportedState.version);
    expect(save.playerName).toBe(scenario.expectedExportedState.playerName);
    expect(save.realmIndex).toBe(scenario.expectedExportedState.realmIndex);
    expect(save.stageIndex).toBe(scenario.expectedExportedState.stageIndex);
    expect(save.storyProgress).toBe(scenario.expectedExportedState.storyProgress);
    expect(save.chapterChoices).toMatchObject(scenario.expectedExportedState.chapterChoices);
    expect(`${save.cultivation}/${save.maxCultivation}`).toBe(scenario.expectedExportedState.cultivationText);
    expect(save.inventory.lingshi || 0).toBe(scenario.expectedExportedState.lingshi);

    await page.click(selectors.tabs.settings);
    await waitForModalShown(page, selectors.settings.modal);
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click(selectors.settings.exportButton),
    ]);
    const targetPath = downloadPath || testInfo.outputPath('journey-export.json');
    await download.saveAs(targetPath);

    return targetPath;
}

test('黄金路径可完成资源、背包、修炼、突破、剧情并导出存档', async ({ page }, testInfo) => {
    const scenario = createJourneyScenario();
    const downloadPath = testInfo.outputPath('journey-export.json');
    const exportedPath = await runJourneyToExport(page, scenario, downloadPath, testInfo);
    const exported = JSON.parse(fs.readFileSync(exportedPath, 'utf8'));

    expect(exported.version).toBe(scenario.expectedExportedState.version);
    expect(exported.playerName).toBe(scenario.expectedExportedState.playerName);
    expect(exported.realmIndex).toBe(scenario.expectedExportedState.realmIndex);
    expect(exported.stageIndex).toBe(scenario.expectedExportedState.stageIndex);
    expect(exported.storyProgress).toBe(scenario.expectedExportedState.storyProgress);
    expect(exported.chapterChoices).toMatchObject(scenario.expectedExportedState.chapterChoices);
    expect(`${exported.cultivation}/${exported.maxCultivation}`).toBe(scenario.expectedExportedState.cultivationText);
    expect(exported.inventory.lingshi || 0).toBe(scenario.expectedExportedState.lingshi);
});

test('导出存档在新页面导入后可继续推进，并在刷新后保持连续状态', async ({ page, browser }, testInfo) => {
    const scenario = createJourneyScenario();
    const downloadPath = testInfo.outputPath('journey-import.json');
    await runJourneyToExport(page, scenario, downloadPath, testInfo);

    const importedContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        acceptDownloads: true,
    });

    try {
        const importedPage = await importedContext.newPage();
        await openGame(importedPage, { nowMs: FIXED_NOW });
        await importedPage.click(selectors.tabs.settings);
        await waitForModalShown(importedPage, selectors.settings.modal);

        const [fileChooser] = await Promise.all([
            importedPage.waitForEvent('filechooser'),
            importedPage.click(selectors.settings.importButton),
        ]);
        await fileChooser.setFiles(downloadPath);

        await expect(importedPage.locator(selectors.status.realm)).toHaveText(scenario.expectedAfterBreakthrough.realmLabel);
        await expect(importedPage.locator(selectors.status.cultivation)).toHaveText(scenario.expectedExportedState.cultivationText);
        await importedPage.click(selectors.settings.closeButton);
        await waitForModalHidden(importedPage, selectors.settings.modal);

        await importedPage.click(selectors.story.skipButton);
        await importedPage.click(selectors.story.choice(scenario.continuationChoiceId));

        const continuedSave = await readSave(importedPage);
        expect(continuedSave.storyProgress).toBe(scenario.expectedContinuedState.storyProgress);
        expect(continuedSave.chapterChoices).toMatchObject(scenario.expectedContinuedState.chapterChoices);
        expect(continuedSave.decisionHistory.length).toBe(scenario.expectedContinuedState.decisionHistoryLength);
        expect(`${continuedSave.cultivation}/${continuedSave.maxCultivation}`).toBe(scenario.expectedContinuedState.cultivationText);

        const snapshot = await snapshotSave(importedPage);
        const reloadedSave = await reloadAndReadSave(importedPage);
        expect(reloadedSave).toEqual(snapshot);
        await expect(importedPage.locator(selectors.status.realm)).toHaveText(scenario.expectedContinuedState.realmLabel);
        await expect(importedPage.locator(selectors.story.pressure)).toContainText(scenario.expectedContinuedState.pressureText);
    } finally {
        await importedContext.close();
    }
});
