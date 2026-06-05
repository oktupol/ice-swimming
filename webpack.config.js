const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const md = require('./src/utils/markdown');

const referencedAssets = new Set();
const refRegex = /\bpublic\/([\w.\-]+)/g;

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
const htmlPages = fs.readdirSync(htmlDir)
    .filter(f => f.endsWith('.ejs'))
    .map(f => new HtmlWebpackPlugin({
        templateContent: async ({ md }) => ejs.renderFile(
            path.resolve(htmlDir, f),
            { md },
            { root: htmlDir }
        ),
        templateParameters: { md },
        filename: path.resolve(__dirname, 'dist', f.replace('.ejs', '.html')),
        inject: 'head',
        scriptLoading: 'defer',
    }));

module.exports = (env, argv) => {
    const isProd = argv.mode !== 'development';
    return {
        entry: "./src/js/main.js",
        mode: argv.mode || 'production',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: isProd ? "bundle.[contenthash].js" : "bundle.js",
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
            new CopyPlugin({
                patterns: [{
                    from: path.resolve(__dirname, 'public'),
                    to: 'public',
                    filter: (resourcePath) => referencedAssets.has(path.basename(resourcePath)),
                }],
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ["style-loader", "css-loader"]
                },
                {
                    test: /\.s[ac]ss$/,
                    use: ["style-loader", "css-loader", "sass-loader"]
                },
            ]
        }
    };
};
