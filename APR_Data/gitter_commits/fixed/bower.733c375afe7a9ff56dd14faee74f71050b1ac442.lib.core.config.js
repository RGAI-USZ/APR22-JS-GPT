var path = require('path');
var fs = require('fs');
var mout = require('mout');
var mkdirp = require('mkdirp');

// Guess some needed properties based on the user OS
var temp = process.env.TMPDIR
    || process.env.TMP
    || process.env.TEMP
    || process.platform === 'win32' ? 'c:\\windows\\temp' : '/tmp';

var home = (process.platform === 'win32'
    ? process.env.USERPROFILE
    : process.env.HOME) || temp;

var roaming = process.platform === 'win32'
    ? path.resolve(process.env.APPDATA || home || temp)
    : path.resolve(home || temp);

var folder = process.platform === 'win32'
    ? 'bower'
    : '.bower';

// Guess proxy defined in the env
var proxy = process.env.HTTPS_PROXY
    || process.env.https_proxy
    || process.env.HTTP_PROXY
    || process.env.http_proxy;

// -----------

// Read global bower config
var config;
try {
    config = require('rc')('bower', {
        cwd: process.cwd(),
        roaming: path.join(roaming, folder),
        json: 'bower.json',
        directory: 'bower_components',
        proxy: proxy
    });
} catch (e) {
    throw new Error('Unable to parse global .bowerrc file: ' + e.message);
}

// Merge global with local bower config
var localConfig = path.join(config.cwd, '.bowerrc');
try {
    localConfig = fs.readFileSync(localConfig);
    try {
        mout.object.mixIn(config, JSON.parse(localConfig));
    } catch (e) {
        throw new Error('Unable to parse local .bowerrc file: ' + e.message);
    }
} catch (e) {}

// Add aliases that are meant to be used internally
mout.object.mixIn(config, {
    _cache: path.join(config.roaming, 'cache'),
    _links: path.join(config.roaming, 'links'),
    _completion: path.join(config.roaming, 'completion'),
    _gitTemplate: path.join(config.roaming, 'git_template')
});

// -----------

// Make sure that we have our git template directory
// The git template directory is an empty dir that will be set up for every git command
// So that the user git hooks won't be used
try {
    mkdirp.sync(config.gitTemplate);
} catch (e) {
    throw new Error('Unable to create git_template directory: ' + e.message);
}

module.exports = config;
