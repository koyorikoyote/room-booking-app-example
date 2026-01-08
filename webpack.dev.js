const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: './dist/client',
        hot: true,
        port: 3003,
        host: '127.0.0.1',
        historyApiFallback: true,
        proxy: [
            {
                context: ['/api'],
                target: 'http://127.0.0.1:3002',
                changeOrigin: true,
                ws: true,
                secure: false,
            },
        ],
    },
    output: {
        filename: '[name].bundle.js',
        path: require('path').resolve(__dirname, 'dist/client'),
        clean: true,
        publicPath: '/',
    },
});
