







var Emitter  = require('events').EventEmitter;
var nopt     = require('nopt');

var template = require('../util/template');
var source   = require('../core/source');
var help     = require('./help');

var optionTypes = { help: Boolean };
var shorthand   = { 'h': ['--help'] };

module.exports = function (name) {
var emitter = new Emitter;

var callback = function (err, results) {
if (err) return emitter.emit('error', err);

if (results.length) {
template('search', {results: results})
.on('data', emitter.emit.bind(emitter, 'data'));
} else {
template('search-empty', {results: results})
.on('data', emitter.emit.bind(emitter, 'data'));
}
};

if (name) {
source.search(name, callback);
} else {
source.all(callback);
}

return emitter;
};

module.exports.line = function (argv) {
var options  = nopt(optionTypes, shorthand, argv);
var names    = options.argv.remain.slice(1);

if (options.help) return help('search');
return module.exports(names[0]);
};
