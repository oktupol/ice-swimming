module.exports = {
    entry: "./src/js/main.js",
    mode: "production",
    output: {
        path: `${__dirname}/dist`,
        filename: "bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.s[ac]ss$/,
                use: ["style-loader", "css-loader", "sass-loader"]
            }
        ]
    }
}