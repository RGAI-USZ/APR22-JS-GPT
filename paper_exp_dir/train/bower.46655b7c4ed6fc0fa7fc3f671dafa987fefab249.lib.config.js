var tty = require('tty');
var object = require('mout').object;
var bowerConfig = require('bower-config');
var Configstore = require('configstore');

var current;

function defaultConfig(config) {
config = config || {};

return readCachedConfig(config.cwd || process.cwd(), config);
}

function readCachedConfig(cwd, overwrites) {
current = bowerConfig.create(cwd).load(overwrites);

var config = current.toObject();

var configstore = new Configstore('bower-github').all;

object.mixIn(config, configstore);



delete config.json;


if (config.interactive == null) {
config.interactive = (
process.bin === 'bower' &&
tty.isatty(1) &&
!process.env.CI
);
}


if (process.bin === 'bower') {
var cli = require('./util/cli');

object.mixIn(config, cli.readOptions({
force: { type: Boolean, shorthand: 'f' },
offline: { type: Boolean, shorthand: 'o' },
verbose: { type: Boolean, shorthand: 'V' },
quiet: { type: Boolean, shorthand: 'q' },
loglevel: { type: String, shorthand: 'l' },
json: { type: Boolean, shorthand: 'j' },
silent: { type: Boolean, shorthand: 's' }
}));
}

return config;
}

function restoreConfig() {
if (current) {
current.restore();
}
}

function resetCache() {
restoreConfig();
current = undefined;
}

module.exports = defaultConfig;
module.exports.restore = restoreConfig;
module.exports.reset = resetCache;
