'use strict';

/**
 * @file Suppresses CSS transitions while the page sets itself up. The mode's
 * body class is already set by the inline script of partials/_initial-mode.ejs,
 * but site-state.js only aligns the switch's checkbox now — without this, a
 * page opened in Eisbaden mode would slide the switch across. `html.no-transitions`
 * (see global.scss) switches every transition off; the inline script sets it
 * too, and this module lifts it once the initial state has been painted.
 *
 * Has to be the first module required by main.js.
 */

document.documentElement.classList.add('no-transitions');

// Two frames: the first runs before the initial state is painted, the second
// after it, so the class is only lifted once nothing is left to transition.
requestAnimationFrame(() =>
    requestAnimationFrame(() => document.documentElement.classList.remove('no-transitions')),
);
