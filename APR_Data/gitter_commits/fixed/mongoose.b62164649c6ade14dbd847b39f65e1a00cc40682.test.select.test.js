
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ObjectId = Schema.ObjectId
  , MongooseBuffer = mongoose.Types.Buffer
  , DocumentObjectId = mongoose.Types.ObjectId;

describe('schema select option', function(){

  it('excluding paths through schematype', function (done) {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: false}
    });

    var S = db.model('ExcludingBySchemaType', schema);
    S.create({ thin: true, name: 'the excluded' },function (err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the excluded');

      var pending = 3;
      function cb (err, s) {
        if (!--pending) {
          db.close();
          done();
        }

        if (Array.isArray(s)) s = s[0];
        assert.strictEqual(null, err);
        assert.equal(false, s.isSelected('name'));
        assert.strictEqual(undefined, s.name);
      }

      S.findById(s).select('-thin').exec(cb);
      S.find({ _id: s._id }).select('thin').exec(cb);
      S.findById(s, cb);
    });
  });

  it('including paths through schematype', function (done) {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
    });

    var S = db.model('IncludingBySchemaType', schema);
    S.create({ thin: true, name: 'the included' },function (err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the included');

      var pending = 2;
      function cb (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        if (Array.isArray(s)) s = s[0];
        assert.strictEqual(null, err);
        assert.strictEqual(true, s.isSelected('name'));
        assert.equal(s.name, 'the included');
      }

      S.findById(s).select('-thin').exec(cb);
      S.find({ _id: s._id }).select('thin').exec(cb);
    });
  });

  it('overriding schematype select options', function (done) {
    var db =start()

    var selected = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
    });
    var excluded = new Schema({
        thin: Boolean
      , name: { type: String, select: false }
    });

    var S = db.model('OverriddingSelectedBySchemaType', selected);
    var E = db.model('OverriddingExcludedBySchemaType', excluded);

    var pending = 4;

    S.create({ thin: true, name: 'the included' },function (err, s) {
      assert.ifError(err);
      assert.equal(s.name, 'the included');

      S.find({ _id: s._id }).select('thin name').exec(function (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        s = s[0];
        assert.ifError(err);
        assert.strictEqual(true, s.isSelected('name'));
        assert.strictEqual(true, s.isSelected('thin'));
        assert.equal(s.name, 'the included');
        assert.ok(s.thin);
      });

      S.findById(s).select('-name').exec(function (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        assert.strictEqual(null, err);
        assert.equal(false, s.isSelected('name'))
        assert.equal(true, s.isSelected('thin'))
        assert.strictEqual(undefined, s.name);
        assert.equal(true, s.thin);
      });
    });

    E.create({ thin: true, name: 'the excluded' },function (err, e) {
      assert.ifError(err);
      assert.equal(e.name, 'the excluded');

      E.find({ _id: e._id }).select('thin name').exec(function (err, e) {
        if (!--pending) {
          db.close();
          done();
        }
        e = e[0];
        assert.strictEqual(null, err);
        assert.equal(true, e.isSelected('name'));
        assert.equal(true, e.isSelected('thin'));
        assert.equal(e.name, 'the excluded');
        assert.ok(e.thin);
      });

      E.findById(e).select('-name').exec(function (err, e) {
        if (!--pending) {
          db.close();
          done();
        }
        assert.strictEqual(null, err);
        assert.equal(e.isSelected('name'),false)
        assert.equal(e.isSelected('thin'), true);
        assert.strictEqual(undefined, e.name);
        assert.strictEqual(true, e.thin);
      });
    });
  })

  it('forcing inclusion of a deselected schema path works', function (done) {
    var db = start();
    var excluded = new Schema({
        thin: Boolean
      , name: { type: String, select: false }
    });

    var M = db.model('ForcedInclusionOfPath', excluded);
    M.create({ thin: false, name: '1 meter' }, function (err, d) {
      assert.ifError(err);

      M.findById(d)
      .select('+name')
      .exec(function (err, doc) {
        assert.ifError(err);
        assert.equal(false, doc.thin);
        assert.equal('1 meter', doc.name);
        assert.equal(d.id, doc.id);

        M.findById(d)
        .select('+name -thin')
        .exec(function (err, doc) {
          assert.ifError(err);
          assert.equal(undefined, doc.thin);
          assert.equal('1 meter', doc.name);
          assert.equal(d.id, doc.id);

          M.findById(d)
          .select('-thin +name')
          .exec(function (err, doc) {
            assert.ifError(err);
            assert.equal(undefined, doc.thin);
            assert.equal('1 meter', doc.name);
            assert.equal(d.id, doc.id);

            M.findById(d)
            .select('-thin')
            .exec(function (err, doc) {
              db.close();
              assert.ifError(err);
              assert.equal(undefined, doc.thin);
              assert.equal(undefined, doc.name);
              assert.equal(d.id, doc.id);
              done();
            });
          });
        });
      });
    });
  })

  it('conflicting schematype path selection should not error', function (done) {
    var db =start()

    var schema = new Schema({
        thin: Boolean
      , name: { type: String, select: true }
      , conflict: { type: String, select: false}
    });

    var S = db.model('ConflictingBySchemaType', schema);
    S.create({ thin: true, name: 'bing', conflict: 'crosby' },function (err, s) {
      assert.strictEqual(null, err);
      assert.equal(s.name, 'bing');
      assert.equal(s.conflict, 'crosby');

      var pending = 2;
      function cb (err, s) {
        if (!--pending) {
          db.close();
          done();
        }
        if (Array.isArray(s)) s = s[0];
        assert.ifError(err);
        assert.equal(s.name, 'bing');
        assert.equal(undefined, s.conflict);
      }

      S.findById(s).exec(cb);
      S.find({ _id: s._id }).exec(cb);
    });
  })

  it('selecting _id works with excluded schematype path', function (done) {
    var db = start();

    var schema = new Schema({
        name: { type: String, select: false}
    });

    var M = db.model('SelectingOnly_idWithExcludedSchemaType', schema);
    M.find().select('_id -name').exec(function (err) {
      assert.ok(err instanceof Error, 'conflicting path selection error should be instance of Error');

      M.find().select('_id').exec(function (err) {
        db.close();
        assert.ifError(err, err && err.stack);
        done();
      });
    });
  });

  it('all inclusive/exclusive combos work', function(done) {
    var db = start();
    var coll = 'inclusiveexclusivecomboswork_' + random();

    var schema = new Schema({
        name: { type: String }
      , age: Number
    }, { collection: coll });
    var M = db.model('InclusiveExclusiveCombosWork', schema);

    var schema1 = new Schema({
        name: { type: String, select: false }
      , age: Number
    }, { collection: coll });
    var S = db.model('InclusiveExclusiveCombosWorkWithSchemaSelectionFalse', schema1);

    var schema2 = new Schema({
        name: { type: String, select: true }
      , age: Number
    }, { collection: coll });
    var T = db.model('InclusiveExclusiveCombosWorkWithSchemaSelectionTrue', schema2);

    function useId (M, id, cb) {
      M.findOne().select('_id -name').exec(function (err, d) {
        assert.ok(err);
        assert.ok(!d);
        M.findOne().select('-_id name').exec(function (err, d) {
          // mongo special case for exclude _id + include path
          assert.ifError(err);
          assert.equal(undefined, d.id);
          assert.equal('ssd', d.name);
          assert.equal(undefined, d.age);
          M.findOne().select('-_id -name').exec(function (err, d) {
            assert.ifError(err);
            assert.equal(undefined, d.id);
            assert.equal(undefined, d.name);
            assert.equal(0, d.age);
            M.findOne().select('_id name').exec(function (err, d) {
              assert.ifError(err);
              assert.equal(id, d.id);
              assert.equal('ssd', d.name);
              assert.equal(undefined, d.age);
              cb();
            });
          });
        });
      });
    }

    function nonId (M, id, cb) {
      M.findOne().select('age -name').exec(function (err, d) {
        assert.ok(err);
        assert.ok(!d);
        M.findOne().select('-age name').exec(function (err, d) {
          assert.ok(err);
          assert.ok(!d);
          M.findOne().select('-age -name').exec(function (err, d) {
            assert.ifError(err);
            assert.equal(id, d.id);
            assert.equal(undefined, d.name);
            assert.equal(undefined, d.age);
            M.findOne().select('age name').exec(function (err, d) {
              assert.ifError(err);
              assert.equal(id, d.id);
              assert.equal('ssd', d.name);
              assert.equal(0, d.age);
              cb();
            });
          });
        });
      });
    }

    M.create({ name: 'ssd', age: 0 }, function (err, d) {
      assert.ifError(err);
      var id = d.id;
      useId(M, id, function () {
        nonId(M, id, function () {
          useId(S, id, function () {
            nonId(S, id, function () {
              useId(T, id, function () {
                nonId(T, id, function () {
                  db.close();
                  done();
                })
              });
            })
          });
        })
      });
    });
  })

})
