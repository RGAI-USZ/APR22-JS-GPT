var fs = require('fs');
var crypto = require('crypto');
var mm = require('minimatch');

var log = require('./logger').create('preprocess');


var sha1 = function(data) {
var hash = crypto.createHash('sha1');
hash.update(data);
return hash.digest('hex');
};


var createPreprocessor = function(config, basePath, injector) {
var patterns = Object.keys(config);

return function(file, done) {

var processor;

for (var i = 0; i < patterns.length; i++) {
if (mm(file.originalPath, patterns[i])) {
try {
processor = injector.get('preprocessor:' + config[patterns[i]]);
break;
} catch (e) {

log.warn('Pre-processor "%s" is not registered!', config[patterns[i]]);
}
}
}

if (processor) {
return fs.readFile(file.originalPath, function(err, buffer) {

var env = process.env;
var tmp = env.TMPDIR || env.TMP || env.TEMP || '/tmp';
file.contentPath = tmp + '/'  + sha1(file.originalPath) + '.js';

processor(buffer.toString(), file, function(processed) {
fs.writeFile(file.contentPath, processed, function() {
done();
});
});
});
}

return process.nextTick(done);
