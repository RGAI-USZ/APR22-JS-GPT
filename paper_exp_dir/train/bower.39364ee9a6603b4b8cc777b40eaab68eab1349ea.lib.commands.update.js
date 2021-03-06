







var Emitter = require('events').EventEmitter;
var async   = require('async');
var nopt    = require('nopt');
var _       = require('lodash');

var Manager   = require('../core/manager');
var help      = require('./help');
var uninstall = require('./uninstall');
var save      = require('../util/save');

var optionTypes = { help: Boolean, save: Boolean, force: Boolean, 'force-latest': Boolean };
var shorthand   = { 'h': ['--help'], 'S': ['--save'], 'f': ['--force'], 'F': ['--force-latest'] };

module.exports = function (names, options) {
options = options || {};

var emitter = new Emitter;
var manager = new Manager([], {
force: options.force,
forceLatest: options['force-latest']
});

manager.on('data',  emitter.emit.bind(emitter, 'data'));
manager.on('error', emitter.emit.bind(emitter, 'error'));

var installURLS = function (err, arr) {
var mappings = {},
endpoints = [];

arr = _.compact(arr);
_.each(arr, function (info) {
endpoints.push(info.endpoint);
mappings[info.endpoint] = info.name;
});

options.endpointNames = mappings;




manager = new Manager(endpoints, options);

manager
.on('data',  emitter.emit.bind(emitter, 'data'))
.on('error', emitter.emit.bind(emitter, 'error'))
.on('resolve', function (resolved) {

if (resolved && options.save) save(manager, null, false, emitter.emit.bind(emitter, 'end'));
else emitter.emit('end');
})
.resolve();
};

manager.once('resolveLocal', function () {
names = names.length ? _.uniq(names) : null;

async.map(_.values(manager.dependencies), function (pkgs, next) {
var pkg = pkgs[0];
pkg.once('loadJSON', function () {
var endpointInfo = pkg.readEndpoint();
if (!endpointInfo) return next();


var endpoint = endpointInfo.endpoint;
var json  = pkg.json;
if (!json.commit && (endpointInfo.type === 'git' || endpointInfo.type === 'local-repo')) {
endpoint += '#' + ((!names || names.indexOf(pkg.name) > -1)  ? '~' : '') + pkg.version;
}

next(null, { name: pkg.name, endpoint: endpoint.endpoint });
}).loadJSON();
