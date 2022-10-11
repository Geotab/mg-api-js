const path = require('path');

module.exports = {
    entry: './lib/api.js',
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'api.min.js',
        library: 'GeotabApi',
        libraryTarget: 'umd',
        globalObject: 'typeof self !== "undefined" ? self : this'
    },
    target: 'node',
    resolve: {
      fallback: {
        fs: false
      }
    }
}
