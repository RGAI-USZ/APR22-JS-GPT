
/*!
 * Express - Server
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var url = require('url')
  , view = require('./view')
  , connect = require('connect')
  , utils = connect.utils
  , queryString = require('querystring')
  , router = require('connect').router
  , methods = router.methods.concat(['del', 'all']);

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
  this.isCallbacks = {};
  this.viewHelpers = {};
  this.dynamicViewHelpers = {};
  this.errorHandlers = [];
  connect.Server.call(this, []);

  // Default "home" to / 
  this.set('home', '/');

  // Set "env" to NODE_ENV, defaulting to "development"
  this.set('env', process.env.NODE_ENV || 'development');

  // Expose objects to each other
  this.use(function(req, res, next){
    req.query = req.query || {};
    res.headers = { 'X-Powered-By': 'Express' };
    req.app = res.app = self;
    req.res = res;
    res.req = req;
    req.next = next;
    // Assign req.params.get
    if (req.url.indexOf('?') > 0) {
      var query = url.parse(req.url).query;
      req.query = exports.parseQueryString(query);
    }
    next();
  });

  // Apply middleware
  if (middleware) {
    middleware.forEach(function(fn){
      self.use(fn);
    });
  }

  // Use router, expose as app.get(), etc
  var fn = router(function(app){ self.routes = app; });
  this.__defineGetter__('router', function(){
    this.__usedRouter = true;
    return fn;
  });

  // Default production configuration
  this.configure('production', function(){
    this.enable('cache views');
  });
};

/**
 * Inherit from `connect.Server`.
 */

Server.prototype.__proto__ = connect.Server.prototype;

/**
 * Support swappable querystring parsers.
 */

exports.parseQueryString = queryString.parse;

/**
 * Proxy in order to register error handlers.
 */

Server.prototype.listen = function(){
  this.registerErrorHandlers();
  connect.Server.prototype.listen.apply(this, arguments);
};

/**
 * Proxy in order to register error handlers.
 */

Server.prototype.listenFD = function(){
  this.registerErrorHandlers();
  connect.Server.prototype.listenFD.apply(this, arguments);
};

/**
 * When using the vhost() middleware register error handlers.
 */

Server.prototype.onvhost = function(){
  this.registerErrorHandlers();
};

