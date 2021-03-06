













var fstream    = require('fstream');
var mkdirp     = require('mkdirp');
var events     = require('events');
var rimraf     = require('rimraf');
var semver     = require('semver');
var async      = require('async');
var https      = require('https');
var http       = require('http');
var path       = require('path');
var url        = require('url');
var tmp        = require('tmp');
var fs         = require('fs');
var crypto     = require('crypto');
var unzip      = require('unzip');
var tar        = require('tar');

var config     = require('./config');
var source     = require('./source');
var template   = require('../util/template');
var readJSON   = require('../util/read-json');
var fileExists = require('../util/file-exists');
var isRepo     = require('../util/is-repo');
var spawn      = require('../util/spawn');
var UnitWork   = require('./unit_work');

var Package = function (name, endpoint, manager) {
this.dependencies = {};
this.json         = {};
this.name         = name;
this.manager      = manager;
this.unitWork     = manager ? manager.unitWork : new UnitWork;
this.opts         = manager ? manager.opts : {};

if (endpoint) {
var split;

if (/^(.*\.git)$/.exec(endpoint)) {
this.gitUrl = RegExp.$1.replace(/^git\+/, '');
this.tag    = false;

} else if (/^(.*\.git)#(.*)$/.exec(endpoint)) {
this.tag    = RegExp.$2;
this.gitUrl = RegExp.$1.replace(/^git\+/, '');

} else if (/^(?:(git):|git\+(https?):)\/\/([^#]+)#?(.*)$/.exec(endpoint)) {
this.gitUrl = (RegExp.$1 || RegExp.$2) + '://' + RegExp.$3;
this.tag    = RegExp.$4;

} else if (semver.validRange(endpoint)) {
this.tag = endpoint;

} else if (/^[\.\/~]\.?[^.]*\.(js|css)/.test(endpoint) && fs.statSync(endpoint).isFile()) {
this.path      = path.resolve(endpoint);
this.assetType = path.extname(endpoint);

} else if (/^https?:\/\
this.assetUrl  = endpoint;
this.assetType = path.extname(endpoint);

} else if (fileExists.sync((split = endpoint.split('#', 2))[0]) && fs.statSync(split[0]).isDirectory()) {
this.path = path.resolve(split[0]);
this.tag  = split[1];

} else if (/^[\.\/~]/.test(endpoint)) {
this.path = path.resolve(endpoint);

} else if (endpoint.split('/').length === 2) {
split = endpoint.split('#', 2);
this.gitUrl = 'git://github.com/' + split[0] + '.git';
this.tag = split[1];
} else {
split = endpoint.split('#', 2);
this.tag = split[1];
}


if (!this.name) {
if (this.gitUrl) this.name = path.basename(endpoint).replace(/(\.git)?(#.*)?$/, '');
else if (this.path) this.name = path.basename(this.path, this.assetType);
else if (this.assetUrl) this.name = this.name = path.basename(this.assetUrl, this.assetType);
else if (split) this.name = split[0];
}



if (this.tag) this.originalTag = this.tag;
if (this.path) this.originalPath = endpoint;


this.id = crypto.createHash('md5').update(this.name + '%' + this.tag + '%' + this.gitUrl +  '%' + this.path + '%' + this.assetUrl).digest('hex');


if (this.gitUrl) this.generateResourceId();
}

if (this.manager) {
this.on('data',  this.manager.emit.bind(this.manager, 'data'));
this.on('error', function (err, origin) {
this.manager.emit('error', err, origin || this);
}.bind(this));
}


this.waitUnlock = this.waitUnlock.bind(this);

this.setMaxListeners(30);
};

Package.prototype = Object.create(events.EventEmitter.prototype);

Package.prototype.constructor = Package;

Package.prototype.resolve = function () {


if (this.unitWork.isLocked(this.name)) return this.unitWork.on('unlock', this.waitUnlock);

var data = this.unitWork.retrieve(this.name);
if (data) {


if (data.id === this.id) {
this.unserialize(data);
this.emit('resolve');
return this;
}
}


this.unitWork.lock(this.name, this);

if (this.assetUrl) {
this.download();
} else if (this.gitUrl) {
this.clone();
} else if (this.path) {
this.copy();
} else {
this.once('lookup', this.clone).lookup();
}

return this;
};

Package.prototype.lookup = function () {
source.lookup(this.name, function (err, url) {
if (err) return this.emit('error', err);
this.lookedUp = true;
this.gitUrl = url;
this.generateResourceId();
this.emit('lookup');
}.bind(this));
};

Package.prototype.install = function () {

if (this.unitWork.retrieve(this.name)) {
template('action', { name: 'installing', shizzle: this.name + (this.version ? '#' + this.version : '') })
.on('data', this.emit.bind(this, 'data'));
}

var localPath = this.localPath;

if (path.resolve(this.path) === localPath) {
this.emit('install');
return this;
}




isRepo(localPath, function (is) {
if (is) {
var err = new Error('Local path is a local repository');
err.details = 'To avoid loosing work, please remove ' + localPath + ' manually.';
return this.emit('error', err, this);
}

mkdirp(path.dirname(localPath), function (err) {
if (err) return this.emit('error', err);
rimraf(localPath, function (err) {
if (err) return this.emit('error', err);
return fs.rename(this.path, localPath, function (err) {
if (!err) return this.cleanUpLocal();

var writter = fstream.Writer({
type: 'Directory',
path: localPath
});
writter
.on('error', this.emit.bind(this, 'error'))
.on('end', rimraf.bind(this, this.path, this.cleanUpLocal.bind(this)));

fstream.Reader(this.path)
.on('error', this.emit.bind(this, 'error'))
.pipe(writter);
}.bind(this));
}.bind(this));
}.bind(this));
}.bind(this));

return this;
};

Package.prototype.cleanUpLocal = function () {
this.json.name    = this.name;
this.json.version = this.commit ? '0.0.0' : this.version;


if (this.commit) this.json.commit = this.commit;
else delete this.json.commit;

if (this.gitUrl) this.json.repository = { type: 'git', url: this.gitUrl };
else if (this.gitPath) this.json.repository = { type: 'local-repo', path: this.originalPath };
else if (this.originalPath) this.json.repository = { type: 'local', path: this.originalPath };
else if (this.assetUrl) this.json = this.generateAssetJSON();

var jsonStr = JSON.stringify(this.json, null, 2);
fs.writeFile(path.join(this.localPath, config.json), jsonStr);
if (this.gitUrl || this.gitPath) fs.writeFile(path.join(this.gitPath, config.json), jsonStr);

rimraf(path.join(this.localPath, '.git'), this.emit.bind(this, 'install'));
};

Package.prototype.generateAssetJSON = function () {
return {
name: this.name,
main: this.assetType !== '.zip' && this.assetType !== '.tar' ? 'index' + this.assetType : '',
version: '0.0.0',
repository: { type: 'asset', url: this.assetUrl }
};
};

Package.prototype.uninstall = function () {
template('action', { name: 'uninstalling', shizzle: this.path })
.on('data', this.emit.bind(this, 'data'));
rimraf(this.path, function (err) {
if (err) return this.emit('error', err);
this.emit('uninstall');
}.bind(this));
};


Package.prototype.loadJSON = function () {
if (!this.path || this.assetUrl) return this.emit('loadJSON');

var jsonFile = path.join(this.path, config.json);
fileExists(jsonFile, function (exists) {

if (!exists) {
return this.once('describeTag', function (tag) {
tag = semver.clean(tag);
if (!tag) this.version = this.tag;
else {
this.version = tag;
if (!this.tag) this.tag = this.version;
}

this.emit('loadJSON');
}.bind(this)).describeTag();
}

readJSON(jsonFile, function (err, json) {
if (err) return this.emit('error', err);

this.json    = json;
this.version = this.commit || json.commit || json.version;
this.commit  = this.commit || json.commit;


if (!this.name) this.name = json.name;


this.readEndpoint();



var cleanedTag;
if (this.tag && (cleanedTag = semver.clean(this.tag)) && cleanedTag !== this.version) {

if (!this.unitWork.retrieve('mismatch#' + this.name + '_' + cleanedTag)) {
template('warning-mismatch', { name: this.name, json: config.json, tag: cleanedTag, version: this.version || 'N/A' })
.on('data', this.emit.bind(this, 'data'));
this.unitWork.store('mismatch#' + this.name + '_' + cleanedTag, true);
}

this.version = cleanedTag;
}

this.emit('loadJSON');
}.bind(this), this);
}.bind(this));
};

Package.prototype.download = function () {
template('action', { name: 'downloading', shizzle: this.assetUrl })
.on('data', this.emit.bind(this, 'data'));

var src  = url.parse(this.assetUrl);
var req  = src.protocol === 'https:' ? https : http;

if (process.env.HTTP_PROXY) {
src = url.parse(process.env.HTTP_PROXY);
src.path = this.assetUrl;
}

tmp.dir({ prefix: 'bower-' + this.name + '-' }, function (err, tmpPath) {
var file = fs.createWriteStream(path.join((this.path = tmpPath), 'index' + this.assetType));

req.get(src, function (res) {

if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
template('action', { name: 'redirect detected', shizzle: this.assetUrl })
.on('data', this.emit.bind(this, 'data'));
this.assetUrl = res.headers.location;
return this.download();
}


if (res.statusCode < 200 || res.statusCode >= 300) {
return this.emit('error', new Error(res.statusCode + ' status code for ' + this.assetUrl));
}

res.on('data', function (data) {
file.write(data);
});

res.on('end', function () {
file.end();

var next = function () {
this.once('loadJSON', this.saveUnit).loadJSON();
}.bind(this);

if (this.assetType === '.zip' || this.assetType === '.tar') this.once('extract', next).extract();
else next();
}.bind(this));

}.bind(this)).on('error', this.emit.bind(this, 'error'));

}.bind(this));
};

Package.prototype.extract = function () {
var file = path.join(this.path, 'index' + this.assetType);
template('action', { name: 'extracting', shizzle: file }).on('data', this.emit.bind(this, 'data'));

fs.createReadStream(file).pipe(this.assetType === '.zip' ? unzip.Extract({ path: this.path }) : tar.Extract({ path: this.path }))
.on('error', this.emit.bind(this, 'error'))
.on('end', function () {

fs.unlink(file, function (err) {
if (err) return this.emit('error', err);


fs.readdir(this.path, function (err, files) {
if (err) return this.emit('error', err);

if (files.length !== 1) return this.emit('extract');

var dir = path.join(this.path, files[0]);
fs.stat(dir, function (err, stat) {
if (err) return this.emit('error', err);
if (!stat.isDirectory()) return this.emit('extract');

fs.readdir(dir, function (err, files) {
if (err) return this.emit('error', err);

async.forEachSeries(files, function (file, next) {
fs.rename(path.join(dir, file), path.join(this.path, file), next);
}.bind(this), function (err) {
if (err) return this.emit('error');

fs.rmdir(dir, function (err) {
if (err) return this.emit('error');
this.emit('extract');
}.bind(this));
}.bind(this));
}.bind(this));
}.bind(this));
}.bind(this));
}.bind(this));
}.bind(this));
};

Package.prototype.copy = function () {
template('action', { name: 'copying', shizzle: this.path }).on('data', this.emit.bind(this, 'data'));

tmp.dir({ prefix: 'bower-' + this.name + '-' }, function (err, tmpPath) {
fs.stat(this.path, function (err, stats) {
if (err) return this.emit('error', err);


fs.chmod(tmpPath, stats.mode, function (err) {
if (err) return this.emit('error', err);

if (this.assetType) {
return fs.readFile(this.path, function (err, data) {
fs.writeFile(path.join((this.path = tmpPath), 'index' + this.assetType), data, function () {
this.once('loadJSON', this.saveUnit).loadJSON();
}.bind(this));
}.bind(this));
}

this.once('loadJSON', function () {
if (this.gitUrl) return this.saveUnit();



fileExists(path.join(this.path, '.git'), function (exists) {
if (!exists) return this.saveUnit();

this.gitPath = this.path;
this.once('loadJSON', this.saveUnit.bind(this)).checkout();
}.bind(this));
}.bind(this));

var writter = fstream.Writer({
type: 'Directory',
path: (this.path = tmpPath)
})
.on('error', this.emit.bind(this, 'error'))
.on('end', this.loadJSON.bind(this));

fstream.Reader(this.path)
.on('error', this.emit.bind(this, 'error'))
.pipe(writter);
}.bind(this));
}.bind(this));
}.bind(this));
};

Package.prototype.getDeepDependencies = function (result) {
result = result || [];
for (var name in this.dependencies) {
result.push(this.dependencies[name]);
this.dependencies[name].getDeepDependencies(result);
}
return result;
};

Package.prototype.saveUnit = function () {
this.unitWork.store(this.name, this.serialize(), this);
this.unitWork.unlock(this.name, this);
this.addDependencies();
};

Package.prototype.addDependencies = function () {
var dependencies = this.json.dependencies || {};
var callbacks    = Object.keys(dependencies).map(function (name) {
return function (callback) {
var endpoint = dependencies[name];
this.dependencies[name] = new Package(name, endpoint, this);
this.dependencies[name].once('resolve', callback).resolve();
}.bind(this);
}.bind(this));
async.parallel(callbacks, this.emit.bind(this, 'resolve'));
};

Package.prototype.exists = function (callback) {
fileExists(this.localPath, callback);
};

Package.prototype.clone = function () {
template('action', { name: 'cloning', shizzle: this.gitUrl }).on('data', this.emit.bind(this, 'data'));
this.path = this.gitPath;
this.once('cache', function () {
this.once('loadJSON', this.copy.bind(this)).checkout();
}.bind(this)).cache();
};

Package.prototype.cache = function () {



if (this.opts.force && !this.unitWork.retrieve('flushed#' + this.name + '_' + this.resourceId)) {
rimraf(this.path, function (err) {
if (err) return this.emit('error', err);
this.unitWork.store('flushed#' + this.name + '_' + this.resourceId, true);
this.cache();
}.bind(this));
return this;
}

mkdirp(config.cache, function (err) {
if (err) return this.emit('error', err);
fileExists(this.path, function (exists) {
if (exists) {
template('action', { name: 'cached', shizzle: this.gitUrl }).on('data', this.emit.bind(this, 'data'));
return this.emit('cache');
}
template('action', { name: 'caching', shizzle: this.gitUrl }).on('data', this.emit.bind(this, 'data'));
var url = this.gitUrl;
if (process.env.HTTP_PROXY) {
url = url.replace(/^git:/, 'https:');
}

mkdirp(this.path, function (err) {
if (err) return this.emit('error', err);

var cp = spawn('git', ['clone', url, this.path], null, this);
cp.on('close', function () {
this.emit('cache');
}.bind(this));
}.bind(this));
}.bind(this));
}.bind(this));
};

Package.prototype.checkout = function () {
template('action', { name: 'fetching', shizzle: this.name })
.on('data', this.emit.bind(this, 'data'));

this.once('versions', function (versions) {
if (!versions.length) {
this.emit('checkout');
this.loadJSON();
}


if (this.tag) {
versions = versions.filter(function (version) {
return semver.satisfies(version, this.tag);
}.bind(this));

if (!versions.length) {
return this.emit('error', new Error(
'Can\'t find tag satisfying: ' + this.name + '#' + this.tag
));
}
}


this.tag = versions[0];
if (!semver.valid(this.tag)) this.commit = this.tag;

if (this.tag) {
template('action', {
name: 'checking out',
shizzle: this.name + '#' + this.tag
}).on('data', this.emit.bind(this, 'data'));


spawn('git', [ 'checkout', this.tag, '-f'], { cwd: this.path }, this).on('close', function () {

spawn('git', ['clean', '-f', '-d'], { cwd: this.path }, this).on('close', function () {
this.emit('checkout');
this.loadJSON();
}.bind(this));
}.bind(this));
}
}).versions();
};

Package.prototype.describeTag = function () {
var cp = spawn('git', ['describe', '--always', '--tag'], { cwd: this.gitPath || this.path, ignoreCodes: [128] }, this);
var tag = '';

cp.stdout.setEncoding('utf8');
cp.stdout.on('data',  function (data) {
tag += data;
});

cp.on('close', function (code) {
if (code === 128) tag = 'unspecified'.grey;
this.emit('describeTag', tag.replace(/\n$/, ''));
}.bind(this));
};

Package.prototype.versions = function () {
this.once('fetch', function () {
var cp = spawn('git', ['tag'], { cwd: this.gitPath }, this);

var versions = '';

cp.stdout.setEncoding('utf8');
cp.stdout.on('data',  function (data) {
versions += data;
});

cp.on('close', function () {
versions = versions.split('\n');
versions = versions.filter(function (ver) {
return semver.valid(ver);
});
versions = versions.sort(function (a, b) {
return semver.gt(a, b) ? -1 : 1;
});

if (versions.length) return this.emit('versions', versions);



versions = '';
cp = spawn('git', ['log', '-n', 1, '--format=%H'], { cwd: this.gitPath }, this);

cp.stdout.setEncoding('utf8');
cp.stdout.on('data', function (data) {
versions += data;
});
cp.on('close', function () {
versions = versions.split('\n');
this.emit('versions', versions);
}.bind(this));
}.bind(this));
}.bind(this)).fetch();
};

Package.prototype.fetch = function () {
fileExists(this.gitPath, function (exists) {
if (!exists) return this.emit('error', new Error('Unable to fetch package ' + this.name + ' (if the cache was deleted, run install again)'));

var cp = spawn('git', ['fetch'], { cwd: this.gitPath }, this);
cp.on('close', function () {
cp = spawn('git', ['reset', '--hard', 'HEAD'], { cwd: this.gitPath }, this);
cp.on('close', function () {
this.emit('fetch');
}.bind(this));
}.bind(this));
}.bind(this));
};

Package.prototype.fetchEndpoint = function () {
var obj = this.readEndpoint(true);

if (obj) this.emit('fetchEndpoint', obj.endpoint, obj.type);
else this.emit('fetchEndpoint');
};

Package.prototype.readEndpoint = function (replace) {
if (!this.json.repository) return;

if (this.json.repository.type === 'git') {
if (replace || !this.gitUrl) {
this.gitUrl = this.json.repository.url;
this.generateResourceId();
}
return { type: 'git', endpoint: this.gitUrl };
}
if (this.json.repository.type === 'local-repo') {
if (replace || !this.gitPath) {
this.gitPath = path.resolve(this.json.repository.path);
}
return { type: 'local', endpoint: this.path };
}
if (this.json.repository.type === 'local') {
if (replace || !this.path) {
this.path = path.resolve(this.json.repository.path);
}
return { type: 'local', endpoint: this.path };
}
if (this.json.repository.type === 'asset') {
if (replace || !this.assetUrl) {
this.assetUrl = this.json.repository.url;
this.assetType = path.extname(this.assetUrl);
}
return { type: 'asset', endpoint: this.assetUrl };
}
};

Package.prototype.waitUnlock = function (name) {
if (this.name === name) {
this.unitWork.removeListener('unlock', this.waitUnlock);
this.resolve();
}
};

Package.prototype.serialize = function () {
return {
id: this.id,
resourceId: this.resourceId,
path: this.path,
originalPath: this.originalPath,
tag: this.tag,
originalTag: this.originalTag,
commit: this.commit,
assetUrl: this.assetUrl,
assetType: this.assetType,
lookedUp: this.lookedUp,
json: this.json,
gitUrl: this.gitUrl,
gitPath: this.gitPath,
dependencies: this.dependencies
};
};

Package.prototype.unserialize = function (obj) {
for (var key in obj) {
this[key] = obj[key];
}

this.version = this.tag;
};

Package.prototype.generateResourceId = function () {
this.resourceId = crypto.createHash('md5').update(this.name + '%' + this.gitUrl).digest('hex');
this.gitPath = path.join(config.cache, this.name, this.resourceId);
};

Package.prototype.__defineGetter__('localPath', function () {
return path.join(process.cwd(), config.directory, this.name);
});

module.exports = Package;
