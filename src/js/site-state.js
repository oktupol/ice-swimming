"use strict";

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector("#switch")) {
        initSiteState();
    }
});

function initSiteState() {
    const siteState = new SiteState();
    const checkbox = document.querySelector("#switch");

    checkbox.addEventListener("change", (event) => {
        if (event.currentTarget.checked) {
            siteState.transitionCold();
        } else {
            siteState.transitionWarm();
        }
    });

    window.addEventListener("hashchange", () => {
        const hash = window.location.hash.substring(1);
        if (hash !== siteState.currentState) {
            siteState.initState();
            siteState.focusActiveSection();
        }
    });
}

class SiteState {
    /**
     * @typedef {string} State
     * @enum {State}
     */
    STATES = {
        WARM: "schwimmtraining",
        COLD: "eisbaden"
    };

    constructor() {
        /** @type {HTMLInputElement} */
        this.checkbox = document.querySelector("#switch");
        /** @type {HTMLBodyElement} */
        this.body = document.querySelector("body");

        this.state = this.initState();
        this.updateBodyClassList(this.state);
    }

    /**
     * @return {State}
     */
    initState() {
        const hash = window.location.hash.substring(1);
        if (hash && Object.values(this.STATES).includes(hash)) {
            this.checkbox.checked = hash === this.STATES.COLD;
            this.transition(hash);
            return hash;
        }

        if (this.checkbox.checked) {
            return this.STATES.COLD;
        }
        return this.STATES.WARM;
    }

    transitionWarm() {
        this.transition(this.STATES.WARM);
    }

    transitionCold() {
        this.transition(this.STATES.COLD);
    }

    /**
     * @param {State} targetState
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

    announceState(targetState) {
        const region = document.querySelector("#mode-announcement");
        if (region) {
            region.textContent = targetState === this.STATES.COLD
                ? "Eisbaden wird angezeigt"
                : "Schwimmtraining wird angezeigt";
        }
    }

    focusActiveSection() {
        if (!Object.values(this.STATES).includes(this.currentState)) {
            return;
        }
        const section = document.querySelector("#" + this.currentState);
        if (section) {
            section.setAttribute("tabindex", "-1");
            section.focus();
        }
    }
}
