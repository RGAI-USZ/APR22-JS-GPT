







var Emitter = require('events').EventEmitter;
var archy   = require('archy');
var nopt    = require('nopt');
var path    = require('path');
var _       = require('lodash');

var template = require('../util/template');
var Manager  = require('../core/manager');
var Package  = require('../core/package');
var config   = require('../core/config');
var help     = require('./help');

var shorthand   = { 'h': ['--help'], 'o': ['--offline'] };
var optionTypes = { help: Boolean, paths: Boolean, map: Boolean, offline: Boolean, sources: Boolean };

var getTree = function (packages, subPackages, result) {
result = result || {};

_.each(subPackages || packages, function (pkg) {

result[pkg.name] = {};

Object.keys(pkg.json.dependencies || {}).forEach(function (name) {
result[pkg.name][name] = {};
});

var subPackages = {};

Object.keys(pkg.json.dependencies || {}).forEach(function (name) {
subPackages[name] = packages[name] || new Package(name, null);
});

getTree(packages, subPackages, result[pkg.name]);
});

return result;
};

var generatePath = function (name, main) {
if (typeof main === 'string') {
return path.join(config.directory, name, main);
} else if (_.isArray(main)) {
main = main.map(function (main) { return generatePath(name, main); });
return main.length === 1 ? main[0] : main;
}
};

var mainTypes = ['main', 'scripts', 'styles', 'templates', 'images'];

var buildSource = function (pkg, shallow) {
var result = {};

if (pkg) {
mainTypes.forEach(function (type) {
if (pkg.json[type]) result[type] = generatePath(pkg.name, pkg.json[type]);
});
}

if (shallow) {
result.main = getMain(result) || generatePath(pkg.name, '');
}

return result;
};

var getMain = function (source) {
for (var i = 0, len = mainTypes.length; i < len; i += 1) {
var type = mainTypes[i];
if (source[type]) {
return source[type];
}
}
};

var shallowTree = function (packages, tree) {
var result = {};

Object.keys(tree).forEach(function (packageName) {
result[packageName] = buildSource(packages[packageName], true).main;
});

return result;
};

var deepTree = function (packages, tree) {

var result = {};

Object.keys(tree).forEach(function (packageName) {

result[packageName] = {};
result[packageName].source = buildSource(packages[packageName]);

if (Object.keys(tree[packageName]).length) {
result[packageName].dependencies = deepTree(packages, tree[packageName]);
}

});

return result;
};

var getNodes = function (packages, tree) {
return Object.keys(tree).map(function (key) {
var version = packages[key] ? packages[key].version || '' : null;
var upgrade;

if (version && packages[key].tags.indexOf(version)) {
upgrade = packages[key].tags[0];
}

if (Object.keys(tree[key]).length) {
return {
label: template('tree-branch', { 'package': key, version: version, upgrade: upgrade }, true),
nodes: getNodes(packages, tree[key])
};
} else {
return template('tree-branch', { 'package': key, version: version, upgrade: upgrade }, true);
}
});
};

var getDependencySrcs = function (list) {
var srcs = [];
var dependency, main;
for (var name in list) {
dependency = list[name];
main = dependency.source && getMain(dependency.source);

if (dependency.dependencies) {
var depSrcs = getDependencySrcs(dependency.dependencies);
srcs.push.apply(srcs, depSrcs);
}


if (main) {
if (Array.isArray(main)) {
srcs.push.apply(srcs, main);
} else {
srcs.push(main);
}
}

}
return srcs;
};

var organizeSources = function (tree) {

var srcs = getDependencySrcs(tree);

var sources = {};

srcs.forEach(function (src) {
var ext = path.extname(src);
sources[ext] = sources[ext] || [];
if (sources[ext].indexOf(src) === -1) {
sources[ext].push(src);
}
});

return sources;
};

module.exports = function (options) {
var manager = new Manager;
var emitter = new Emitter;

options = options || {};

if (options.sources) {
options.map = true;
}

var emitOut = function (obj) {

var output = options.argv ? JSON.stringify(obj, null, 2) : obj;
emitter.emit('data', output);
};
manager
.on('data',  emitter.emit.bind(emitter, 'data'))
.on('warn',  emitter.emit.bind(emitter, 'warn'))
.on('error', emitter.emit.bind(emitter, 'error'))
.on('list', function (packages) {


var tree = getTree(packages);
if (!options.paths && !options.map) {
emitter.emit('data', archy({
label: process.cwd(),
nodes: getNodes(packages, tree)
}));
