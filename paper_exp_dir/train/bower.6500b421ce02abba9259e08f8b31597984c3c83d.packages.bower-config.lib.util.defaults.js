var path = require('path');
var paths = require('./paths');


var proxy = process.env.HTTP_PROXY
|| process.env.http_proxy
|| null;

var httpsProxy = process.env.HTTPS_PROXY
|| process.env.https_proxy
|| proxy;

var noProxy = process.env.NO_PROXY
|| process.env.no_proxy;



var userAgent = !proxy && !httpsProxy
? 'node/' + process.version + ' ' + process.platform + ' ' + process.arch
: 'curl/7.21.4 (universal-apple-darwin11.0) libcurl/7.21.4 OpenSSL/0.9.8r zlib/1.2.5';

var defaults = {
'directory': 'bower_components',
'registry': 'https://registry.bower.io',
'shorthand-resolver': 'https://github.com/{{owner}}/{{package}}.git',
'tmp': paths.tmp,
'proxy': proxy,
'https-proxy': httpsProxy,
'no-proxy': noProxy,
'timeout': 30000,
'ca': { search: [] },
'strict-ssl': true,
'user-agent': userAgent,
'color': true,
'interactive': null,
'storage': {
packages: path.join(paths.cache, 'packages'),
links: path.join(paths.data, 'links'),
completion: path.join(paths.data, 'completion'),
registry: path.join(paths.cache, 'registry'),
empty: path.join(paths.data, 'empty')
}
};

module.exports = defaults;
