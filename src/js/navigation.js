"use strict";

/**
 * @file Behaviour for the mobile navigation menu: keeps the toggle's
 * `aria-expanded` state in sync, closes the menu when a link is clicked,
 * and traps keyboard focus within the menu while it is open.
 */

/** @type {HTMLInputElement|null} The checkbox that opens/closes the menu. */
const navToggle = document.querySelector('#navigation');
/** @type {HTMLElement|null} The container holding the navigation links. */
const navMenu = document.querySelector('#navigation-menu');

/**
 * Opens or closes the menu by setting the toggle's checked state and its
 * matching `aria-expanded` attribute. No-op if the toggle is absent.
 * @param {boolean} open Whether the menu should be open.
 * @returns {void}
 */
const setNavOpen = (open) => {
    if (!navToggle) {
        return;
    }
    navToggle.checked = open;
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
};

/**
 * Returns the focusable elements that make up the focus cycle while the menu
 * is open: the toggle plus the menu links.
 * @returns {HTMLElement[]} The focusable elements, or an empty array if the
 *   toggle or menu is missing.
 */
const getFocusable = () => {
    if (!navToggle || !navMenu) {
        return [];
    }
    return [navToggle, ...navMenu.querySelectorAll('a')];
};

// Sync aria-expanded with the toggle and move focus to the first link when
// the menu opens.
if (navToggle) {
    navToggle.addEventListener('change', () => {
        navToggle.setAttribute('aria-expanded', navToggle.checked ? 'true' : 'false');
        if (navToggle.checked) {
            const firstLink = navMenu && navMenu.querySelector('a');
            if (firstLink) {
                firstLink.focus();
            }
        }
    });
}

// Close the menu whenever a navigation link is followed.
document.querySelectorAll('.navigation-menu a').forEach(link => {
    link.addEventListener('click', () => {
        setNavOpen(false);
    });
});

// While the menu is open, Escape closes it and Tab/Shift+Tab wrap focus
// around the first and last focusable elements (focus trap).
/** @param {KeyboardEvent} event */
document.addEventListener('keydown', (event) => {
    if (!navToggle || !navToggle.checked) {
        return;
    }

    // Escape closes the menu and returns focus to the toggle.
    if (event.key === 'Escape') {
        setNavOpen(false);
        navToggle.focus();
        return;
    }

    if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) {
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        // Wrap focus at the edges so Tab never escapes the open menu:
        // Shift+Tab from the first element jumps to the last, and Tab from
        // the last jumps back to the first.
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});
