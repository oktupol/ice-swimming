// The gallery enhancement (src/js/gallery.js): dot row, and keyboard access to galleries
// that overflow. On a phone-width viewport every gallery overflows.

const { test, expect } = require('@playwright/test');

test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, 'Ob eine Galerie überläuft, hängt am Desktop von der Breite ab.');
});

test('eine überlaufende Galerie lässt sich per Tastatur fokussieren und scrollen', async ({ page }) => {
    await page.goto('/#eisbaden');
    const gallery = page.locator('#eisbaden .gallery');
    await expect(gallery).toHaveAttribute('tabindex', '0');
    await expect(gallery).toHaveAttribute('aria-label', 'Bildergalerie');

    await gallery.focus();
    const before = await gallery.evaluate((el) => el.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => gallery.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
});

test('die Punkte folgen dem Bild und springen per Klick dorthin', async ({ page }) => {
    await page.goto('/#eisbaden');
    const wrapper = page.locator('#eisbaden .gallery-wrapper');
    const dots = wrapper.locator('.gallery-dot');
    const imageCount = await wrapper.locator('.gallery img').count();

    await expect(wrapper.locator('.gallery-dots')).not.toHaveClass(/\bhidden\b/);
    await expect(dots).toHaveCount(imageCount);
    await expect(dots.first()).toHaveClass(/\bcurrent\b/);

    await dots.last().click();
    await expect(dots.last()).toHaveClass(/\bcurrent\b/);
    await expect(dots.first()).not.toHaveClass(/\bcurrent\b/);
});
