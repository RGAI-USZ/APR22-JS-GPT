/**
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , driver = global.MONGOOSE_DRIVER_PATH || './../drivers/node-mongodb-native'
  , oid = require('../types/objectid');


/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @api private
 */

function ObjectId (key, options) {
  SchemaType.call(this, key, options);
};

/**
 * Inherits from SchemaType.
 */

ObjectId.prototype.__proto__ = SchemaType.prototype;

/**
 * Check required
 *
 * @api private
 */

ObjectId.prototype.checkRequired = function (value) {
  return !!value && value instanceof oid;
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

ObjectId.prototype.applyGetters = function (value, scope) {
  if (this.options.ref && value && value._id && value._id instanceof oid) {
    // means the object id was populated
    return value;
  }

  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

ObjectId.prototype.applySetters = function (value, scope) {
  if (this.options.ref && value && value._id && value._id instanceof oid) {
    // means the object id was populated
    return value;
  }

  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Casts to ObjectId
 *
 * @param {Object} value
 * @param {Object} scope
 * @param {Boolean} whether this is an initialization cast
 * @api private
 */

ObjectId.prototype.cast = function (value, scope, init) {
  if (this.options
   && this.options.ref
   && init
   && value && value._id && value._id instanceof oid) {
    return value;
  }

  if (value === null) return value;

  if (value instanceof oid)
    return value;

  if (value._id && value._id instanceof oid)
    return value._id;

  if (value.toString)
    return oid.fromString(value.toString());

  throw new CastError('object id', value);
};

function handleSingle (val) {
  return this.cast(val);
}

function handleArray (val) {
  var self = this;
  return val.map(function (m) {
    return self.cast(m);
  });
}

ObjectId.prototype.$conditionalHandlers = {
    '$ne': handleSingle
  , '$in': handleArray
  , '$nin': handleArray
  , '$gt': handleSingle
  , '$lt': handleSingle
  , '$gte': handleSingle
  , '$lte': handleSingle
};
ObjectId.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with ObjectId.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    return this.cast(val);
  }
};

/**
 * Adds an auto-generated ObjectId default if turnOn is true.
 * @param {Boolean} turnOn auto generated ObjectId defaults
 * @api private
 */
ObjectId.prototype.auto = function (turnOn) {
  if (turnOn) {
    this.default(function(){
      return new oid();
    });
  }
};

/**
 * Module exports.
 */

module.exports = ObjectId;
