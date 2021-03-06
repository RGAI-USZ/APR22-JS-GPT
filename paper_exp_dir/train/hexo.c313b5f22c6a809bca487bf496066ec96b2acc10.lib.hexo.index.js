'use strict';

var Promise = require('bluebird');
var pathFn = require('path');
var tildify = require('tildify');
var Database = require('warehouse');
var _ = require('lodash');
var chalk = require('chalk');
var EventEmitter = require('events').EventEmitter;
var fs = require('hexo-fs');
var Module = require('module');
var vm = require('vm');
var pkg = require('../../package.json');
var createLogger = require('./create_logger');
var extend = require('../extend');
var Render = require('./render');
var registerModels = require('./register_models');
var Post = require('./post');
var Scaffold = require('./scaffold');
var Source = require('./source');
var Router = require('./router');
var Theme = require('../theme');
var Locals = require('./locals');
var defaultConfig = require('./default_config');
var loadDatabase = require('./load_database');

var libDir = pathFn.dirname(__dirname);
var sep = pathFn.sep;
var dbVersion = 1;

function Hexo(base, args){
base = base || process.cwd();
args = args || {};

EventEmitter.call(this);

this.base_dir = base + sep;
this.public_dir = pathFn.join(base, 'public') + sep;
this.source_dir = pathFn.join(base, 'source') + sep;
this.plugin_dir = pathFn.join(base, 'node_modules') + sep;
this.script_dir = pathFn.join(base, 'scripts') + sep;
this.scaffold_dir = pathFn.join(base, 'scaffolds') + sep;
this.theme_dir = pathFn.join(base, 'themes', defaultConfig.theme) + sep;
this.theme_script_dir = pathFn.join(this.theme_dir, 'scripts') + sep;

this.env = {
args: args,
debug: Boolean(args.debug),
safe: Boolean(args.safe),
silent: Boolean(args.silent),
env: process.env.NODE_ENV || 'development',
version: pkg.version,
init: false
};

this.config_path = args.config ? pathFn.resolve(base, args.config)
: pathFn.join(base, '_config.yml');

this.extend = {
console: new extend.Console(),
deployer: new extend.Deployer(),
filter: new extend.Filter(),
generator: new extend.Generator(),
helper: new extend.Helper(),
migrator: new extend.Migrator(),
processor: new extend.Processor(),
renderer: new extend.Renderer(),
tag: new extend.Tag()
};

this.config = _.clone(defaultConfig);

this.log = createLogger(this.env);

this.render = new Render(this);

this.route = new Router();

this.post = new Post(this);

this.scaffold = new Scaffold(this);

this._dbLoaded = false;

this._isGenerating = false;

this.database = new Database({
version: dbVersion,
path: pathFn.join(base, 'db.json')
});

registerModels(this);

this.source = new Source(this);
this.theme = new Theme(this);
this.locals = new Locals(this);
this._bindLocals();
}

require('util').inherits(Hexo, EventEmitter);

Hexo.prototype._bindLocals = function(){
var db = this.database;
var locals = this.locals;
var self = this;

locals.set('posts', function(){
var query = {};

if (!self.config.future){
query.date = {$lte: Date.now()};
}

if (!self._showDrafts()){
query.published = true;
}

return db.model('Post').find(query);
});

locals.set('pages', function(){
var query = {};

if (!self.config.future){
query.date = {$lte: Date.now()};
}

return db.model('Page').find(query);
});

locals.set('categories', function(){
return db.model('Category');
});

locals.set('tags', function(){
return db.model('Tag');
});

locals.set('data', function(){
var obj = {};

db.model('Data').forEach(function(data){
obj[data._id] = data.data;
});

return obj;
});
};

Hexo.prototype.init = function(){
var self = this;

this.log.debug('Hexo version: %s', chalk.magenta(this.version));
this.log.debug('Working directory: %s', chalk.magenta(tildify(this.base_dir)));


require('../plugins/console')(this);
require('../plugins/filter')(this);
require('../plugins/generator')(this);
require('../plugins/helper')(this);
require('../plugins/processor')(this);
require('../plugins/renderer')(this);
require('../plugins/tag')(this);


return Promise.each([
'update_package',
'load_config',
'load_plugins'
], function(name){
return require('./' + name)(self);
}).then(function(){
return self.execFilter('after_init', null, {context: self});
}).then(function(){

self.emit('ready');
});
};

