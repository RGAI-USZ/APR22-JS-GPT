
/**
 * Module dependencies.
 */

var Document = require('./document')
  , MongooseArray = require('./types/array')
  , DocumentArray = require('./types/documentarray')
  , MongooseBuffer = require('./types/buffer')
  , MongooseError = require('./error')
  , Query = require('./query')
  , utils = require('./utils')
  , EventEmitter = utils.EventEmitter
  , merge = utils.merge
  , Promise = require('./promise');

/**
 * Model constructor
 *
 * @param {Object} values to set
 * @api public
 */

function Model (doc) {
  Document.call(this, doc);
};

/**
 * Inherits from Document.
 */

Model.prototype.__proto__ = Document.prototype;

/**
 * Connection the model uses. Set by the Connection or if absent set to the
 * default mongoose connection;
 *
 * @api public
 */

Model.prototype.db;

/**
 * Collection the model uses. Set by Mongoose instance
 *
 * @api public
 */

Model.prototype.collection;

/**
 * Model name.
 *
 * @api public
 */

Model.prototype.modelName;

/**
 * Returns what paths can be populated
 *
 * @param {query} query object
 * @return {Object] population paths
 * @api private
 */

Model.prototype.getPopulationKeys = function (query) {
  var paths = {};

  if (query && query.options.populate) {
    for (var name in query.options.populate) {
      var schema = this.schema.path(name);

      if (!schema) {
        // if the path is not recognized, it's potentially embedded docs
        // walk path atoms from right to left to find a matching path
        var pieces = name.split('.')
          , len = pieces.length;

        for (var i = pieces.length; i > 0; i--) {
          var path = pieces.slice(0, i).join('.')
            , pathSchema = this.schema.path(path);

          // loop until we find an array schema
          if (pathSchema && pathSchema.caster) {
            if (!paths[path]) {
              paths[path] = query.options.populate[name];
              paths[path].sub = {};
            }

            paths[path].sub[pieces.slice(i).join('.')] = 1;
            break;
          }
        }
      } else {
        paths[name] = query.options.populate[name];
      }
    }
  }

  return paths;
};

/**
 * Populates an object
 *
 * @param {SchemaType} schema type for the oid
 * @param {Object} object id or array of object ids
 * @param {Array} fields to select
 * @param {Function} callback
 * @api private
 */

Model.prototype.populate = function (schema, oid, fields, fn) {
  if (Array.isArray(oid)) {
    if (oid.length) {
      var total = oid.length
        , model = this.model(schema.caster.options.ref)
        , arr = []

      oid.forEach(function (id, i) {
        // TODO: optimize with $in and an array ObjectId
        model.findById(id, fields, function (err, obj) {
          if (err) return fn(err);
          arr[i] = obj;
          --total || fn(null, arr);
        });
      });
    } else {
      fn(null, oid);
    }
  } else {
    this.model(schema.options.ref).findById(oid, fields, fn)
  }
};

/**
 * Performs auto-population of relations.
 *
 * @param {Object} document returned by mongo
 * @param {Query} query that originated the initialization
 * @param {Function} callback
 * @api private
 */

Model.prototype.init = function (doc, query, fn) {
  if ('function' == typeof query) {
    fn = query;
    query = null;
  }

  var populate = this.getPopulationKeys(query)
    , self = this;

  if (!Object.keys(populate).length) {
    // if no population from other models is necessary
    return Document.prototype.init.call(this, doc, fn);
  }

  function error (err) {
    if (fn.run) return;
    fn.run = true;
    fn(err);
  }

  function init (obj, prefix, fn) {
    prefix = prefix || '';

    var keys = Object.keys(obj)
      , len = keys.length;

    function next () {
      if (--len < 0) return fn();

      var i = keys[len]
        , path = prefix + i
        , schema = self.schema.path(path);

      if (!schema && obj[i] && obj[i].constructor == Object) {
        // assume nested object
        init(obj[i], path + '.', next);
      } else {
        if (obj[i] && schema && populate[path]) {
          if (populate[path].sub) {
            var total = 0;

            obj[i].forEach(function (subobj) {
              for (var key in populate[path].sub) {
                if (subobj[key]) {
                  (function (key) {
                    total++;

                    self.populate(
                        schema.schema.path(key)
                      , subobj[key]
                      , populate[path]
                      , function (err, doc) {
                          if (err) return error(err);
                          subobj[key] = doc;
                          --total || next();
                        }
                    );
                  })(key);
                }
              }
            });
          } else {
            self.populate(schema, obj[i], populate[path], function (err, doc) {
              if (err) return error(err);
              obj[i] = doc;
              next();
            });
          }
        } else {
          next();
        }
      }
    };

    next();
  };

  init(doc, '', function (err) {
    if (err) return fn(err);
    Document.prototype.init.call(self, doc, fn);
  });

  return this;
};

