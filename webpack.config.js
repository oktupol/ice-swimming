const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const md = require('./src/utils/markdown');
const { picture } = require('./src/utils/images');

// Leave /public/* URLs untouched so css-loader doesn't try to resolve them as modules.
// The hero background AVIF/WebP files are generated into dist/public/ by scripts/generate-images.js
// and are served from the site root at runtime (the JPG fallbacks are copied there by CopyPlugin).
const cssLoader = {
    loader: 'css-loader',
    options: { url: { filter: (url) => !url.startsWith('/public/') } },
};

const referencedAssets = new Set();
const refRegex = /\bpublic\/([\w.-]+)/g;

const textExtensions = /\.(ejs|js|ts|scss|css|html)$/;

function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(full);
        } else if (textExtensions.test(entry.name)) {
            const content = fs.readFileSync(full, 'utf-8');
            let m;
            while ((m = refRegex.exec(content)) !== null) referencedAssets.add(m[1]);
        }
    }
}
scanDir(path.resolve(__dirname, 'src'));

const htmlDir = path.resolve(__dirname, 'src/html');
const htmlPages = fs
    .readdirSync(htmlDir)
    .filter((f) => f.endsWith('.ejs'))
    .map(
        (f) =>
            new HtmlWebpackPlugin({
                templateContent: async ({ md, picture }) =>
                    ejs.renderFile(path.resolve(htmlDir, f), { md, picture }, { root: htmlDir }),
                templateParameters: { md, picture },
                filename: path.resolve(__dirname, 'dist', f.replace('.ejs', '.html')),
                inject: 'head',
                scriptLoading: 'defer',
            }),
    );

module.exports = (env, argv) => {
    const isProd = argv.mode !== 'development';
    return {
        entry: './src/js/main.js',
        mode: argv.mode || 'production',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: isProd ? 'bundle.[contenthash].js' : 'bundle.js',
            // Root-absolute, so the bundle (and the fonts it references) also load on
            // 404.html, which GitHub Pages serves for unknown URLs at any depth.
            publicPath: '/',
        },
        devtool: isProd ? false : 'eval-source-map',
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            port: 3000,
            open: true,
        },
        plugins: [
            ...htmlPages,
            // The styles ship as a stylesheet <link> in <head>, which blocks rendering until
            // it has loaded. Injected by the deferred bundle instead (style-loader), a slow
            // connection first painted the page unstyled — the logo at its full natural size.
            new MiniCssExtractPlugin({
                filename: isProd ? 'bundle.[contenthash].css' : 'bundle.css',
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, 'public'),
                        to: 'public',
                        filter: (resourcePath) => referencedAssets.has(path.basename(resourcePath)),
                    },
                    // Cloudflare Pages reads _headers from the site root; it marks the preview
                    // deployments noindex. GitHub Pages (production) ignores the file.
                    {
                        from: path.resolve(__dirname, '_headers'),
                        to: '_headers',
                        toType: 'file',
                    },
                ],
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, cssLoader],
                },
                {
                    test: /\.s[ac]ss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        cssLoader,
                        {
                            loader: 'sass-loader',
                            // Compressed Sass output starts with a byte-order mark as soon as
                            // the CSS contains a non-ASCII character (e.g. `content: '—'`).
                            // Anywhere but at the very start of a file the BOM is not
                            // stripped: it becomes part of the first selector and the browser
                            // drops that rule — once the regular-weight @font-face, which
                            // turned all text bold.
                            options: { sassOptions: { charset: false } },
                        },
                    ],
                },
            ],
        },
    };
};
