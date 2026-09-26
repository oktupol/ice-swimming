'use strict';

/**
 * @file Suppresses CSS transitions while the page sets itself up. The styles
 * arrive with the deferred bundle, and site-state.js then applies the mode from
 * the URL hash or sessionStorage — so without this, a page opened in Eisbaden
 * mode would visibly fade from the warm defaults into the cold palette, slide
 * the switch across and fade the snowflake in. `html.no-transitions` (see
 * global.scss) switches every transition off; it is set before the stylesheet
 * is injected and lifted once the initial state has been painted.
 *
 * Has to be the first module required by main.js.
 */

document.documentElement.classList.add('no-transitions');

// Two frames: the first runs before the initial state is painted, the second
// after it, so the class is only lifted once nothing is left to transition.
requestAnimationFrame(() =>
    requestAnimationFrame(() => document.documentElement.classList.remove('no-transitions')),
);
