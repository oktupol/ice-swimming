const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const referencedAssets = new Set();
const refRegex = /\bpublic\/([\w.\-]+)/g;

function scanDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(full);
        } else {
            const content = fs.readFileSync(full, 'utf-8');
            let m;
            while ((m = refRegex.exec(content)) !== null) referencedAssets.add(m[1]);
        }
    }
}
scanDir(path.resolve(__dirname, 'src'));

const htmlPages = fs.readdirSync('./src/html')
    .filter(f => f.endsWith('.ejs'))
    .map(f => new HtmlWebpackPlugin({
        templateContent: () => ejs.renderFile(
            path.resolve(__dirname, 'src/html', f),
            {},
            { root: path.resolve(__dirname, 'src/html') }
        ),
        filename: path.resolve(__dirname, 'dist', f.replace('.ejs', '.html')),
        inject: 'head',
        scriptLoading: 'defer',
    }));

module.exports = {
    entry: "./src/js/main.js",
    mode: "production",
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "bundle.js",
    },
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
}