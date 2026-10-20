// Scans every page with axe-core for WCAG 2.1 A/AA violations. The landing page is scanned
// in both modes: each swaps the whole palette, so a colour that passes in one can fail in
// the other.

const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');

const PAGES = [
    ['Startseite (Schwimmtraining)', '/#schwimmtraining'],
    ['Startseite (Eisbaden)', '/#eisbaden'],
    ['Über mich', '/about-me.html'],
    ['Über Aqualign', '/about.html'],
    ['Impressum', '/imprint.html'],
    ['404', '/gibt/es/nicht'],
];

const scan = (page) =>
    new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

// Only the rule id, the offending selectors and the message — enough to find the problem
// without axe's full report drowning the test output.
const summarise = (violations) =>
    violations.map((v) => ({
        rule: v.id,
        help: v.help,
        targets: v.nodes.map((node) => node.target.join(' ')),
    }));

for (const [name, url] of PAGES) {
    test(`${name} hat keine axe-Verstöße`, async ({ page }) => {
        await page.goto(url);
        const { violations } = await scan(page);
        expect(summarise(violations)).toEqual([]);
    });
}

test('geöffnetes Menü hat keine axe-Verstöße', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Das Hamburger-Menü gibt es nur unterhalb von 801px.');
    await page.goto('/');
    await page.locator('label[for="navigation"]').click();
    await expect(page.locator('#navigation-menu')).toBeVisible();
    const { violations } = await scan(page);
    expect(summarise(violations)).toEqual([]);
});
