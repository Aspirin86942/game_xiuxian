const { expect } = require('@playwright/test');
const selectors = require('./selectors');
const { STORAGE_KEY } = require('./saveFactory');

async function openGame(page, options = {}) {
    const { serializedSave = null, randomValue, randomSequence, nowMs } = options;

    if (randomValue !== undefined || randomSequence) {
        await page.addInitScript(({ fallback, sequence }) => {
            const queue = Array.isArray(sequence) ? [...sequence] : [];
            const defaultValue = typeof fallback === 'number' ? fallback : 0;
            const originalRandom = Math.random;
            Math.random = () => {
                if (queue.length > 0) {
                    return queue.shift();
                }
                return defaultValue;
            };
            Math.random.originalRandom = originalRandom;
        }, {
            fallback: randomValue,
            sequence: randomSequence || [],
        });
    }

    if (typeof nowMs === 'number') {
        await page.addInitScript(({ fixedNow }) => {
            const originalNow = Date.now;
            Date.now = () => fixedNow;
            Date.now.originalNow = originalNow;
        }, {
            fixedNow: nowMs,
        });
    }

    await page.addInitScript(({ key, value }) => {
        const seededFlag = '__codex_seeded_save__';
        if (!window.sessionStorage.getItem(seededFlag)) {
            window.localStorage.clear();
            if (value) {
                window.localStorage.setItem(key, value);
            }
            window.sessionStorage.setItem(seededFlag, '1');
        }
    }, {
        key: STORAGE_KEY,
        value: serializedSave,
    });

    await page.goto('/');
    await expect(page.locator(selectors.status.playerName)).toBeVisible();
    await expect(page.locator(selectors.status.activePage)).toBeVisible();
}

async function readSave(page) {
    const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
}

async function waitForModalShown(page, selector, timeout = 10_000) {
    await expect(page.locator(selector)).toHaveClass(/show/, { timeout });
}

async function waitForModalHidden(page, selector, timeout = 10_000) {
    await expect(page.locator(selector)).not.toHaveClass(/show/, { timeout });
}

module.exports = {
    openGame,
    readSave,
    waitForModalShown,
    waitForModalHidden,
};
