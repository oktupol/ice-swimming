const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const htmlPages = fs.readdirSync('./src/html')
    .filter(f => f.endsWith('.ejs'))
    .map(f => new HtmlWebpackPlugin({
        template: `./src/html/${f}`,
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
    plugins: htmlPages,
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
            {
                test: /\.html$/,
                loader: path.resolve(__dirname, 'template-loader.js'),
            },
        ]
    }
}