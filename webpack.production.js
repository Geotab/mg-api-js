const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                exclude: [/node_modules/],
                use: [
                    {
                        loader: 'eslint-loader',
                        options: {
                        formatter: require('eslint/lib/cli-engine/formatters/stylish')
                        },
                    },
                ],
            },
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env',
                            { 
                                'targets': {
                                    'ie': '11'
                                }
                            }]
                        ]
                    }
                },
            },
        ]
    },
    // plugins: [
    //     new UglifyJsPlugin({
    //         test: /\.js(\?.*)?$/i
    //     }),
    // ]
});