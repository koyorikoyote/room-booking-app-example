const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
    output: {
        filename: '[name].[contenthash].js',
        chunkFilename: '[name].[contenthash].chunk.js',
        path: require('path').resolve(__dirname, 'dist/client'),
        clean: true,
        publicPath: '/',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'styles.[contenthash].css',
        }),
        new WebpackManifestPlugin({
            fileName: 'manifest.json',
            publicPath: '/',
        }),
    ],
    optimization: {
        minimize: true,
    },
});
