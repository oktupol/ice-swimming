"use strict";

/**
 * @file Tags the first footer list item of each visual row with a
 * `row-start` class so CSS can style row boundaries. Because the list wraps
 * responsively, the row breaks are recomputed whenever the list resizes.
 */

/** @type {HTMLUListElement|null} The footer list whose items wrap into rows. */
const ul = document.querySelector('.content-footer ul');

if (ul) {
    /** @type {HTMLLIElement[]} */
    const items = [...ul.children];

    /**
     * Toggles `row-start` on each list item, marking the first item whose
     * vertical offset differs from the previous item (i.e. the start of a
     * new wrapped row).
     * @returns {void}
     */
    const mark = () => {
        let top;
        for (const li of items) {
            li.classList.toggle('row-start', li.offsetTop !== top);
            top = li.offsetTop;
        }
    };
    new ResizeObserver(mark).observe(ul);
    mark();
}
