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

    await page.addInitScript(({ fixedNow }) => {
        const clockKey = '__codex_fixed_now__';
        const originalNow = Date.now.bind(Date);
        if (Number.isFinite(fixedNow) && !window.sessionStorage.getItem(clockKey)) {
            window.sessionStorage.setItem(clockKey, String(Math.floor(fixedNow)));
        }

        const storedRawNow = window.sessionStorage.getItem(clockKey);
        if (storedRawNow === null) {
            return;
        }

        const storedNow = Number(storedRawNow);
        if (!Number.isFinite(storedNow)) {
            return;
        }

        window.__codex_test_clock__ = storedNow;
        window.__codex_set_test_now__ = (nextNow) => {
            const normalizedNow = Math.floor(nextNow);
            window.__codex_test_clock__ = normalizedNow;
            window.sessionStorage.setItem(clockKey, String(normalizedNow));
            return normalizedNow;
        };
        Date.now = () => window.__codex_test_clock__;
        Date.now.originalNow = originalNow;
    }, {
        fixedNow: typeof nowMs === 'number' ? nowMs : null,
    });

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

async function snapshotSave(page) {
    const save = await readSave(page);
    return save ? JSON.parse(JSON.stringify(save)) : null;
}

async function expectSaveUnchanged(page, snapshot) {
    const current = await readSave(page);
    expect(current).toEqual(snapshot);
}

async function advanceClock(page, deltaMs) {
    return page.evaluate((delta) => {
        if (typeof window.__codex_set_test_now__ !== 'function') {
            throw new Error('测试时钟未初始化');
        }
        const currentNow = typeof window.__codex_test_clock__ === 'number' ? window.__codex_test_clock__ : Date.now();
        return window.__codex_set_test_now__(currentNow + delta);
    }, deltaMs);
}

async function reloadAndReadSave(page) {
    await page.reload();
    await expect(page.locator(selectors.status.playerName)).toBeVisible();
    await expect(page.locator(selectors.status.activePage)).toBeVisible();
    return readSave(page);
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
    snapshotSave,
    expectSaveUnchanged,
    advanceClock,
    reloadAndReadSave,
    waitForModalShown,
    waitForModalHidden,
};
