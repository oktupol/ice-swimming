"use strict";

/**
 * @file Manages the warm (Schwimmtraining) / cold (Eisbaden) UI mode. The
 * {@link SiteState} class toggles `warm`/`cold` classes on `<body>`, mirrors
 * the active mode in the URL hash, and announces changes for screen readers.
 */

// Initialise the mode toggle once the DOM is ready, but only on pages that
// actually contain the switch.
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector("#switch")) {
        initSiteState();
    }
});

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
        // transition() writes the hash itself, which re-fires this event; the
        // guard ignores those echoes and only reacts to external hash changes
        // (e.g. back/forward navigation).
        if (hash !== siteState.currentState) {
            siteState.initState();
            siteState.focusActiveSection();
        }
    });
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

        this.state = this.initState();
        this.updateBodyClassList(this.state);
    }

    /**
     * Determines the initial mode. A valid mode in the URL hash wins (and is
     * applied immediately); otherwise the toggle's checked state decides.
     * @return {State} The resolved initial mode.
     */
    initState() {
        const hash = window.location.hash.substring(1);
        if (hash && Object.values(this.STATES).includes(hash)) {
            // Align the toggle with the hash before applying it, so a deep link
            // like /#eisbaden shows the switch in the matching position.
            this.checkbox.checked = hash === this.STATES.COLD;
            this.transition(hash);
            return hash;
        }

        // No (valid) hash: fall back to whatever the toggle currently shows.
        if (this.checkbox.checked) {
            return this.STATES.COLD;
        }
        return this.STATES.WARM;
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
     * @param {State} targetState The mode to switch to.
     * @throws {Error} If `targetState` is not a known {@link SiteState#STATES} value.
     * @returns {void}
     */
    transition(targetState) {
        if (!Object.values(this.STATES).includes(targetState)) {
            throw new Error("Illegal state" + targetState);
        }

        window.location.hash = targetState;
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
            section.focus();
        }
    }
}