Hexo.prototype.call = function(name, args, callback){
if (!callback && typeof args === 'function'){
callback = args;
args = {};
}

var self = this;

return new Promise(function(resolve, reject){
var c = self.extend.console.get(name);

if (c){
c.call(self, args).then(resolve, reject);
} else {
reject(new Error('Console `' + name + '` has not been registered yet!'));
}
}).nodeify(callback);
};

Hexo.prototype.model = function(name, schema){
return this.database.model(name, schema);
};

Hexo.prototype.loadPlugin = function(path, callback){
var self = this;

return fs.readFile(path).then(function(script){

var module = new Module(path);
module.filename = path;
module.paths = Module._nodeModulePaths(path);

function require(path){
return module.require(path);
}

require.resolve = function(request){
return Module._resolveFilename(request, module);
};

require.main = process.mainModule;
require.extensions = Module._extensions;
require.cache = Module._cache;

script = '(function(exports, require, module, __filename, __dirname, hexo){' +
script + '});';

var fn = vm.runInThisContext(script, path);

return fn(module.exports, require, module, path, pathFn.dirname(path), self);
}).nodeify(callback);
};

Hexo.prototype._showDrafts = function(){
var args = this.env.args;
return args.draft || args.drafts || this.config.render_drafts;
};

Hexo.prototype.load = function(callback){
var self = this;

return loadDatabase(this).then(function(){
return Promise.all([
self.source.process(),
self.theme.process()
]);
}).then(function(){
return self._generate({cache: true});
}).nodeify(callback);
};

Hexo.prototype.watch = function(callback){
var self = this;

function generate(){
return self._generate({cache: false});
}

return loadDatabase(this).then(function(){
return Promise.all([
self.source.watch(),
self.theme.watch()
]);
}).then(function(){
self.on('processAfter', generate);
return generate();
}).nodeify(callback);
};

Hexo.prototype.unwatch = function(){
stopWatcher(this.source);
stopWatcher(this.theme);
};

function stopWatcher(box){
if (box.isWatching()) box.unwatch();
}

Hexo.prototype._generate = function(options){
if (this._isGenerating) return;

options = options || {};
this._isGenerating = true;

var config = this.config;
var generators = this.extend.generator.list();
var route = this.route;
var keys = Object.keys(generators);
var self = this;
var routeList = route.list();
var log = this.log;
var theme = this.theme;
var newRouteList = [];
var siteLocals = {};

this.emit('generateBefore');

function Locals(path, locals){
this.page = _.extend({
path: path
}, locals);

this.path = path;
this.url = config.url + config.root + path;
}

Locals.prototype.config = config;
Locals.prototype.theme = _.extend({}, config, theme.config, config.theme_config);
Locals.prototype._ = _;
Locals.prototype.layout = 'layout';
Locals.prototype.cache = options.cache;
Locals.prototype.env = this.env;
Locals.prototype.view_dir = pathFn.join(this.theme_dir, 'layout') + sep;


return this.execFilter('before_generate', null, {context: this})
.then(function(){
self.locals.invalidate();
siteLocals = self.locals.toObject();
Locals.prototype.site = siteLocals;


return Promise.map(keys, function(key){
var generator = generators[key];

return generator.call(self, siteLocals).then(function(data){
log.debug('Generator: %s', chalk.magenta(key));
return data;
});
}).reduce(function(result, data){
return data ? result.concat(data) : result;
}, []);
})

.each(function(item){
if (typeof item !== 'object' || item.path == null) return;

var path = route.format(item.path);
var data = item.data;
var layout = item.layout;

newRouteList.push(path);

if (!layout){
return route.set(path, data);
}

if (Array.isArray(layout)){
layout = _.uniq(layout);
} else {
layout = [layout];
}

var locals = new Locals(path, data);
var layoutLength = layout.length;
var cache;

function saveCache(result){
cache = result;
return result;
}

return self.execFilter('template_locals', locals, {context: self})
.then(function(locals){
route.set(path, function(){
if (options.cache && cache != null) return cache;

var view, name;

for (var i = 0; i < layoutLength; i++){
name = layout[i];
view = theme.getView(name);

if (view){
log.debug('Rendering %s: %s', name, chalk.magenta(path));
return view.render(locals).then(saveCache);
}
}

log.warn('No layout: %s', chalk.magenta(path));
});
});
}).then(function(){

var removed = _.difference(routeList, newRouteList);

for (var i = 0, len = removed.length; i < len; i++){
route.remove(removed[i]);
}

routeList.length = 0;
newRouteList.length = 0;

self.emit('generateAfter');


return self.execFilter('after_generate', null, {context: self});
