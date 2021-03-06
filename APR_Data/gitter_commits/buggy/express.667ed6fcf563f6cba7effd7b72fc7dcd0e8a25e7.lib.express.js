
/*!
 * Express
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var connect = require('connect')
  , proto = require('./proto')
  , Route = require('./router/route')
  , utils = connect.utils;

exports = module.exports = createServer;

function createServer() {
  var app = connect();
  utils.merge(app, proto);
  return app;
}

// /**
//  * Re-export connect auto-loaders.
//  * 
//  * This prevents the need to `require('connect')` in order
//  * to access core middleware, so for example `express.logger()` instead
//  * of `require('connect').logger()`.
//  */
// 
// exports = module.exports = connect.middleware;
// 
// /**
//  * Framework version.
//  */
// 
// exports.version = '3.0.0alpha1';
// 
// /**
//  * Shortcut for `new Server(...)`.
//  *
//  * @param {Function} ...
//  * @return {Server}
//  * @api public
//  */
// 
// exports.createServer = function(options){
//   if ('object' == typeof options) {
//     return new HTTPSServer(options, Array.prototype.slice.call(arguments, 1));
//   } else {
//     return new HTTPServer(Array.prototype.slice.call(arguments));
//   }
// };
// 
// /**
//  * Expose constructors.
//  */
// 
// exports.HTTPServer = HTTPServer;
// exports.HTTPSServer = HTTPSServer;
// exports.Route = Route;
// 
// /**
//  * Expose HTTP methods.
//  */
// 
// exports.methods = require('./router/methods');
// 
// /**
//  * View extensions.
//  */
// 
// exports.View =
// exports.view = require('./view');
// 
// /**
//  * Response extensions.
//  */
// 
// require('./response');
// 
// /**
//  * Request extensions.
//  */
// 
// require('./request');
// 
// // Error handler title
// 
// exports.errorHandler.title = 'Express';

