/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * MongooseTimeoutError constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function MongooseTimeoutError(message) {
  MongooseError.call(this, message);
  this.name = 'MongooseTimeoutError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

MongooseTimeoutError.prototype = Object.create(MongooseError.prototype);
MongooseTimeoutError.prototype.constructor = MongooseError;

/*!
 * ignore
 */

MongooseTimeoutError.prototype.assimilateError = function(err) {
  this.message = err.message;
  Object.assign(this, err, {
    name: 'MongooseTimeoutError'
  });

  return this;
};

module.exports = MongooseTimeoutError;
