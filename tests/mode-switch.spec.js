// The warm/cold mode switch (src/js/site-state.js): body classes, the switch and its ARIA
// state, the URL hash, the live-region announcement, and landing at the top of the page
// on every mode change.

const { test, expect } = require('@playwright/test');

/** Asserts every visible trace of a mode at once, so a half-applied switch fails loudly. */
async function expectMode(page, mode) {
    const cold = mode === 'eisbaden';
    await expect(page.locator('body')).toHaveClass(cold ? /\bcold\b/ : /\bwarm\b/);
    await expect(page.locator('body')).not.toHaveClass(cold ? /\bwarm\b/ : /\bcold\b/);
    await expect(page.locator('#switch')).toBeChecked({ checked: cold });
    await expect(page.locator('#switch')).toHaveAttribute('aria-checked', String(cold));
    await expect(page.locator('#eisbaden')).toBeVisible({ visible: cold });
    await expect(page.locator('#schwimmtraining')).toBeVisible({ visible: !cold });
}

/** The switch is a visually hidden checkbox; readers click its label. */
const toggle = (page) => page.locator('label[for="switch"]').click();

const scrollY = (page) => page.evaluate(() => window.scrollY);

/**
 * The page ends up at the top. Polled, because on a deep link the correction runs in the
 * page's own `load` handler, which can land a moment after Playwright sees `load`.
 */
const expectAtTop = (page) => expect.poll(() => scrollY(page)).toBe(0);

test('startet ohne Hash im Schwimmtraining-Modus und lässt die URL unverändert', async ({
    page,
}) => {
    await page.goto('/');
    await expectMode(page, 'schwimmtraining');
    expect(new URL(page.url()).hash).toBe('');
});

test('Deep Link auf #eisbaden öffnet den Eisbaden-Modus am Seitenanfang', async ({
    page,
    isMobile,
}) => {
    // Known bug: on desktop the lazy gallery images near #eisbaden can finish after
    // `load`, and in roughly one cold load in ten the page ends up back at the section
    // (scrollY ≈ 750) after holdPageStartUntilLoaded() has already corrected it.
    test.fixme(
        !isMobile,
        'Seite landet gelegentlich wieder beim Abschnitt (holdPageStartUntilLoaded)',
    );
    await page.goto('/#eisbaden', { waitUntil: 'load' });
    await expectMode(page, 'eisbaden');
    await expectAtTop(page);
});

test('Umschalten setzt Hash und Ansage, ohne zum Abschnitt zu springen', async ({ page }) => {
    await page.goto('/');
    await toggle(page);

    await expectMode(page, 'eisbaden');
    expect(new URL(page.url()).hash).toBe('#eisbaden');
    await expect(page.locator('#mode-announcement')).toHaveText('Eisbaden wird angezeigt');
    // The hash is written via the History API precisely so the browser does not jump to
    // the <section id="eisbaden"> — the switch in the header must stay in view.
    expect(await scrollY(page)).toBe(0);
    await expect(page.locator('#switch')).toBeFocused();

    await toggle(page);
    await expectMode(page, 'schwimmtraining');
    expect(new URL(page.url()).hash).toBe('#schwimmtraining');
    await expect(page.locator('#mode-announcement')).toHaveText('Schwimmtraining wird angezeigt');
    expect(await scrollY(page)).toBe(0);
});

test('Zurück und Vorwärts im Browser stellen den jeweiligen Modus wieder her', async ({ page }) => {
    await page.goto('/#schwimmtraining');
    await toggle(page);
    await expectMode(page, 'eisbaden');

    await page.goBack();
    await expect(page).toHaveURL(/#schwimmtraining$/);
    await expectMode(page, 'schwimmtraining');

    await page.goForward();
    await expect(page).toHaveURL(/#eisbaden$/);
    await expectMode(page, 'eisbaden');
});

test('Menülink auf der Startseite wechselt den Modus und landet oben', async ({
    page,
    isMobile,
}) => {
    await page.goto('/');
    if (isMobile) await page.locator('label[for="navigation"]').click();
    await page.locator('#navigation-menu a[href="/#eisbaden"]').click();

    await expectMode(page, 'eisbaden');
    await expect(page.locator('#eisbaden')).toBeFocused();
    await expectAtTop(page);
});

test('Menülink von einer Unterseite öffnet die Startseite im gewählten Modus', async ({
    page,
    isMobile,
}) => {
    await page.goto('/about.html');
    if (isMobile) await page.locator('label[for="navigation"]').click();
    await page.locator('#navigation-menu a[href="/#eisbaden"]').click();

    await page.waitForURL(/\/#eisbaden$/, { waitUntil: 'load' });
    await expectMode(page, 'eisbaden');
    await expectAtTop(page);
});

test('Seiten ohne Schalter bekommen trotzdem eine vollständige Farbpalette', async ({ page }) => {
    await page.goto('/about.html');
    const mainColor = await page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue('--main-color').trim(),
    );
    expect(mainColor).not.toBe('');
});

test('Unterseiten übernehmen den zuletzt gewählten Modus', async ({ page }) => {
    await page.goto('/');
    await toggle(page);
    await expectMode(page, 'eisbaden');

    await page.goto('/about.html');
    await expect(page.locator('body')).toHaveClass(/\bcold\b/);
    await expect(page.locator('body')).not.toHaveClass(/\bwarm\b/);
});

test('Startseite ohne Hash öffnet den zuletzt gewählten Modus', async ({ page }) => {
    await page.goto('/#eisbaden');
    await page.goto('/about.html');
    // The logo link of the compact header.
    await page.locator('header h1 a').click();

    await page.waitForURL(/\/$/);
    await expectMode(page, 'eisbaden');
    expect(new URL(page.url()).hash).toBe('');
});

test('beim Laden im Eisbaden-Modus läuft keine Transition', async ({ page }) => {
    // Reduced motion shortens transitions but still starts them, so any that
    // escapes html.no-transitions shows up here.
    await page.addInitScript(() => {
        window.__transitions = [];
        addEventListener('transitionrun', (e) => window.__transitions.push(e.propertyName), true);
    });
    await page.goto('/#eisbaden');
    await expectMode(page, 'eisbaden');
    await expect(page.locator('html')).not.toHaveClass(/no-transitions/);
    expect(await page.evaluate(() => window.__transitions)).toEqual([]);

    await page.goto('/about.html');
    await expect(page.locator('body')).toHaveClass(/\bcold\b/);
    await expect(page.locator('html')).not.toHaveClass(/no-transitions/);
    expect(await page.evaluate(() => window.__transitions)).toEqual([]);
});
