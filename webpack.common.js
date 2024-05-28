const path = require('path');

module.exports = {
    entry: './lib/index.js',
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'api.min.js',
        library: {
          name: 'GeotabApi',
          type: 'umd',
        },
        globalObject: 'this'
    },
    resolve: {
      fallback: {
        path: false,
        fs: false
      }
    }
}
