module.exports = {
  lib: {
    template: 'umd',
    indent: '  ',
    src: 'lib/api.js',
    dest: 'dist/api.js',
    objectToExport: 'GeotabApi',
    globalAlias: 'GeotabApi',
    deps: {
      default: [],
      amd: [],
      cjs: [],
      global: []
    }
  }
}
