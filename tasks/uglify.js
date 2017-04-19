module.exports = {
  options: {
    banner: '<%= banner %>'
  },
  dist: {
    src: '<%= concat.dist.dest %>',
    dest: 'dist/api.min.js'
  }
}