/**
 * Register error handlers. This is automatically
 * called from within `Server#listen()` and `Server#listenFD()`.
 *
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.registerErrorHandlers = function(){
  this.errorHandlers.forEach(function(fn){
    this.use(function(err, req, res, next){
      fn.apply(this, arguments);
    });
  }, this);
  return this;
};

/**
 * Proxy `connect.Server#use()` to apply settings to
 * mounted applications.
 *
 * @param {String|Function|Server} route
 * @param {Function|Server} middleware
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.use = function(route, middleware){
  if (typeof route !== 'string') {
    middleware = route, route = '/';
  }

  connect.Server.prototype.use.call(this, route, middleware);

  // Mounted an app
  if (middleware instanceof Server) {
    // Home is /:route/:home
    var app = middleware
      , home = app.set('home');
    if (home === '/') home = '';
    app.set('home', (app.route || '') + home);
    app.parent = this;
    // Mounted hook
    if (app.__mounted) app.__mounted.call(app, this);
  }

  return this;
};

/**
 * Assign a callback `fn` which is called
 * when this `Server` is passed to `Server#use()`.
 *
 * Examples:
 *
 *    var app = express.createServer(),
 *        blog = express.createServer();
 *
 *    blog.mounted(function(parent){
 *        // parent is app
 *        // "this" is blog
 *    });
 *
 *    app.use(blog);
 *
 * @param {Function} fn
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.mounted = function(fn){
  this.__mounted = fn;
  return this;
};

/**
 * See: view.register.
 *
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.register = function(){
  view.register.apply(this, arguments);
  return this;
};

/**
 * Register the given view helpers `obj`. This method
 * can be called several times to apply additional helpers.
 *
 * @param {Object} obj
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.helpers = 
Server.prototype.locals = function(obj){
  utils.merge(this.viewHelpers, obj);
  return this;
};

/**
 * Register the given dynamic view helpers `obj`. This method
 * can be called several times to apply additional helpers.
 *
 * @param {Object} obj
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.dynamicHelpers = function(obj){
  utils.merge(this.dynamicViewHelpers, obj);
  return this;
};

/**
 * Map the given param placeholder `name`(s) to the given callback `fn`.
 *
 * Param mapping is used to provide pre-conditions to routes
 * which us normalized placeholders. For example ":user_id" may
 * attempt to load the user from the database, where as ":num" may 
 * pass the value through `parseInt(num, 10)`.
 *
 * When the callback function accepts only a single argument, the
 * value of placeholder is passed:
 *
 *    app.param('page', function(n){ return parseInt(n, 10); });
 *
 * After which "/users/:page" would automatically provide us with
 * an integer for `req.params.page`. If desired we could use the callback 
 * signature shown below, and immediately `next(new Error('invalid page'))`
 * when `parseInt` fails.
 *
 * Alternatively the callback may accept the request, response, next, and
 * the value, acting like middlware:
 *
 *    app.param('userId', function(req, res, next, id){
 *      User.find(id, function(err, user){
 *        if (err) {
 *          next(err);
 *        } else if (user) {
 *          req.user = user;
 *          next();
 *        } else {
 *          next(new Error('failed to load user'));
 *        }
 *      });
 *    });
 *
 * Now every time ":userId" is present, the associated user object
 * will be loaded and assigned before the route handler is invoked.
 *
 * @param {String|Array} name
 * @param {Function} fn
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.param = function(name, fn){
  if (Array.isArray(name)) {
    name.forEach(function(name){
      this.param(name, fn);
    }, this);
  } else {
    if (':' == name[0]) name = name.substr(1);
    this.routes.param(name, fn);
  }
  return this;
};

/**
 * Assign a custom exception handler callback `fn`.
 * These handlers are always _last_ in the middleware stack.
 *
 * @param {Function} fn
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.error = function(fn){
  this.errorHandlers.push(fn);
  return this;
};

/**
 * Register the given callback `fn` for the given `type`.
 *
 * @param {String} type
 * @param {Function} fn
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.is = function(type, fn){
  if (!fn) return this.isCallbacks[type];
  this.isCallbacks[type] = fn;
  return this;
};

/**
 * Assign `setting` to `val`, or return `setting`'s value.
 * Mounted servers inherit their parent server's settings.
 *
 * @param {String} setting
 * @param {String} val
 * @return {Server|Mixed} for chaining, or the setting value
 * @api public
 */

Server.prototype.set = function(setting, val){
  if (val === undefined) {
    if (this.settings.hasOwnProperty(setting)) {
      return this.settings[setting];
    } else if (this.parent) {
      return this.parent.set(setting);
    }
  } else {
    this.settings[setting] = val;
    return this;
  }
};

/**
 * Check if `setting` is enabled.
 *
 * @param {String} setting
 * @return {Boolean}
 * @api public
 */

Server.prototype.enabled = function(setting){
  return !!this.set(setting);
};

/**
 * Check if `setting` is disabled.
 *
 * @param {String} setting
 * @return {Boolean}
 * @api public
 */

Server.prototype.disabled = function(setting){
  return !this.set(setting);
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
 * Configure callback for the given `env`.
 *
 * @param {String} env
 * @param {Function} fn
 * @return {Server} for chaining
 * @api public
 */

Server.prototype.configure = function(env, fn){
  if (typeof env === 'function') {
    fn = env, env = 'all';
  }
  if ('all' == env || env == this.settings.env) {
    fn.call(this);
  }
  return this;
};

// Generate routing methods

function generateMethod(method){
  Server.prototype[method] = function(path, fn){
    var self = this;

    // Ensure router is mounted
    if (!this.__usedRouter) {
      this.use(this.router);
    }

    // Route specific middleware support
    if (arguments.length > 2) {
      var args = Array.prototype.slice.call(arguments, 1);
      fn = args.pop();
      (function stack(middleware){
        middleware.forEach(function(fn){
          if (Array.isArray(fn)) {
            stack(fn);
          } else {
            self[method](path, fn);
          }
        });
      })(args);
    }

    // Generate the route
    this.routes[method](path, fn);
    return this;
  };
  return arguments.callee;
}

methods.forEach(generateMethod);

// Alias delete as "del"

Server.prototype.del = Server.prototype.delete;
