var lang = require('mout/lang');
var object = require('mout/object');
var rc = require('./util/rc');
var defaults = require('./util/defaults');
var expand = require('./util/expand');
var path = require('path');
var fs = require('fs');

function Config(cwd) {
    this._cwd = cwd || process.cwd();
    this._config = {};
}

Config.prototype.load = function () {
    this._config = rc('bower', defaults, this._cwd);
    return this;
};
/* jshint ignore:start */
Config.prototype.get = function (key) {
    // TODO
};

Config.prototype.set = function (key, value) {
    // TODO
    return this;
};

Config.prototype.del = function (key, value) {
    // TODO
    return this;
};

Config.prototype.save = function (where, callback) {
    // TODO
};
/* jshint ignore:end */

function readCertFile(path) {
    var sep = '-----END CERTIFICATE-----';

    return fs.readFileSync(path, { encoding: 'utf8' })
        .split(sep)
        .filter(function(s) { return !s.match(/^\s*$/); })
        .map(function(s) { return s + sep; });
}

function loadCAs(caConfig) {
    // If a ca file path has been specified, expand that here to the file's
    // contents. As a user can specify these individually, we must load them
    // one by one.
    if (caConfig.search) {
        caConfig.search = caConfig.search.map(function(s) {
            return readCertFile(s);
        });
    }
    ['register', 'publish'].forEach(function(p) {
        if (caConfig[p]) {
            caConfig[p] = readCertFile(caConfig[p]);
        }
    });
}

Config.prototype.toObject = function () {
    var config = lang.deepClone(this._config);

    config = Config.normalise(config);

    // Load CA files and replace their paths with their contents.
    // Do that here so that we have a normalised config object,
    // and so that it is done only once.
    loadCAs(config.ca);

    return config;
};

Config.create = function (cwd) {
    return new Config(cwd);
};

Config.read = function (cwd) {
    var config = new Config(cwd);
    return config.load().toObject();
};

Config.normalise = function (rawConfig) {
    var config = {};

    // Mix in defaults and raw config
    object.deepMixIn(config, expand(defaults), expand(rawConfig));

    // Some backwards compatible things..
    config.shorthandResolver = config.shorthandResolver
    .replace(/\{\{\{/g, '{{')
    .replace(/\}\}\}/g, '}}');

    // Ensure that every registry endpoint does not end with /
    config.registry.search = config.registry.search.map(function (url) {
        return url.replace(/\/+$/, '');
    });
    config.registry.register = config.registry.register.replace(/\/+$/, '');
    config.registry.publish = config.registry.publish.replace(/\/+$/, '');
    config.tmp = path.resolve(config.tmp);

    return config;
};

Config.DEFAULT_REGISTRY = defaults.registry;

module.exports = Config;
