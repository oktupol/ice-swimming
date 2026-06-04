const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const htmlPage = (template, filename) => new HtmlWebpackPlugin({
    template,
    filename: path.resolve(__dirname, filename),
    inject: 'head',
    scriptLoading: 'defer',
});

module.exports = {
    entry: "./src/js/main.js",
    mode: "production",
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "bundle.js",
    },
    plugins: [
        htmlPage('./src/html/index.ejs', 'index.html'),
        htmlPage('./src/html/imprint.ejs', 'imprint.html'),
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
            {
                test: /\.html$/,
                loader: path.resolve(__dirname, 'template-loader.js'),
            },
        ]
    }
}