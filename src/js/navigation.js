"use strict";

const navToggle = document.querySelector('#navigation');

const setNavOpen = (open) => {
    if (!navToggle) {
        return;
    }
    navToggle.checked = open;
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
};

if (navToggle) {
    navToggle.addEventListener('change', () => {
        navToggle.setAttribute('aria-expanded', navToggle.checked ? 'true' : 'false');
    });
}

document.querySelectorAll('.navigation-menu a').forEach(link => {
    link.addEventListener('click', () => {
        setNavOpen(false);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle && navToggle.checked) {
        setNavOpen(false);
        navToggle.focus();
    }
});
