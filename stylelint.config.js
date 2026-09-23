// Stylelint (npm run lint:css). Correctness rules only — no formatting opinions — plus the
// breakpoint convention from CLAUDE.md.

module.exports = {
    extends: ['stylelint-config-recommended-scss'],
    rules: {
        // A bare `//` separates paragraphs inside a longer comment.
        'scss/comment-no-empty': null,
        // `clip: rect(0, 0, 0, 0)` is the classic visually-hidden pattern (.sr-only and
        // the hidden checkboxes); deprecated, but still supported everywhere.
        'property-no-deprecated': [true, { ignoreProperties: ['clip'] }],
        // Width breakpoints go through the xsmall/small/medium/large mixins, so the
        // site keeps one set of breakpoints. Other media features (hover, reduced
        // motion) are fine as raw queries.
        'media-feature-name-disallowed-list': [
            ['width', 'min-width', 'max-width'],
            { message: 'Use the @include xsmall/small/medium/large mixins from viewports.scss' },
        ],
    },
    overrides: [
        {
            // The one place that defines the breakpoints.
            files: ['src/css/viewports.scss'],
            rules: { 'media-feature-name-disallowed-list': null },
        },
    ],
};
