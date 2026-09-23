// The hamburger menu (src/js/navigation.js), which only exists below the large breakpoint:
// aria-expanded syncing, focus moving into the menu, the focus trap, Escape, and closing
// when a link is followed.

const { test, expect } = require('@playwright/test');

test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Ab 801px stehen die Links direkt in der Kopfzeile.');
});

const toggle = (page) => page.locator('#navigation');
const menu = (page) => page.locator('#navigation-menu');
const links = (page) => menu(page).locator('a');

/** Opens the menu the way a keyboard user does: focus the toggle, press Space. */
async function openWithKeyboard(page) {
    await toggle(page).focus();
    await page.keyboard.press('Space');
    await expect(menu(page)).toBeVisible();
}

test('Öffnen setzt aria-expanded und fokussiert den ersten Link', async ({ page }) => {
    await page.goto('/about.html');
    await expect(menu(page)).toBeHidden();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');

    await openWithKeyboard(page);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(links(page).first()).toBeFocused();
});

test('Tab hält den Fokus im geöffneten Menü', async ({ page }) => {
    await page.goto('/about.html');
    await openWithKeyboard(page);

    await links(page).last().focus();
    await page.keyboard.press('Tab');
    await expect(toggle(page)).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(links(page).last()).toBeFocused();
});

test('Escape schließt das Menü und gibt den Fokus an den Schalter zurück', async ({ page }) => {
    await page.goto('/about.html');
    await openWithKeyboard(page);

    await page.keyboard.press('Escape');
    await expect(menu(page)).toBeHidden();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle(page)).toBeFocused();
});

test('Ein Klick auf einen Link schließt das Menü', async ({ page }) => {
    await page.goto('/');
    await page.locator('label[for="navigation"]').click();
    await links(page).filter({ hasText: 'Eisbaden' }).click();

    await expect(menu(page)).toBeHidden();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});
