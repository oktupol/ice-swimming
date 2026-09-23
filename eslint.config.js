// ESLint (npm run lint:js). src/js/ is browser code with the JSDoc-everywhere convention
// from CLAUDE.md; everything else is Node tooling (build helpers, scripts, tests).

const js = require('@eslint/js');
const globals = require('globals');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = [
    { ignores: ['dist/', 'test-results/', 'playwright-report/'] },

    js.configs.recommended,

    {
        files: ['**/*.js', '**/*.cjs'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: globals.node,
        },
    },

    {
        // Callbacks passed to page.evaluate() run in the browser.
        files: ['tests/**/*.js'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },

    {
        files: ['src/js/**/*.js'],
        languageOptions: {
            sourceType: 'script',
            globals: { ...globals.browser, require: 'readonly' },
        },
        plugins: { jsdoc },
        rules: {
            ...jsdoc.configs['flat/recommended'].rules,
            strict: ['error', 'global'],
            // Every function gets JSDoc, arrow functions and class methods included.
            'jsdoc/require-jsdoc': ['error', {
                require: {
                    FunctionDeclaration: true,
                    ArrowFunctionExpression: true,
                    MethodDefinition: true,
                    ClassDeclaration: true,
                },
                // Inline callbacks (event listeners, forEach) are described by the
                // comment above the call, not a JSDoc block of their own.
                contexts: [],
                checkConstructors: true,
                exemptEmptyFunctions: false,
                minLineCount: 2,
            }],
            'jsdoc/require-file-overview': 'error',
            // `[options.replaceHistory=false]` documents the default right where it is read.
            'jsdoc/no-defaults': 'off',
        },
    },
];
