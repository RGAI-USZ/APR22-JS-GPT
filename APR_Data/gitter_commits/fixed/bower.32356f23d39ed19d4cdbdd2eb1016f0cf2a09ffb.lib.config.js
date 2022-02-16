var tty = require('tty');
var object = require('mout').object;
var bowerConfig = require('bower-config');
var cli = require('./util/cli');

var cachedConfigs = {};

function defaultConfig(config) {
    config = config || {};

    var cachedConfig = readCachedConfig(config.cwd || process.cwd());

    return object.merge(cachedConfig, config);
}

function readCachedConfig(cwd) {
    if (cachedConfigs[cwd]) {
        return cachedConfigs[cwd];
    }

    var config = cachedConfigs[cwd] = bowerConfig.read(cwd);

    // Delete the json attribute because it is no longer supported
    // and conflicts with --json
    delete config.json;

    // If interactive is auto (null), guess its value
    if (config.interactive == null) {
        config.interactive = (
            process.bin === 'bower' &&
            tty.isatty(1) &&
            !process.env.CI
        );
    }

    // If `analytics` hasn't been explicitly set, we disable
    // it when ran programatically.
    if (config.analytics == null) {
        // Don't enable analytics on CI server unless explicitly configured.
        config.analytics = config.interactive;
    }

    // Merge common CLI options into the config
    object.mixIn(config, cli.readOptions({
        force: { type: Boolean, shorthand: 'f' },
        offline: { type: Boolean, shorthand: 'o' },
        verbose: { type: Boolean, shorthand: 'V' },
        quiet: { type: Boolean, shorthand: 'q' },
        loglevel: { type: String, shorthand: 'l' },
        json: { type: Boolean, shorthand: 'j' },
        silent: { type: Boolean, shorthand: 's' }
    }));

    return config;
}

function resetCache () {
    cachedConfigs = {};
}

module.exports = defaultConfig;
module.exports.reset = resetCache;
