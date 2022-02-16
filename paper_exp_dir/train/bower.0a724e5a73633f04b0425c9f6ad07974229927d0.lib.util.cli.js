var mout = require('mout');
var nopt = require('nopt');
var renderers = require('../renderers');

function readOptions(options, argv) {
var types;
var noptOptions;
var parsedOptions = {};
var shorthands = {};

if (Array.isArray(options)) {
argv = options;
options = {};
} else {
options = options || {};
}

types = mout.object.map(options, function (option) {
return option.type;
});
mout.object.forOwn(options, function (option, name) {
shorthands[option.shorthand] = '--' + name;
});

noptOptions = nopt(types, shorthands, argv);



mout.object.forOwn(noptOptions, function (value, key) {
if (options[key]) {
parsedOptions[mout.string.camelCase(key)] = value;
}
});

parsedOptions.argv = noptOptions.argv;

return parsedOptions;
}