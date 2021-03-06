var mout = require('mout');
var Logger = require('bower-logger');
var Project = require('../core/Project');
var cli = require('../util/cli');
var defaultConfig = require('../config');

function prune(names, config) {
    var project;
    var logger = new Logger();

    config = mout.object.deepFillIn(config || {}, defaultConfig);
    project = new Project(config, logger);

    // If names is an empty array, null them
    if (names && !names.length) {
        names = null;
    }

    // Figure out extraneous
    project.getTree()
    .spread(function (tree, flattened, extraneous) {
        var names;

        names = extraneous.map(function (extra) {
            return extra.endpoint.name;
        });

        // Uninstall them
        project.uninstall(names)
        .then(function (removed) {
            logger.emit('end', removed);
        })
        .fail(function (error) {
            logger.emit('error', error);
        });
    });

    return logger;
}

// -------------------

prune.line = function () {
    return prune();
};

prune.options = function (argv) {
    return cli.readOptions(argv);
};

prune.completion = function () {
    // TODO:
};

module.exports = prune;
