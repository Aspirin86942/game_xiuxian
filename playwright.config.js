const { defineConfig } = require('@playwright/test');

const E2E_PORT = 4174;
const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    reporter: 'list',
    use: {
        baseURL: BASE_URL,
        browserName: 'chromium',
        viewport: {
            width: 375,
            height: 667,
        },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
        acceptDownloads: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'off',
    },
    webServer: {
        command: `node -e "process.env.PORT='${E2E_PORT}'; require('./tests/serve-static.js')"`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
