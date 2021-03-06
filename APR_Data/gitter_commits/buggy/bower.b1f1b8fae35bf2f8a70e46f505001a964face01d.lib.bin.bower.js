process.bin = process.title = 'bower';

var Q = require('q');
var mout = require('mout');
var Logger = require('bower-logger');
var userHome = require('user-home');
var bower = require('../');
var version = require('../version');
var cli = require('../util/cli');
var rootCheck = require('../util/rootCheck');

var options;
var renderer;
var loglevel;
var command;
var commandFunc;
var logger;
var levels = Logger.LEVELS;

options = cli.readOptions({
    'version': { type: Boolean, shorthand: 'v' },
    'help': { type: Boolean, shorthand: 'h' },
    'allow-root': { type: Boolean }
});

// Handle print of version
if (options.version) {
    process.stdout.write(version + '\n');
    process.exit();
}

// Root check
rootCheck(options, bower.config);

// Set loglevel
if (bower.config.silent) {
    loglevel = levels.error;
} else if (bower.config.verbose) {
    loglevel = -Infinity;
    Q.longStackSupport = true;
} else if (bower.config.quiet) {
    loglevel = levels.warn;
} else {
    loglevel = levels[bower.config.loglevel] || levels.info;
}

// Get the command to execute
while (options.argv.remain.length) {
    command = options.argv.remain.join(' ');

    // Alias lookup
    if (bower.abbreviations[command]) {
        command = bower.abbreviations[command].replace(/\s/g, '.');
        break;
    }

    command = command.replace(/\s/g, '.');

    // Direct lookup
    if (mout.object.has(bower.commands, command)) {
        break;
    }

    options.argv.remain.pop();
}

// Execute the command
commandFunc = command && mout.object.get(bower.commands, command);
command = command && command.replace(/\./g, ' ');

// If no command was specified, show bower help
// Do the same if the command is unknown
if (!commandFunc) {
    logger = bower.commands.help();
    command = 'help';
// If the user requested help, show the command's help
// Do the same if the actual command is a group of other commands (e.g.: cache)
} else if (options.help || !commandFunc.line) {
    logger = bower.commands.help(command);
    command = 'help';
// Call the line method
} else {
    logger = commandFunc.line(process.argv);

    // If the method failed to interpret the process arguments
    // show the command help
    if (!logger) {
        logger = bower.commands.help(command);
        command = 'help';
    }
}

// Get the renderer and configure it with the executed command
renderer = cli.getRenderer(command, logger.json, bower.config);

function handleLogger(logger, renderer) {
    logger
    .on('end', function (data) {
        if (!bower.config.silent && !bower.config.quiet) {
            renderer.end(data);
        }
    })
    .on('error', function (err)  {
        if (command !== 'help' && err.code === 'EREADOPTIONS') {
            logger = bower.commands.help(command);
            renderer = cli.getRenderer('help', logger.json, bower.config);
            handleLogger(logger, renderer);
        } else {
            if (levels.error >= loglevel) {
                renderer.error(err);
            }

            process.exit(1);
        }
    })
    .on('log', function (log) {
        if (levels[log.level] >= loglevel) {
            renderer.log(log);
        }
    })
    .on('prompt', function (prompt, callback) {
        renderer.prompt(prompt)
        .then(function (answer) {
            callback(answer);
        });
    });
}

handleLogger(logger, renderer);

// Warn if HOME is not SET
if (!userHome) {
    logger.warn('no-home', 'HOME environment variable not set. User config will not be loaded.');
}

if (bower.config.interactive) {
    var updateNotifier = require('update-notifier');

    // Check for newer version of Bower
    var notifier = updateNotifier({ pkg: { name: 'bower', version: version } });

    if (notifier.update && levels.info >= loglevel) {
        notifier.notify();
    }
}
