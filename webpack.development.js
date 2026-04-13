const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = merge(common, {
    plugins: [
        new ESLintPlugin({
            configType: 'flat',
            overrideConfigFile: path.resolve(__dirname, 'eslint.config.mjs'),
            extensions: ['js'],
            exclude: ['node_modules']
        })
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                },
            },
        ]
    },
    devServer: {
      static: path.join(__dirname),
        compress: true,
        port: 9000
    }
});