function makeSaveHandler(promise, self) {
  return function (err) {
    if (err) return promise.error(err);
    promise.complete(self);
    self.emit('save', self);
    promise = null;
    self = null;
  };
};

/**
 * Saves this document.
 *
 * @see Model#registerHooks
 * @param {Function} fn
 * @api public
 */

Model.prototype.save = function (fn) {
  var promise = new Promise(fn)
    , options = {}
    , self = this
    , complete = makeSaveHandler(promise, self);

  if (this.options.safe) {
    options.safe = true;
  }

  if (this.isNew) {
    // send entire doc
    this.collection.insert(this.toObject(), options, complete);
    this.isNew = false;

    // clear atomics
    this._dirty().forEach(function (dirt) {
      var type = dirt.value;
      if (type && type._path && type.doAtomics) {
        type._atomics = {};
      }
    });

  } else {
    // optimization, _delta() clears atomics too
    var delta = this._delta();

    if (Object.keys(delta).length) {
      this.collection.update({ _id: this._doc._id }, delta, options, complete);
    } else {
      complete(null);
    }
  }

  // Clear 'modify'('dirty') cache
  this._activePaths.clear('modify');
  this.schema.requiredPaths.forEach(function (path) {
    self._activePaths.require(path);
  });
};

/**
 * Returns the dirty paths / vals
 *
 * @api private
 */

Model.prototype._dirty = function () {
  var self = this;

  return this._activePaths.map('modify', function (path) {
    return { path: path
           , value: self.getValue(path)
           , schema: self._path(path) };
  });
}

/**
 * Produces a special query document of the modified properties.
 * @api private
 */

Model.prototype._delta = function () {
  // send delta
  var self = this
    , delta
    , useSet = this.options['use$SetOnSave'];

  return this._dirty().reduce(function (delta, data) {
    var type = data.value
      , schema = data.schema
      , atomics, val, obj;

    if (type === null || type === undefined) {
      if (!('$set' in delta))
        delta['$set'] = {};

      delta['$set'][data.path] = type;
    } else if (type._path && type.doAtomics) {
      // a MongooseArray or MongooseNumber
      atomics = type._atomics;

      var ops = Object.keys(atomics)
        , i = ops.length
        , op;

      while (i--) {
        op = ops[i]
        if (op === '$pushAll' || op === '$pullAll') {
          if (atomics[op].length === 1) {
            val = atomics[op][0];
            delete atomics[op];
            op = op.replace('All', '');
            atomics[op] = val;
          }
        }
        val = atomics[op];
        obj = delta[op] = delta[op] || {};
        if (op === '$pull' || op === '$push') {
          if (val.constructor !== Object) {
            if (Array.isArray(val)) val = [val];
            // TODO Should we place pull and push casting into the pull and push methods?
            val = schema.cast(val)[0];
          }
        }
        obj[data.path] = val.toObject
          ? val.toObject() // If the value is an array
          : Array.isArray(val)
            ? val.map(function (mem) {
                return mem.toObject
                  ? mem.toObject()
                  : mem.valueOf
                    ? mem.valueOf()
                    : mem;
              })
            : val.valueOf
              ? val.valueOf() // Numbers
              : val;
      }
      type._atomics = {};
    } else {
      // normalize MongooseArray or MongooseNumber
      if (type instanceof MongooseArray ||
          type instanceof MongooseBuffer) {
        type = type.toObject();
      } else if (type._path)
        type = type.valueOf();

      if (useSet) {
        if (!('$set' in delta))
          delta['$set'] = {};

        delta['$set'][data.path] = type;
      } else
        delta[data.path] = type;
    }

    return delta;
  }, {});
}

/**
 * Remove the document
 *
 * @param {Function} callback
 * @api public
 */

Model.prototype.remove = function (fn) {
  if (this.removing || this.removed)
    return this;

  if (!this.removing) {
    var promise = this.removing = new Promise(fn)
      , self = this;

    this.collection.remove({ _id: this._doc._id }, function (err) {
      if (err) return promise.error(err);
      promise.complete();
      self.emit('remove');
    });
  }

  return this;
};

/**
 * Register hooks override
 *
 * @api private
 */

