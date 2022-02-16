













var spawn    = require('child_process').spawn;
var _        = require('lodash');
var fstream  = require('fstream');
var mkdirp   = require('mkdirp');
var events   = require('events');
var rimraf   = require('rimraf');
var semver   = require('semver');
var async    = require('async');
var https    = require('https');
var http     = require('http');
var path     = require('path');
var url      = require('url');
var tmp      = require('tmp');
var fs       = require('fs');

var config   = require('./config');
var source   = require('./source');
var template = require('../util/template');
var readJSON = require('../util/read-json');
var UnitWork = require('./unit_work');

var Package = function (name, endpoint, manager) {
this.dependencies = {};
this.json         = {};
this.name         = name;
this.manager      = manager;
this.unitWork     = manager ? manager.unitWork : new UnitWork;
this.opts         = manager ? manager.opts : {};

if (endpoint) {

if (/^(.*\.git)$/.exec(endpoint)) {
this.gitUrl = RegExp.$1.replace(/^git\+/, '');
this.tag    = false;

} else if (/^(.*\.git)#(.*)$/.exec(endpoint)) {
this.tag    = RegExp.$2;
this.gitUrl = RegExp.$1.replace(/^git\+/, '');

} else if (/^(?:(git):|git\+(https?):)\/\/([^#]+)#?(.*)$/.exec(endpoint)) {
this.gitUrl = (RegExp.$1 || RegExp.$2) + "://" + RegExp.$3;
this.tag    = RegExp.$4;

} else if (semver.validRange(endpoint)) {
this.tag = endpoint;

} else if (/^[\.\/~]\.?[^.]*\.(js|css)/.test(endpoint) && fs.statSync(endpoint).isFile()) {

this.path      = path.resolve(endpoint);
this.assetType = path.extname(endpoint);
this.name      = this.name.replace(this.assetType, '');

} else if (/^[\.\/~]/.test(endpoint)) {
this.path = path.resolve(endpoint);

} else if (/^https?:\/\
this.assetUrl  = endpoint;
this.assetType = path.extname(endpoint);
this.name      = this.name.replace(this.assetType, '');

} else if (fs.existsSync(endpoint)) {
this.path = path.resolve(endpoint);
} else {
this.tag = endpoint.split('#', 2)[1];
}




this.originalTag = this.tag;




this.id = new Buffer(this.name + '%' + this.tag + '%' + this.gitUrl +  '%' + this.path + '%' + this.assetUrl).toString('base64');
this.resourceId = new Buffer(this.gitUrl + '%' + this.path + '%' + this.assetUrl).toString('base64');
}

if (this.manager) {
this.on('data',  this.manager.emit.bind(this.manager, 'data'));
this.on('error', this.manager.emit.bind(this.manager, 'error'));
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


if (data.resourceId === this.resourceId) {
this.path = data.path;
this.unitWork.lock(this.name, this);
this.once('loadJSON', this.saveUnit).checkout();
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
this.emit('lookup');
}.bind(this));
};

Package.prototype.install = function () {

if (this.version) template('action', { name: 'installing', shizzle: this.name + (this.version ? '#' + this.version : '') })
.on('data', this.emit.bind(this, 'data'));

if (path.resolve(this.path) == this.localPath) {
this.emit('install');
return this;
}

mkdirp(path.dirname(this.localPath), function (err) {
if (err) return this.emit('error', err);
rimraf(this.localPath, function (err) {
if (err) return this.emit('error', err);
return fs.rename(this.path, this.localPath, function (err) {
if (!err) return this.cleanUpLocal();
fstream.Reader(this.path)
.on('error', this.emit.bind(this, 'error'))
.on('end', rimraf.bind(this, this.path, this.cleanUpLocal.bind(this)))
.pipe(
fstream.Writer({
type: 'Directory',
path: this.localPath
})
);
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

if (this.gitUrl) this.json.repository = { type: "git", url: this.gitUrl };
if (this.assetUrl) this.json = this.generateAssetJSON();

var jsonStr = JSON.stringify(this.json, null, 2);
fs.writeFile(path.join(this.localPath, config.json), jsonStr);
fs.writeFile(path.join(path.resolve(config.cache, this.name), config.json), jsonStr);

rimraf(path.join(this.localPath, '.git'), this.emit.bind(this, 'install'));
};

Package.prototype.generateAssetJSON = function () {
var semverParser = new RegExp('(' + semver.expressions.parse.toString().replace(/\$?\/\^?/g, '') + ')');
return {
name: this.name,
main: 'index' + this.assetType,
version: semverParser.exec(this.assetUrl) ? RegExp.$1 : "0.0.0",
repository: { type: "asset", url: this.assetUrl }
};
};

Package.prototype.uninstall = function () {
template('action', { name: 'uninstalling', shizzle: this.path })
.on('data', this.emit.bind(this, 'data'));
rimraf(this.path, function (err) {
if (err) return this.emit('error', err);
this.emit.bind(this, 'uninstall');
}.bind(this));
};


Package.prototype.loadJSON = function (name) {
var pathname = name || ( this.assetType ? 'index' + this.assetType : config.json );
var jsonFile = path.join(this.path, pathname);

readJSON(jsonFile, function (err, json) {
if (err) {


if (!name) {
if (!this.assetType && fs.existsSync(jsonFile)) return this.emit('error', err);
return this.loadJSON('package.json');
}
return this.assetUrl ? this.emit('loadJSON') : this.path && this.on('describeTag', function (tag) {
tag = semver.clean(tag);
if (tag) this.version = this.tag = tag;
else this.version = this.tag;

this.emit('loadJSON');
}.bind(this)).describeTag();
}



if (!this.name) this.name = json.name;
this.json    = json;
this.version = this.commit || json.commit || json.version;
this.commit  = this.commit || json.commit;




this.emit('loadJSON');
}.bind(this), this);
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

tmp.dir(function (err, tmpPath) {

var file = fs.createWriteStream(path.join((this.path = tmpPath), 'index' + this.assetType));

req.get(src, function (res) {


if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
template('action', { name: 'redirect detected', shizzle: this.assetUrl })
.on('data', this.emit.bind(this, 'data'));
this.assetUrl = res.headers.location;
return this.download();
}

res.on('data', function (data) {
file.write(data);
});

res.on('end', function () {
file.end();
this.once('loadJSON', this.saveUnit).loadJSON();
}.bind(this));

}.bind(this)).on('error', this.emit.bind(this, 'error'));

}.bind(this));
};

Package.prototype.copy = function () {
template('action', { name: 'copying', shizzle: this.path }).on('data', this.emit.bind(this, 'data'));

tmp.dir(function (err, tmpPath) {
fs.stat(this.path, function (err, stats) {
if (err) return this.emit('error', err);

fs.chmodSync(tmpPath, stats.mode);

if (this.assetType) {
return fs.readFile(this.path, function (err, data) {
fs.writeFile(path.join((this.path = tmpPath), 'index' + this.assetType), data, function () {
this.once('loadJSON', this.saveUnit).loadJSON();
}.bind(this));
}.bind(this));
}

var reader = fstream.Reader(this.path).pipe(
fstream.Writer({
type: 'Directory',
path: (this.path = tmpPath)
})
);

this.once('loadJSON', this.saveUnit);

reader.on('error', this.emit.bind(this, 'error'));
reader.on('end', this.loadJSON.bind(this));
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
fs.exists(this.localPath, callback);
};

Package.prototype.clone = function () {
template('action', { name: 'cloning', shizzle: this.gitUrl }).on('data', this.emit.bind(this, 'data'));
this.path = path.resolve(config.cache, this.name);
this.once('cache', function () {
this.once('loadJSON', this.copy.bind(this)).checkout();
}.bind(this)).cache();
};

Package.prototype.cache = function () {



if (this.opts.force && !this.unitWork.retrieve('flushed#' + this.name)) {
rimraf(this.path, function (err) {
if (err) return this.emit('error', err);
this.unitWork.store('flushed#' + this.name, true);
this.cache();
}.bind(this));
return this;
}

mkdirp(config.cache, function (err) {
if (err) return this.emit('error', err);
fs.exists(this.path, function (exists) {
if (exists) {
template('action', { name: 'cached', shizzle: this.gitUrl }).on('data', this.emit.bind(this, 'data'));
return this.emit('cache');
}
template('action', { name: 'caching', shizzle: this.gitUrl }).on('data', this.emit.bind(this, 'data'));
var url = this.gitUrl;
if (process.env.HTTP_PROXY) {
url = url.replace(/^git:/, 'https:');
}
var cp = spawn('git', ['clone', url, this.path]);

cp.on('close', function (code) {
if (code != 0) return this.emit('error', new Error('Git status: ' + code));
this.emit('cache');
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
'Can not find tag satisfying: ' + this.name + '#' + this.tag
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


spawn('git', [ 'checkout', this.tag, '-f'], { cwd: this.path }).on('close', function (code) {
if (code != 0) return this.emit('error', new Error('Git status: ' + code));

spawn('git', ['clean', '-f', '-d'], { cwd: this.path }).on('close', function (code) {
if (code != 0) return this.emit('error', new Error('Git status: ' + code));
this.emit('checkout');
this.loadJSON();
}.bind(this));
}.bind(this));
}
}).versions();
};

Package.prototype.describeTag = function () {
var cp = spawn('git', ['describe', '--always', '--tag'], { cwd: path.resolve(config.cache, this.name) });

var tag = '';

cp.stdout.setEncoding('utf8');
cp.stdout.on('data',  function (data) {
tag += data;
});

cp.on('close', function (code) {
if (code == 128) tag = 'unspecified'.grey;
else if (code != 0) return this.emit('error', new Error('Git status: ' + code));
this.emit('describeTag', tag.replace(/\n$/, ''));
}.bind(this));
};

Package.prototype.versions = function () {
this.on('fetch', function () {
var cp = spawn('git', ['tag'], { cwd: path.resolve(config.cache, this.name) });

var versions = '';

cp.stdout.setEncoding('utf8');
cp.stdout.on('data',  function (data) {
versions += data;
});

cp.on('close', function (code) {
versions = versions.split("\n");
versions = versions.filter(function (ver) {
return semver.valid(ver);
});
versions = versions.sort(function (a, b) {
return semver.gt(a, b) ? -1 : 1;
});

if (versions.length) return this.emit('versions', versions);



versions = '';
cp = spawn('git', ['log', '-n', 1, '--format=%H'], { cwd: path.resolve(config.cache, this.name) });

cp.stdout.setEncoding('utf8');
cp.stdout.on('data', function (data) {
versions += data;
});
cp.on('close', function () {
versions = versions.split("\n");
this.emit('versions', versions);
}.bind(this));
}.bind(this));
}.bind(this)).fetch();
};

Package.prototype.fetch = function () {
var cp = spawn('git', ['fetch'], { cwd: path.resolve(config.cache, this.name) });
cp.on('close', function (code) {
if (code != 0) return this.emit('error', new Error('Git status: ' + code));
cp = spawn('git', ['reset', '--hard', 'origin/HEAD'], { cwd: path.resolve(config.cache, this.name) });
cp.on('close', function (code) {
if (code != 0) return this.emit('error', new Error('Git status: ' + code));
this.emit('fetch');
}.bind(this));
}.bind(this));
};

Package.prototype.fetchURL = function () {
if (this.json.repository && this.json.repository.type == 'git') {
this.emit('fetchURL',  this.json.repository.url);
} else {
this.emit('error', new Error('No git url found for ' + this.json.name));
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
tag: this.tag,
originalTag: this.originalTag,
commit: this.commit,
assetUrl: this.assetUrl,
assetType: this.assetType,
lookedUp: this.lookedUp,
json: this.json,
gitUrl: this.gitUrl,
dependencies: this.dependencies
};
};

Package.prototype.unserialize = function (obj) {
for (var key in obj) {
this[key] = obj[key];
}

this.version = this.tag;
};

Package.prototype.__defineGetter__('localPath', function () {
return path.join(process.cwd(), config.directory, this.name);
});

module.exports = Package;