"use strict";

/**
 * @file Turns each `.testimonials` block into a row of cards — profile picture,
 * name and the opening lines of the quote — that open the full quote in a
 * popover when clicked. The cards are built at runtime so the content fragments
 * in `src/content/` stay a plain list of `<blockquote>` + `<cite>` pairs, which
 * is also what a visitor without JS keeps seeing.
 *
 * The popover uses the native Popover API, which brings light-dismiss, Escape
 * and focus restoration with it. Browsers without it are left with the plain
 * quotes rather than a half-working hand-rolled dialog.
 */

/** @type {boolean} Whether this browser supports the native Popover API. */
const supportsPopover = Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');

/** @type {number} Counter making every generated popover id unique per page. */
let popoverCount = 0;

/**
 * Builds the round profile picture shown above the name.
 *
 * Until real photos are available this is a placeholder carrying the person's
 * initial. A portrait supplied in the content fragment — an `<img>` next to the
 * quote — is used instead, so dropping the real pictures in later needs no
 * change here.
 * @param {string} name The name the quote is attributed to.
 * @param {?HTMLImageElement} portrait Portrait from the fragment, if any.
 * @returns {HTMLElement} The avatar element, ready to insert.
 */
const buildAvatar = (name, portrait) => {
    if (portrait) {
        /** @type {HTMLImageElement} A copy, so the original stays untouched. */
        const image = portrait.cloneNode(true);
        image.classList.add('testimonial-avatar');
        return image;
    }

    /** @type {HTMLSpanElement} Placeholder disc with the initial. */
    const placeholder = document.createElement('span');
    placeholder.className = 'testimonial-avatar testimonial-avatar-placeholder';
    // The name is spelled out right below, so the initial is decoration.
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = name.trim().charAt(0).toUpperCase();
    return placeholder;
};

/**
 * Builds one card plus the popover holding its full quote.
 * @param {HTMLQuoteElement} quote The `<blockquote>` carrying the quote.
 * @param {HTMLElement} cite The `<cite>` naming who said it.
 * @returns {HTMLLIElement} List item containing the card and its popover.
 */
const buildCard = (quote, cite) => {
    /** @type {string} Full attribution, e.g. "Maike, Wochenend-Workshop …". */
    const attribution = cite.textContent.trim();
    // Only the name goes on the card; any context after the comma would push
    // the cards to wildly different heights for one line of small print.
    /** @type {string} The bare name, used on the card and in the labels. */
    const name = attribution.split(',')[0].trim();
    /** @type {string} Unique id tying the card's button to its popover. */
    const id = `testimonial-popover-${++popoverCount}`;

    /** @type {?HTMLImageElement} Portrait from the fragment, if supplied. */
    const portrait = quote.querySelector('img');

    /** @type {HTMLButtonElement} The card itself, a single big button. */
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'testimonial-card';
    card.setAttribute('popovertarget', id);
    // Without this the accessible name would be the whole truncated teaser.
    card.setAttribute('aria-label', `Vollständiges Zitat von ${name} lesen`);
    card.appendChild(buildAvatar(name, portrait));

    /** @type {HTMLSpanElement} The name under the picture. */
    const cardName = document.createElement('span');
    cardName.className = 'testimonial-name';
    cardName.textContent = name;
    card.appendChild(cardName);

    /** @type {HTMLSpanElement} Opening lines of the quote, clamped by CSS. */
    const teaser = document.createElement('span');
    teaser.className = 'testimonial-teaser';
    teaser.textContent = quote.textContent.trim();
    card.appendChild(teaser);

    /** @type {HTMLSpanElement} Affordance hinting that the card opens. */
    const more = document.createElement('span');
    more.className = 'testimonial-more';
    more.textContent = 'Ganzes Zitat lesen';
    card.appendChild(more);

    /** @type {HTMLDivElement} The popover with the untruncated quote. */
    const popover = document.createElement('div');
    popover.id = id;
    popover.className = 'testimonial-popover';
    popover.setAttribute('popover', '');
    popover.setAttribute('aria-label', `Zitat von ${name}`);

    /** @type {HTMLButtonElement} Closes the popover without a click handler. */
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'testimonial-close';
    close.setAttribute('popovertarget', id);
    close.setAttribute('popovertargetaction', 'hide');
    close.setAttribute('aria-label', 'Zitat schließen');
    popover.appendChild(close);

    popover.appendChild(buildAvatar(name, portrait));
    // The originals move into the popover, so the full quote keeps its markup
    // and the styling the content fragments already rely on.
    popover.appendChild(quote);
    popover.appendChild(cite);

    /** @type {HTMLLIElement} Wrapper keeping card and popover together. */
    const item = document.createElement('li');
    item.className = 'testimonial-item';
    item.appendChild(card);
    item.appendChild(popover);
    return item;
};

/**
 * Replaces the quotes in one `.testimonials` block with the row of cards.
 * @param {HTMLElement} block The container holding the quote/cite pairs.
 * @returns {void}
 */
const setupTestimonials = (block) => {
    /** @type {Array<[HTMLQuoteElement, HTMLElement]>} Quote/cite pairs found. */
    const pairs = [...block.querySelectorAll('blockquote')]
        .map((quote) => [quote, quote.nextElementSibling])
        .filter(([, cite]) => cite && cite.tagName === 'CITE');

    if (!pairs.length) return;

    /** @type {HTMLUListElement} The card row. */
    const list = document.createElement('ul');
    list.className = 'testimonial-list';
    // Building the cards moves the originals out of `block`, so the list is
    // assembled first and swapped in once every pair has been consumed.
    pairs.forEach(([quote, cite]) => list.appendChild(buildCard(quote, cite)));

    block.textContent = '';
    block.appendChild(list);
    block.classList.add('testimonials-ready');
};

if (supportsPopover) {
    document.querySelectorAll('.testimonials').forEach(setupTestimonials);
}
