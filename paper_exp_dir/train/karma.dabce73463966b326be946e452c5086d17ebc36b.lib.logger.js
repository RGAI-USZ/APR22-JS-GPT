var format = require('util').format;

var LEVELS = ['result', 'error', 'warn', 'info', 'debug'];
var COLORS = [ 36,       31,      33,     36,     90];

var globalConfig = {
logLevel: 3,
useColors: true
};

var isDefined = function(value) {
return typeof value !== 'undefined';
};

var Logger = function(name, level) {
var createMethod = function(type) {
return function() {
var currentLevel =  isDefined(level) ? level : globalConfig.logLevel;
var index = LEVELS.indexOf(type);


if (index > currentLevel) {
return;
}

var args = Array.prototype.slice.call(arguments);
var prefix = name ? type +  ' (' + name + '):' : type + ':';

if (globalConfig.useColors) {
prefix = '\x1B[' + COLORS[index] + 'm' + prefix + '\x1B[39m';
}

args[0] = prefix + ' ' + args[0];
console.log(format.apply(null, args));
};
};


LEVELS.forEach(function(level) {
this[level] = createMethod(level);
}, this);
};

exports.create = function(name, level) {
return new Logger(name, level);
};

exports.setLevel = function(level) {
globalConfig.logLevel = level;
};

exports.useColors = function(use) {
globalConfig.useColors = !!use;
};