Model.prototype.registerHooks = function () {
  // make sure to pass along all the errors from subdocuments
  this.pre('save', function (next) {
    // we keep the error semaphore to make sure we don't
    // call `save` unnecessarily (we only need 1 error)
    var subdocs = 0
      , error = false
      , self = this;

    var arrays = this._activePaths
      .map('init', 'modify', function (i) {
        return self.getValue(i);
      })
      .filter(function (val) {
        return (val && val instanceof DocumentArray && val.length);
      });

    if (!arrays.length)
      return next();

    arrays.forEach(function (array) {
      subdocs += array.length;
      array.forEach(function (value) {
        if (!error)
          value.save(function (err) {
            if (!error) {
              if (err) {
                error = true;
                next(err);
              } else
                --subdocs || next();
            }
          });
      });
    });
  }, function (err) {
    this.db.emit('error', err);
  });

  Document.prototype.registerHooks.call(this);
};

/**
 * Shortcut to access another model.
 *
 * @param {String} model name
 */

Model.prototype.model = function (name) {
  return this.db.model(name);
};

/**
 * Access the options defined in the schema
 *
 * @api private
 */

Model.prototype.__defineGetter__('options', function () {
  return this.schema ? this.schema.options : {};
});

/**
 * Give the constructor the ability to emit events.
 */

for (var i in EventEmitter.prototype)
  Model[i] = EventEmitter.prototype[i];

/**
 * Called when the model compiles
 *
 * @api private
 */

Model.init = function () {
  // build indexes
  var self = this
    , indexes = this.schema.indexes
    , count = indexes.length;

  indexes.forEach(function (index) {
    self.collection.ensureIndex(index[0], index[1], function (err) {
      if (err) return self.db.emit('error', err);
      --count || self.emit('index');
    });
  });
};

/**
 * Document schema
 *
 * @api public
 */

Model.schema;

/**
 * Database instance the model uses.
 *
 * @api public
 */

Model.db;

/**
 * Collection the model uses.
 *
 * @api public
 */

Model.collection;

/**
 * Define properties that access the prototype.
 */

['db', 'collection', 'schema', 'options'].forEach(function(prop){
  Model.__defineGetter__(prop, function(){
    return this.prototype[prop];
  });
});

/**
 * Module exports.
 */

module.exports = exports = Model;

