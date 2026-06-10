"use strict";

document.querySelectorAll('.navigation-menu a').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelector('#navigation').checked = false;
    });
});
