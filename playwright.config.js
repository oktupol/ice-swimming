// Browser tests against the production build in dist/ (npm run test:browser). They need an
// up-to-date `npm run build`: scripts/serve-dist.js serves dist/ as GitHub Pages would.

const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
    testDir: 'tests',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        // Cuts the mode cross-fade and colour transitions to ~0 (global.scss), so the
        // tests never observe — or run axe's contrast check on — a half-faded page.
        reducedMotion: 'reduce',
    },
    // Desktop shows the nav inline; below the large breakpoint (801px) it is a hamburger
    // menu with its own focus trap, so both layouts get tested.
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ],
    webServer: {
        command: `node scripts/serve-dist.js ${PORT}`,
        port: PORT,
        reuseExistingServer: !process.env.CI,
    },
});
