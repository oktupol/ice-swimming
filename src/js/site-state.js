"use strict";

/**
 * @file Manages the warm (Schwimmtraining) / cold (Eisbaden) UI mode. The
 * {@link SiteState} class toggles `warm`/`cold` classes on `<body>`, mirrors
 * the active mode in the URL hash, announces changes for screen readers, and
 * puts the page back at the top whenever the mode changes.
 */

/**
 * Wires up the mode switch: creates a {@link SiteState}, transitions on
 * checkbox changes, and re-syncs the state when the URL hash changes
 * (e.g. via back/forward navigation).
 * @returns {void}
 */
function initSiteState() {
    const siteState = new SiteState();
    const checkbox = document.querySelector("#switch");

    // Checked = cold (Eisbaden), unchecked = warm (Schwimmtraining).
    checkbox.addEventListener("change", (event) => {
        if (event.currentTarget.checked) {
            siteState.transitionCold();
        } else {
            siteState.transitionWarm();
        }
    });

    window.addEventListener("hashchange", () => {
        const hash = window.location.hash.substring(1);
        // transition() writes the hash through the History API, which does not
        // fire this event; the guard simply skips redundant work when the hash
        // already matches the active mode.
        if (hash !== siteState.currentState) {
            siteState.initState();
            siteState.focusActiveSection();
            siteState.scrollToTop();
        }
    });

    // A mode hash in the URL of a freshly loaded page (a nav link from another
    // page, a bookmark) makes the browser jump to the matching <section>. Undo
    // that, so arriving with a mode in the URL starts at the top just like
    // switching modes does.
    if (window.location.hash.substring(1) === siteState.currentState) {
        siteState.holdPageStartUntilLoaded();
    }
}

/**
 * Tracks and applies the current UI mode (warm/cold), keeping the body
 * classes, toggle checkbox, URL hash, and screen-reader announcement in sync.
 */
class SiteState {
    /**
     * The valid mode values, also used as the URL hash for each mode.
     * @typedef {string} State
     * @enum {State}
     */
    STATES = {
        WARM: "schwimmtraining",
        COLD: "eisbaden"
    };

    /**
     * Caches DOM references and applies the initial state derived from the
     * URL hash or the toggle's current checked value.
     */
    constructor() {
        /** @type {HTMLInputElement} */
        this.checkbox = document.querySelector("#switch");
        /** @type {HTMLBodyElement} */
        this.body = document.querySelector("body");
        /** @type {State|undefined} The mode currently applied to the page. */
        this.currentState = undefined;

        this.initState();
    }

    /**
     * Determines the initial mode and applies it. A valid mode in the URL hash
     * wins; otherwise the toggle's checked state decides. Either way
     * {@link SiteState#currentState} and the body classes end up in sync.
     * @return {State} The resolved initial mode.
     */
    initState() {
        const hash = window.location.hash.substring(1);
        if (hash && Object.values(this.STATES).includes(hash)) {
            // Align the toggle with the hash before applying it, so a deep link
            // like /#eisbaden shows the switch in the matching position.
            this.checkbox.checked = hash === this.STATES.COLD;
            this.transition(hash, {replaceHistory: true});
            return hash;
        }

        // No (valid) hash: fall back to whatever the toggle currently shows.
        // Applied directly rather than through transition(), which would write
        // a hash into the URL of a plainly loaded page.
        const state = this.checkbox.checked ? this.STATES.COLD : this.STATES.WARM;
        this.currentState = state;
        this.updateBodyClassList(state);
        return state;
    }

    /**
     * Switches to the warm (Schwimmtraining) mode.
     * @returns {void}
     */
    transitionWarm() {
        this.transition(this.STATES.WARM);
    }

    /**
     * Switches to the cold (Eisbaden) mode.
     * @returns {void}
     */
    transitionCold() {
        this.transition(this.STATES.COLD);
    }

    /**
     * Applies a mode transition: updates the URL hash, body classes, and the
     * screen-reader announcement.
     *
     * The hash is written through the History API rather than by assigning
     * `window.location.hash`: assigning it makes the browser jump to the matching
     * section, which scrolls the header — and with it the mode switch — out of
     * view, leaving no visible way back to the other mode.
     * @param {State} targetState The mode to switch to.
     * @param {Object} [options] Transition options.
     * @param {boolean} [options.replaceHistory=false] Replace the current history
     *   entry instead of pushing a new one. Used while initialising, so a freshly
     *   loaded page does not leave a redundant entry behind.
     * @throws {Error} If `targetState` is not a known {@link SiteState#STATES} value.
     * @returns {void}
     */
    transition(targetState, {replaceHistory = false} = {}) {
        if (!Object.values(this.STATES).includes(targetState)) {
            throw new Error("Illegal state" + targetState);
        }

        const url = "#" + targetState;
        if (replaceHistory) {
            window.history.replaceState(null, "", url);
        } else {
            window.history.pushState(null, "", url);
        }
        this.currentState = targetState;
        this.updateBodyClassList(targetState);
        this.announceState(targetState);
    }