Model.remove = function (conditions, callback) {
  if ('function' === typeof conditions) {
    callback = conditions;
    conditions = {};
  }

  var query = new Query(conditions).bind(this, 'remove');

  if ('undefined' === typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.remove(callback);
};

/**
 * Finds documents
 *
 * Examples:
 *    // retrieve only certain keys
 *    MyModel.find({ name: /john/i }, ['name', 'friends'], function () { })
 *
 *    // pass options
 *    MyModel.find({ name: /john/i }, [], { skip: 10 } )
 *
 * @param {Object} conditions
 * @param {Object/Function} (optional) fields to hydrate or callback
 * @param {Function} callback
 * @api public
 */

Model.find = function (conditions, fields, options, callback) {
  if ('function' == typeof conditions) {
    callback = conditions;
    conditions = {};
    fields = null;
    options = null;
  } else if ('function' == typeof fields) {
    callback = fields;
    fields = null;
    options = null;
  } else if ('function' == typeof options) {
    callback = options;
    options = null;
  }

  var query = new Query(conditions, options).select(fields).bind(this, 'find');

  if ('undefined' === typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.find(callback);
};

/**
 * Merges the current named scope query into `query`.
 *
 * @param {Query} query
 * @api private
 */

Model._applyNamedScope = function (query) {
  var cQuery = this._cumulativeQuery;

  if (cQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query._fields && cQuery._fields)
      merge(query._fields, cQuery._fields);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }

  return query;
}

/**
 * Finds by id
 *
 * @param {ObjectId/Object} objectid, or a value that can be casted to it
 * @api public
 */

Model.findById = function (id, fields, options, callback) {
  return this.findOne({ _id: id }, fields, options, callback);
};

/**
 * Finds one document
 *
 * @param {Object} conditions
 * @param {Object/Function} (optional) fields to hydrate or callback
 * @param {Function} callback
 * @api public
 */

Model.findOne = function (conditions, fields, options, callback) {
  if ('function' == typeof options) {
    // TODO Handle all 3 of the following scenarios
    // Hint: Only some of these scenarios are possible if cQuery is present
    // Scenario: findOne(conditions, fields, callback);
    // Scenario: findOne(fields, options, callback);
    // Scenario: findOne(conditions, options, callback);
    callback = options;
    options = null;
  } else if ('function' == typeof fields) {
    // TODO Handle all 2 of the following scenarios
    // Scenario: findOne(conditions, callback)
    // Scenario: findOne(fields, callback)
    // Scenario: findOne(options, callback);
    callback = fields;
    fields = null;
    options = null;
  } else if ('function' == typeof conditions) {
    callback = conditions;
    conditions = {};
    fields = null;
    options = null;
  }

  var query = new Query(conditions, options).select(fields).bind(this, 'findOne');

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.findOne(callback);
};

/**
 * Counts documents
 *
 * @param {Object} conditions
 * @param {Function} optional callback
 * @api public
 */

Model.count = function (conditions, callback) {
  var query = new Query(conditions).bind(this, 'count');
  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.count(callback);
};

Model.distinct = function (field, conditions, callback) {
  var query = new Query(conditions).bind(this, 'distinct');
  if ('undefined' == typeof callback) {
    query._distinctArg = field;
    return query;
  }

  this._applyNamedScope(query);
  return query.distinct(field, callback);
};

/**
 * `where` enables a very nice sugary api for doing your queries.
 * For example, instead of writing:
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 * we can instead write more readably:
 *     User.where('age').gte(21).lte(65);
 * Moreover, you can also chain a bunch of these together like:
 *     User
 *       .where('age').gte(21).lte(65)
 *       .where('name', /^b/i)        // All names that begin where b or B
 *       .where('friends').slice(10);
 * @param {String} path
 * @param {Object} val (optional)
 * @return {Query}
 * @api public
 */

Model.where = function (path, val) {
  var q = new Query().bind(this, 'find');
  return q.where.apply(q, arguments);
};

/**
 * Sometimes you need to query for things in mongodb using a JavaScript
 * expression. You can do so via find({$where: javascript}), or you can
 * use the mongoose shortcut method $where via a Query chain or from
 * your mongoose Model.
 *
 * @param {String|Function} js is a javascript string or anonymous function
 * @return {Query}
 * @api public
 */

Model.$where = function () {
  var q = new Query().bind(this, 'find');
  return q.$where.apply(q, arguments);
};

/**
 * Shortcut for creating a new Document that is automatically saved
 * to the db if valid.
 *
 * @param {Object} doc
 * @param {Function} callback
 * @api public
 */

Model.create = function (doc, fn) {
  var args = utils.args(arguments)
    , lastArg = args[args.length-1]
    , docs = []
    , count;

  if (typeof lastArg === 'function') {
    fn = args.pop();
  }

  count = args.length;
  var self = this;

  args.forEach(function (arg, i) {
    var doc = new self(arg);
    docs[i] = doc;
    doc.save(function (err) {
      if (err) return fn(err);
      --count || fn.apply(null, [null].concat(docs));
    });
  });
};

/**
 * Updates documents.
 *
 * Examples:
 *
 *     MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, fn);
 *     MyModel.update({ name: 'Tobi' }, { ferret: true }, { multi: true }, fn);
 *
 * Valid options:
 *  - safe (boolean) safe mode (defaults to value set in schema (false))
 *  - upsert (boolean) whether to create the doc if it doesn't match (false)
 *  - multi (boolean) whether multiple documents should be update (false)
 *
 * @param {Object} conditions
 * @param {Object] doc
 * @param {Object} options
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Model.update = function (conditions, doc, options, callback) {
  if (arguments.length < 4) {
    if ('function' === typeof options) {
      // Scenario: update(conditions, doc, callback)
      callback = options;
      options = null;
    } else if ('function' === typeof doc) {
      // Scenario: update(doc, callback);
      callback = doc;
      doc = conditions;
      conditions = {};
      options = null;
    }
  }

  var query = new Query(conditions, options).bind(this, 'update', doc);

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.update(doc, callback);
};

/**
 * Compiler utility.
 *
 * @param {String} model name
 * @param {Schema} schema object
 * @param {String} collection name
 * @param {Connection} connection to use
 * @param {Mongoose} mongoose instance
 * @api private
 */

Model.compile = function (name, schema, collectionName, connection, base) {
  // generate new class
  function model () {
    Model.apply(this, arguments);
  };

  model.modelName = name;
  model.__proto__ = Model;
  model.prototype.__proto__ = Model.prototype;
  model.prototype.base = base;
  model.prototype.schema = schema;
  model.prototype.db = connection;
  model.prototype.collection = connection.collection(collectionName);

  // apply methods
  for (var i in schema.methods)
    model.prototype[i] = schema.methods[i];

  // apply statics
  for (var i in schema.statics)
    model[i] = schema.statics[i];

  // apply named scopes
  if (schema.namedScopes) schema.namedScopes.compile(model);

  return model;
};
