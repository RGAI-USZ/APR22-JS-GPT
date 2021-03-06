module.exports = function(grunt) {

  var exec = require('child_process').exec;

  /**
   * Show content of the package to double check before publishing
   */
  grunt.registerTask('npm-show', 'Show files that would be published to npm.', function() {
    var done = this.async();

    exec('npm pack', function(err, pkgFile) {
      exec('tar -tf ' + pkgFile, function(err, pkgContent) {
        console.log(pkgContent);
        exec('rm ' + pkgFile, done);
      });
    });
  });


  /**
   * Publish to NPM
   */
  grunt.registerTask('npm-publish', 'Publish to NPM.', function() {
    this.requires('build');

    var done = this.async();
    exec('npm publish --tag canary', function(err, output, error) {
      if (err) return grunt.fail.fatal(err.message.replace(/\n$/, '.'));
      grunt.log.ok('Published to NPM @canary');
      done();
    });
  });
};
