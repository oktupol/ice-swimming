'use strict';

/**
 * @file Gives every horizontally scrolling `.gallery` an Instagram-style row
 * of dots that shows which image is currently in view. The dots are built at
 * runtime (so galleries stay plain markup without JS), double as buttons that
 * scroll to their image, and hide themselves whenever a gallery happens to fit
 * on screen without scrolling. A gallery that scrolls is also made
 * keyboard-focusable, so it can be scrolled with the arrow keys.
 */

/**
 * Wires up a single gallery: builds its dot row, keeps the active dot in sync
 * with the scroll position and lets each dot scroll to its image.
 * @param {HTMLElement} gallery The scroll container holding the images.
 * @returns {void}
 */
const setupGallery = (gallery) => {
    /**
     * @type {HTMLElement[]} The slides the dots refer to. Queried as images
     * rather than taken from `gallery.children`: those are the `<picture>`
     * wrappers, which are `display: contents` and so have no box to measure.
     */
    const slides = [...gallery.querySelectorAll('img')];
    if (slides.length < 2) return;

    /** @type {HTMLDivElement} Wrapper positioning the dots over the images. */
    const wrapper = document.createElement('div');
    wrapper.className = 'gallery-wrapper';
    gallery.parentNode.insertBefore(wrapper, gallery);
    wrapper.appendChild(gallery);

    /** @type {HTMLDivElement} The dot row itself. */
    const dots = document.createElement('div');
    dots.className = 'gallery-dots';
    dots.setAttribute('aria-hidden', 'true');

    /** @type {HTMLButtonElement[]} One dot per slide, in document order. */
    const buttons = slides.map((slide) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gallery-dot';
        button.tabIndex = -1;
        button.addEventListener('click', () => {
            gallery.scrollTo({
                left: slide.offsetLeft - (gallery.clientWidth - slide.clientWidth) / 2,
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'auto'
                    : 'smooth',
            });
        });
        dots.appendChild(button);
        return button;
    });

    wrapper.appendChild(dots);

    /**
     * Marks the dot whose slide is closest to the horizontal centre of the
     * scroll container as the current one.
     * @returns {void}
     */
    const update = () => {
        const center = gallery.scrollLeft + gallery.clientWidth / 2;
        let closest = 0;
        let distance = Infinity;
        slides.forEach((slide, index) => {
            const delta = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
            if (delta < distance) {
                distance = delta;
                closest = index;
            }
        });
        buttons.forEach((button, index) => {
            button.classList.toggle('current', index === closest);
        });
    };

    // The dots are mouse/touch-only (aria-hidden, tabIndex -1), so keyboard
    // users scroll the gallery itself with the arrow keys once it has focus.
    // Labelled as a region so a screen reader says what just got focused.
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-label', 'Bildergalerie');

    /**
     * Adapts the gallery to whether it actually scrolls: when every image
     * already fits (e.g. on wide viewports) the dots are hidden and the
     * gallery leaves the tab order, since there is nothing to scroll to.
     * @returns {void}
     */
    const updateScrollability = () => {
        const scrollable = gallery.scrollWidth > gallery.clientWidth + 1;
        dots.classList.toggle('hidden', !scrollable);
        if (scrollable) {
            gallery.tabIndex = 0;
        } else {
            gallery.removeAttribute('tabindex');
        }
    };

    gallery.addEventListener('scroll', update, { passive: true });
    /** @type {ResizeObserver} Re-evaluates the gallery when it or a slide resizes. */
    const observer = new ResizeObserver(() => {
        updateScrollability();
        update();
    });
    // The slides too, not just the gallery: a lazy image that loads late widens
    // the scrolled content without changing the size of the gallery's own box.
    observer.observe(gallery);
    slides.forEach((slide) => observer.observe(slide));
    updateScrollability();
    update();
};

document.querySelectorAll('.gallery').forEach(setupGallery);
