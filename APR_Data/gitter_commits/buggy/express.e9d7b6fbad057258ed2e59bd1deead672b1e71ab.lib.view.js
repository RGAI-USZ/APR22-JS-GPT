
/*!
 * Express - View
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var path = require('path')
  , utils = require('./utils')
  , fs = require('fs')
  , dirname = path.dirname
  , basename = path.basename
  , extname = path.extname
  , exists = path.existsSync
  , join = path.join;

/**
 * Expose `View`.
 */

module.exports = View;

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name 
 *   - `engines` template engine require() cache 
 *   - `root` root path for view lookup 
 *
 * @param {String} name
 * @param {Object} options
 * @api private
 */

function View(name, options) {
  options = options || {};
  this.name = name;
  this.root = options.root;
  var engines = options.engines;
  this.defaultEngine = options.defaultEngine;
  var ext = this.ext = extname(name);
  if (!ext) name += (ext = this.ext = '.' + this.defaultEngine);
  this.engine = engines[ext] || (engines[ext] = require(ext.slice(1)).render);
  this.path = this.lookup(name);
  this.string = this.contents();
}

/**
 * Return the contents of this view.
 *
 * @return {String}
 * @api private
 */

View.prototype.contents = function(){
  return fs.readFileSync(this.path, 'utf8');
};

/**
 * Lookup view by the given `path`
 *
 * @param {String} path
 * @return {String}
 * @api private
 */

View.prototype.lookup = function(path){
  var ext = this.ext;

  // <path>.<engine>
  if (!utils.isAbsolute(path)) path = join(this.root, path);
  if (exists(path)) return path;

  // <path>/index.<engine>
  path = join(dirname(path), basename(path, ext), 'index' + ext);
  if (exists(path)) return path;
};

/**
 * Render with the given `options` and callback `fn(err, str)`.
 *
 * @param {Object} options
 * @param {Function} fn
 * @api private
 */

View.prototype.render = function(options, fn){
  options.filename = this.path;
  this.engine(this.string, options, fn);
};
