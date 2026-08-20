"use strict";

/**
 * @file Gives every horizontally scrolling `.gallery` an Instagram-style row
 * of dots that shows which image is currently in view. The dots are built at
 * runtime (so galleries stay plain markup without JS), double as buttons that
 * scroll to their image, and hide themselves whenever a gallery happens to fit
 * on screen without scrolling.
 */

/**
 * Wires up a single gallery: builds its dot row, keeps the active dot in sync
 * with the scroll position and lets each dot scroll to its image.
 * @param {HTMLElement} gallery The scroll container holding the images.
 * @returns {void}
 */
const setupGallery = (gallery) => {
    /** @type {HTMLElement[]} The slides the dots refer to. */
    const slides = [...gallery.children];
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
                    : 'smooth'
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

    /**
     * Hides the dots when the gallery is not actually scrollable — e.g. on
     * wide viewports where every image already fits.
     * @returns {void}
     */
    const updateVisibility = () => {
        dots.classList.toggle('hidden', gallery.scrollWidth <= gallery.clientWidth + 1);
    };

    gallery.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(() => {
        updateVisibility();
        update();
    }).observe(gallery);
    updateVisibility();
    update();
};

document.querySelectorAll('.gallery').forEach(setupGallery);
