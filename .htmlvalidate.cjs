// Validates the built pages in dist/ (npm run check:html). The generated HTML is what
// browsers and assistive technology see, so that is what gets checked, not the .ejs.
module.exports = {
    extends: ['html-validate:standard', 'html-validate:a11y'],
    rules: {
        // The nav's <form> only exists for autocomplete="off", which stops browsers from
        // restoring the menu checkbox as open on back/forward navigation. It is never
        // submitted, so it needs no submit button.
        'wcag/h32': 'off',
    },
};
