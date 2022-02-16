
/*!
 * Express - Server
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var sys = require('sys'),
    url = require('url'),
    view = require('./view'),
    connect = require('connect'),
    queryString = require('querystring'),
    router = require('connect/middleware/router');

/**
 * Initialize a new `Server` with optional `middleware`.
 *
 * @param {Array} middleware
 * @api public
 */

var Server = exports = module.exports = function Server(middleware){
    var self = this;
    this.config = {};
    this.settings = {};
    this.redirects = {};
    connect.Server.call(this, middleware || []);

    // Expose objects to each other
    this.use('/', function(req, res, next){
        req.params = req.params || {};
        req.params.get = {};
        res.headers = {};
        req.app = res.app = self;
        req.res = res;
        res.req = req;
        // Assign req.params.get
        if (req.url.indexOf('?') > 0) {
            // TODO: consider simple substr to increase performance
            var query = url.parse(req.url).query;
            req.params.get = queryString.parse(query);
        }
        next();
    });

    // Use router, expose as app.get(), etc
    this.use('/', router(function(app){
        self.routes = app;
    }));
};

/**
 * Inherit from `connect.Server`.
 */

sys.inherits(Server, connect.Server);

/**
 * Listen on the given `port` after running configuration blocks.
 *
 * @param {Number} port
 * @api public
 */

Server.prototype.listen = function(port){
    this.set('env', process.env.EXPRESS_ENV || process.connectEnv.name);
    this.runConfig('any', this.set('env'));

    // Setup view reloading
    if (this.set('reload views')) {
        view.watcher.call(this, this.set('reload views'));
    }

    // Custom exception handler
    if (this.errorHandler) {
        this.use('/', this.errorHandler);
    }
    
    connect.Server.prototype.listen.call(this, port);
};

/**
 * Run config callbacks for the given environment(s);
 *
 * @param {String} env ...
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.runConfig = function(){
    for (var i = 0, len = arguments.length; i < len; ++i) {
        var env = arguments[i];
        if (env in this.config) {
            var config = this.config[env];
            config.forEach(function(fn){
                fn.call(this);
            }, this);
        }
    }
    return this;
};

/**
 * Assign a custom exception handler callback `fn`.
 *
 * @param {Function} fn
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.error = function(fn){
    this.errorHandler = fn;
    return this;
};

/**
 * Assign `setting` to `val`, or return `setting`'s value.
 *
 * @param {String} setting
 * @param {String} val
 * @return {Server|Mixed} for chaining, or the setting value
 * @api public
 */

Server.prototype.set = function(setting, val){
    if (val === undefined) {
        return this.settings[setting];
    } else {
        this.settings[setting] = val;
        return this;
    }
};

/**
 * Enable `setting`.
 *
 * @param {String} setting
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.enable = function(setting){
    return this.set(setting, true);
};

/**
 * Disable `setting`.
 *
 * @param {String} setting
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.disable = function(setting){
    return this.set(setting, false);
};

/**
 * Redirect `key` to `url`.
 *
 * @param {String} key
 * @param {String} url
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.redirect = function(key, url){
    this.redirects[key] = url;
    return this;
};

/**
 * Disable `setting`.
 *
 * @param {String} setting
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.configure = function(env, fn){
    if (typeof env === 'function') fn = env, env = 'any';
    (this.config[env] = this.config[env] || []).push(fn);
    return this;
};

// Generate routing methods

(function(method){
    Server.prototype[method] = function(path, fn){
        this.routes[method](path, fn);
        return this;
    };
    return arguments.callee;
})('get')('post')('put')('del');
