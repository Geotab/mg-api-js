module.exports = {
  lib: {
    template: 'umd',
    indent: '  ',
    src: 'lib/api.js',
    dest: 'dist/api.js',
    returnExportsGlobal: '<%= name %>',
    deps: {
      default: [],
      amd: [],
      cjs: [],
      global: []
    }
  }
}
