
/*!
 * Express - View
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('../utils')
  , extname = utils.extname
  , dirname = utils.dirname
  , basename = utils.basename
  , fs = require('fs')
  , stat = fs.statSync;

/**
 * Memory cache.
 */

var cache = {};

/**
 * Existance cache.
 */

var exists = {};

/**
 * Initialize a new `View` with the given `view` path and `options`.
 *
 * @param {String} view
 * @param {Object} options
 * @api private
 */

var View = exports = module.exports = function View(view, options) {
  options = options || {};
  // TODO: more caching
  this.view = view;
  this.root = options.root;
  this.relative = false !== options.relative;
  this.defaultEngine = options.defaultEngine;
  this.parent = options.parentView;
  this.basename = basename(view);
  this.engine = this.resolveEngine();
  this.extension = '.' + this.engine;
  this.path = this.resolvePath();
  this.dirname = dirname(this.path);
};

/**
 * Check if the view path exists.
 *
 * @return {Boolean}
 * @api public
 */

View.prototype.__defineGetter__('exists', function(){
  var path = this.path;
  if (null != exists[path]) {
    return exists[path];
  } else {
    try {
      stat(path);
      return exists[path] = true;
    } catch (err) {
      return exists[path] = false;
    }
  }
});

/**
 * Resolve view engine.
 *
 * @return {String}
 * @api private
 */

View.prototype.resolveEngine = function(){
  // Explicit
  if (~this.basename.indexOf('.')) return extname(this.basename).substr(1);
  // Inherit from parent
  if (this.parent) return this.parent.engine;
  // Default
  return this.defaultEngine;
};

/**
 * Resolve view path.
 *
 * @return {String}
 * @api private
 */

View.prototype.resolvePath = function(){
  var path = this.view;
  // Implicit engine
  if (!~this.basename.indexOf('.')) path += this.extension;
  // Absolute
  if ('/' == path[0]) return path;
  // Relative to parent
  if (this.relative && this.parent) return this.parent.dirname + '/' + path;
  // Relative to root
  return this.root
    ? this.root + '/' + path
    : path;
};

/**
 * Get view contents. This is a one-time hit, so we
 * can afford to be sync.
 *
 * @return {String}
 * @api public
 */

View.prototype.__defineGetter__('contents', function(){
  return fs.readFileSync(this.path, 'utf8');
});

/**
 * Get template engine api, cache exports to reduce
 * require() calls.
 *
 * @return {Object}
 * @api public
 */

View.prototype.__defineGetter__('templateEngine', function(){
  var ext = this.extension;
  return cache[ext] || (cache[ext] = require(this.engine));
});

/**
 * Return index path alternative.
 *
 * @return {String}
 * @api public
 */

View.prototype.__defineGetter__('indexPath', function(){
  return this.dirname
    + '/' + this.basename.replace(this.extension, '')
    + '/index' + this.extension;
});

/**
 * Return _ prefix path alternative
 *
 * @return {String}
 * @api public
 */

View.prototype.__defineGetter__('prefixPath', function(){
  return this.dirname + '/_' + this.basename;
});

/**
 * Register the given template engine `exports`
 * as `ext`. For example we may wish to map ".html"
 * files to jade:
 *
 *    app.register('.html', require('jade'));
 *
 * or
 *
 *    app.register('html', require('jade'));
 *
 * This is also useful for libraries that may not
 * match extensions correctly. For example my haml.js
 * library is installed from npm as "hamljs" so instead
 * of layout.hamljs, we can register the engine as ".haml":
 *
 *    app.register('.haml', require('haml-js'));
 *
 * @param {String} ext
 * @param {Object} obj
 * @api public
 */

exports.register = function(ext, exports) {
  if ('.' != ext[0]) ext = '.' + ext;
  cache[ext] = exports;
};