    /**
     * Sets the `warm`/`cold` body classes and the toggle's `aria-checked`
     * attribute to match the given mode.
     * @param {State} targetState The mode to reflect on the body.
     * @returns {void}
     */
    updateBodyClassList(targetState) {
        if (targetState === this.STATES.COLD) {
            this.body.classList.add("cold");
            this.body.classList.remove("warm");
        } else if (targetState === this.STATES.WARM) {
            this.body.classList.add("warm");
            this.body.classList.remove("cold");
        }
        this.checkbox.setAttribute("aria-checked", targetState === this.STATES.COLD ? "true" : "false");
    }

    /**
     * Updates the ARIA live region so assistive technology announces the
     * newly active mode. No-op if the live region is absent.
     * @param {State} targetState The mode to announce.
     * @returns {void}
     */
    announceState(targetState) {
        const region = document.querySelector("#mode-announcement");
        if (region) {
            region.textContent = targetState === this.STATES.COLD
                ? "Eisbaden wird angezeigt"
                : "Schwimmtraining wird angezeigt";
        }
    }

    /**
     * Moves keyboard focus to the section matching the current mode, making it
     * programmatically focusable first. No-op if the current state is invalid
     * or the section is missing.
     *
     * Focus has to move because the section the reader came from is hidden by
     * the mode change: leaving focus on a link inside it would drop focus to
     * the document body. The viewport is left alone here — {@link
     * SiteState#scrollToTop} decides where the page lands.
     * @returns {void}
     */
    focusActiveSection() {
        if (!Object.values(this.STATES).includes(this.currentState)) {
            return;
        }
        const section = document.querySelector("#" + this.currentState);
        if (section) {
            // tabindex="-1" makes the otherwise non-interactive section
            // focusable programmatically without adding it to the tab order.
            section.setAttribute("tabindex", "-1");
            // preventScroll: focusing a section would otherwise scroll its top
            // edge into view, which is the very jump this module avoids.
            section.focus({preventScroll: true});
        }
    }

    /**
     * Scrolls the page back to the top.
     *
     * A mode change swaps out the entire content area, so whatever the reader
     * had scrolled to is gone and their scroll position no longer points at
     * anything meaningful — scrolling somewhere mid-page would land them in an
     * arbitrary spot of the new content. Starting at the top instead matches
     * what following a link to another page does, and keeps the mode switch in
     * the header reachable.
     * @returns {void}
     */
    scrollToTop() {
        // Instant rather than smooth: this is a page change, not a movement
        // within the page, and a smooth scroll over a full-height hero would
        // just be a long slide over content the reader did not ask to see.
        window.scrollTo({top: 0, left: 0, behavior: "instant"});
    }

    /**
     * Keeps a page that was opened with a mode hash at the top while it loads.
     *
     * Scrolling to the top once is not enough: the browser retries the jump to
     * the fragment for as long as the document is still loading, and would put
     * the page back down again as soon as the last image has arrived. So the
     * correction is repeated after `load` — unless the reader has started
     * scrolling in the meantime, because pulling the page back out from under
     * them would be worse than the jump this undoes.
     * @returns {void}
     */
    holdPageStartUntilLoaded() {
        this.scrollToTop();

        /** @type {string[]} The ways a reader can scroll without our doing it. */
        const readerEvents = ["wheel", "touchmove", "keydown"];
        /** @type {boolean} Whether the reader has taken over the scroll position. */
        let readerScrolled = false;
        const markReaderScrolled = () => {
            readerScrolled = true;
        };

        // A `scroll` listener would be simpler but useless here: it cannot tell
        // the reader's scrolling apart from our own scrollToTop().
        readerEvents.forEach((type) => window.addEventListener(type, markReaderScrolled, {passive: true}));
        window.addEventListener("load", () => {
            if (!readerScrolled) {
                this.scrollToTop();
            }
            readerEvents.forEach((type) => window.removeEventListener(type, markReaderScrolled));
        }, {once: true});
    }
}

// Initialise the mode toggle, but only on pages that actually contain the
// switch. The bundle is injected into <head> with `defer`, so the document is
// already parsed when this runs — like the other modules, it needs no
// DOMContentLoaded wrapper. This has to stay below the class declaration:
// unlike a function, a class is not hoisted, so calling it any earlier in the
// file throws a ReferenceError.
if (document.querySelector("#switch")) {
    initSiteState();
}
