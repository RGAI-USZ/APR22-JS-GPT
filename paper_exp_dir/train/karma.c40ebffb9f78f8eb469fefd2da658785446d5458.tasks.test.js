module.exports = function(grunt) {
var TRAVIS = process.env.TRAVIS;
var BROWSERS = TRAVIS ? 'Firefox,PhantomJS' : 'Chrome,ChromeCanary,Firefox,Opera,Safari,PhantomJS';


grunt.registerMultiTask('test', 'Run tests.', function() {
var specDone = this.async();

var exec = function(cmd, args, failMsg) {
var child = grunt.utils.spawn({cmd: cmd, args: args}, function(err, result, code) {
if (code) {
console.error(err);
grunt.fail.fatal(failMsg, code);
} else {
specDone();
}
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
};



if (this.target === 'e2e') {
var tests = grunt.file.expand(this.data);
var processToKill;
var cmd = './bin/testacular';
var args = [
'start', null, '--single-run', '--no-auto-watch', '--reporter=dots', '--browsers=' + BROWSERS
];

var next = function(err, result, code) {
if (processToKill) {
processToKill.kill();
}

if (err || code) {

grunt.fail.fatal('E2E test "' + args[1] + '" failed.', code);
} else {
args[1] = tests.shift();
if (args[1]) {
if (args[1] === 'test/e2e/angular-scenario/testacular.conf.js') {
processToKill = grunt.utils.spawn({
cmd: 'node', args: ['test/e2e/angular-scenario/server.js']
}, function() {});
}

grunt.log.writeln('Running ' + cmd + args.join(' '));
var child = grunt.utils.spawn({cmd: cmd, args: args}, next);

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
} else {
specDone();
}
}
};



if (arguments.length) {
var slicedArgs = Array.prototype.slice.call(arguments);

tests = tests.filter(function(configFile) {
return slicedArgs.some(function(test) {
return configFile.indexOf(test) !== -1;
});
});
}

return next();
}



else if (this.target === 'unit') {
exec('jasmine-node', ['--coffee', this.data], 'Unit tests failed.');
}



else if (this.target === 'client') {
exec('testacular', ['start', this.data, '--single-run', '--no-auto-watch', '--reporter=dots',
'--browsers=' + BROWSERS], 'Client unit tests failed.');
}
});
};
