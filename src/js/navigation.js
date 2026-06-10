"use strict";

const navToggle = document.querySelector('#navigation');
const navMenu = document.querySelector('#navigation-menu');

const setNavOpen = (open) => {
    if (!navToggle) {
        return;
    }
    navToggle.checked = open;
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
};

// The toggle plus the menu links form the focus cycle while the menu is open.
const getFocusable = () => {
    if (!navToggle || !navMenu) {
        return [];
    }
    return [navToggle, ...navMenu.querySelectorAll('a')];
};

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

document.querySelectorAll('.navigation-menu a').forEach(link => {
    link.addEventListener('click', () => {
        setNavOpen(false);
    });
});

document.addEventListener('keydown', (event) => {
    if (!navToggle || !navToggle.checked) {
        return;
    }

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
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});
