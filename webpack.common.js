const path = require('path');

module.exports = {
    entry: './lib/api.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'api.js',
        library: 'GeotabApi',
        libraryTarget: 'umd',
        globalObject: 'typeof self !== "undefined" ? self : this'
    },
    target: 'node',
    node: {
        fs: 'empty'
    }
}