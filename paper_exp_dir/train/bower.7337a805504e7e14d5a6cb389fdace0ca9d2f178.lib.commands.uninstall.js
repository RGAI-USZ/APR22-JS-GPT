







var Emitter  = require('events').EventEmitter;
var async    = require('async');
var nopt     = require('nopt');
var fs       = require('fs');
var path     = require('path');
var _        = require('lodash');

var template = require('../util/template');
var Manager  = require('../core/manager');
var config   = require('../core/config');
var help     = require('./help');

var optionTypes = { help: Boolean, force: Boolean, save: Boolean };
var shorthand   = { 'h': ['--help'], 'S': ['--save'], 'f': ['--force'] };

module.exports = function (names, options) {
var packages, uninstallables, packagesCount = {};
var emitter = new Emitter;
var manager = new Manager;
var jsonDeps;

options = options || {};

manager.on('data',  emitter.emit.bind(emitter, 'data'));
manager.on('error', emitter.emit.bind(emitter, 'error'));

var resolveLocal = function () {
jsonDeps = manager.json.dependencies || {};
packages = _.flatten(_.values(manager.dependencies));
uninstallables = packages.filter(function (pkg) {
return _.include(names, pkg.name);
});
async.forEach(packages, function (pkg, next) {
pkg.once('loadJSON', next).loadJSON();
}, function () {
if (showWarnings(options.force) && !options.force) return;
expandUninstallabes(options.force);
uninstall();
});
};

var showWarnings = function (force) {
var foundConflicts = false;

packages.forEach(function (pkg) {
if (!pkg.json.dependencies) return;
if (containsPkg(uninstallables, pkg)) return;

var conflicts = _.intersection(
Object.keys(pkg.json.dependencies),
_.pluck(uninstallables, 'name')
);

if (conflicts.length) {
foundConflicts = true;
if (!force) {
conflicts.forEach(function (conflictName) {
emitter.emit('data', template('warning-uninstall', { packageName: pkg.name, conflictName: conflictName }, true));
});
}
}
});

if (foundConflicts && !force) {
emitter.emit('data', template('warn', { message: 'To proceed, run uninstall with the --force flag'}, true));
}

return foundConflicts;
};

var expandUninstallabes = function (force) {
var x,
pkg,
forcedUninstallables = {};


for (var key in jsonDeps) {
packagesCount[key] = 1;
}


count(packages, packagesCount);

if (force) {
uninstallables.forEach(function (pkg) {
forcedUninstallables[pkg.name] = true;
});
}



for (x = uninstallables.length - 1; x >= 0; x -= 1) {
parseUninstallableDeps(uninstallables[x]);
}




for (x = uninstallables.length - 1; x >= 0; x -= 1) {
pkg = uninstallables[x];
if (packagesCount[pkg.name] > 0 && !forcedUninstallables[pkg.name]) uninstallables.splice(x, 1);
}
};

var count = function (packages, counts, nested) {
packages.forEach(function (pkg) {
counts[pkg.name] = (counts[pkg.name] || 0);
if (nested) counts[pkg.name] += 1;

if (pkg.json.dependencies) {
for (var key in pkg.json.dependencies) {
count(manager.dependencies[key], counts, true);
}
}
});
};

var parseUninstallableDeps = function (pkg) {
if (!containsPkg(uninstallables, pkg)) uninstallables.push(pkg);
packagesCount[pkg.name] -= 1;

if (pkg.json.dependencies) {
for (var key in pkg.json.dependencies) {
parseUninstallableDeps(manager.dependencies[key][0]);
}
}
};

var containsPkg = function (packages, pkg) {
for (var x = packages.length - 1; x >= 0; x -= 1) {
if (packages[x].name === pkg.name) return true;
}

return false;
};

var uninstall = function () {
async.forEach(uninstallables, function (pkg, next) {
pkg.on('uninstall', function () {
emitter.emit('package', pkg);
next();
}).uninstall();
}, function () {

if (options.save) save();
emitter.emit('end');
});
};
