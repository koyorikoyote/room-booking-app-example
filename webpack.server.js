const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    target: 'node',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/server/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist/server'),
        filename: 'index.js',
        clean: true,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@/server': path.resolve(__dirname, 'src/server'),
            '@/shared': path.resolve(__dirname, 'src/shared'),
        },
    },
    externals: [
        nodeExternals({
            allowlist: ['@prisma/client'],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'swc-loader',
                    options: {
                        jsc: {
                            parser: {
                                syntax: 'typescript',
                                tsx: true,
                            },
                            transform: {
                                react: {
                                    runtime: 'automatic',
                                },
                            },
                            target: 'es2020',
                        },
                        module: {
                            type: 'commonjs',
                        },
                    },
                },
            },
            {
                test: /\.css$/,
                type: 'asset/resource',
                generator: {
                    emit: false,
                },
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: 'asset/resource',
            },
        ],
    },
    optimization: {
        minimize: false,
    },
};
