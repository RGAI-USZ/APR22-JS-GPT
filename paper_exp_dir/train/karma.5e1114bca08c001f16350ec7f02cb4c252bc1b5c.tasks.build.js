module.exports = function(grunt) {


grunt.registerMultiTask('build', 'Wrap given file into a function call.', function() {

var src = grunt.file.expandFiles(this.data).pop();
var dest = src.replace('src.js', 'js');
var wrapper = src.replace('src.js', 'wrapper');

grunt.file.copy(wrapper, dest, {process: function(content) {
var wrappers = content.split(/%CONTENT%\r?\n/);
return wrappers[0] + grunt.file.read(src) + wrappers[1];
}});

grunt.log.ok('Created ' + dest);
});
};
