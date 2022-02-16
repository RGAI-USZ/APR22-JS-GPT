
var after = require('after');
var express = require('../')
  , Router = express.Router
  , methods = require('methods')
  , assert = require('assert');

describe('Router', function(){
  it('should return a function with router methods', function() {
    var router = Router();
    assert(typeof router == 'function');

    var router = new Router();
    assert(typeof router == 'function');

    assert(typeof router.get == 'function');
    assert(typeof router.handle == 'function');
    assert(typeof router.use == 'function');
  });

  it('should support .use of other routers', function(done){
    var router = new Router();
    var another = new Router();

    another.get('/bar', function(req, res){
      res.end();
    });
    router.use('/foo', another);

    router.handle({ url: '/foo/bar', method: 'GET' }, { end: done });
  });

  it('should support dynamic routes', function(done){
    var router = new Router();
    var another = new Router();

    another.get('/:bar', function(req, res){
      req.params.bar.should.equal('route');
      res.end();
    });
    router.use('/:foo', another);

    router.handle({ url: '/test/route', method: 'GET' }, { end: done });
  });

  describe('.handle', function(){
    it('should dispatch', function(done){
      var router = new Router();

      router.route('/foo').get(function(req, res){
        res.send('foo');
      });

      var res = {
        send: function(val) {
          val.should.equal('foo');
          done();
        }
      }
      router.handle({ url: '/foo', method: 'GET' }, res);
    })
  })

  describe('.multiple callbacks', function(){
    it('should throw if a callback is null', function(){
      assert.throws(function () {
        var router = new Router();
        router.route('/foo').all(null);
      })
    })

    it('should throw if a callback is undefined', function(){
      assert.throws(function () {
        var router = new Router();
        router.route('/foo').all(undefined);
      })
    })

    it('should throw if a callback is not a function', function(){
      assert.throws(function () {
        var router = new Router();
        router.route('/foo').all('not a function');
      })
    })

    it('should not throw if all callbacks are functions', function(){
      var router = new Router();
      router.route('/foo').all(function(){}).all(function(){});
    })
  })

  describe('error', function(){
    it('should skip non error middleware', function(done){
      var router = new Router();

      router.get('/foo', function(req, res, next){
        next(new Error('foo'));
      });

      router.get('/bar', function(req, res, next){
        next(new Error('bar'));
      });

      router.use(function(req, res, next){
        assert(false);
      });

      router.use(function(err, req, res, next){
        assert.equal(err.message, 'foo');
        done();
      });

      router.handle({ url: '/foo', method: 'GET' }, {}, done);
    });

    it('should handle throwing inside routes with params', function(done) {
      var router = new Router();

      router.get('/foo/:id', function(req, res, next){
        throw new Error('foo');
      });

      router.use(function(req, res, next){
        assert(false);
      });

      router.use(function(err, req, res, next){
        assert.equal(err.message, 'foo');
        done();
      });

      router.handle({ url: '/foo/2', method: 'GET' }, {}, done);
    });

    it('should handle throwing inside error handlers', function(done) {
      var router = new Router();

      router.use(function(req, res, next){
        throw new Error('boom!');
      });

      router.use(function(err, req, res, next){
        throw new Error('oops');
      });

      router.use(function(err, req, res, next){
        assert.equal(err.message, 'oops');
        done();
      });

      router.handle({ url: '/', method: 'GET' }, {}, done);
    });
  })

  describe('.all', function() {
    it('should support using .all to capture all http verbs', function(done){
      var router = new Router();

      var count = 0;
      router.all('/foo', function(){ count++; });

      var url = '/foo?bar=baz';

      methods.forEach(function testMethod(method) {
        router.handle({ url: url, method: method }, {}, function() {});
      });

      assert.equal(count, methods.length);
      done();
    })
  })

  describe('.param', function() {
    it('should call param function when routing VERBS', function(done) {
      var router = new Router();

      router.param('id', function(req, res, next, id) {
        assert.equal(id, '123');
        next();
      });

      router.get('/foo/:id/bar', function(req, res, next) {
        assert.equal(req.params.id, '123');
        next();
      });

      router.handle({ url: '/foo/123/bar', method: 'get' }, {}, done);
    });

    it('should call param function when routing middleware', function(done) {
      var router = new Router();

      router.param('id', function(req, res, next, id) {
        assert.equal(id, '123');
        next();
      });

      router.use('/foo/:id/bar', function(req, res, next) {
        assert.equal(req.params.id, '123');
        assert.equal(req.url, '/baz');
        next();
      });

      router.handle({ url: '/foo/123/bar/baz', method: 'get' }, {}, done);
    });

    it('should only call once per request', function(done) {
      var count = 0;
      var req = { url: '/foo/bob/bar', method: 'get' };
      var router = new Router();
      var sub = new Router();

      sub.get('/bar', function(req, res, next) {
        next();
      });

      router.param('user', function(req, res, next, user) {
        count++;
        req.user = user;
        next();
      });

      router.use('/foo/:user/', new Router());
      router.use('/foo/:user/', sub);

      router.handle(req, {}, function(err) {
        if (err) return done(err);
        assert.equal(count, 1);
        assert.equal(req.user, 'bob');
        done();
      });
    });

    it('should call when values differ', function(done) {
      var count = 0;
      var req = { url: '/foo/bob/bar', method: 'get' };
      var router = new Router();
      var sub = new Router();

      sub.get('/bar', function(req, res, next) {
        next();
      });

      router.param('user', function(req, res, next, user) {
        count++;
        req.user = user;
        next();
      });

      router.use('/foo/:user/', new Router());
      router.use('/:user/bob/', sub);

      router.handle(req, {}, function(err) {
        if (err) return done(err);
        assert.equal(count, 2);
        assert.equal(req.user, 'foo');
        done();
      });
    });
  });

  describe('parallel requests', function() {
    it('should not mix requests', function(done) {
      var req1 = { url: '/foo/50/bar', method: 'get' };
      var req2 = { url: '/foo/10/bar', method: 'get' };
      var router = new Router();
      var sub = new Router();

      done = after(2, done);

      sub.get('/bar', function(req, res, next) {
        next();
      });

      router.param('ms', function(req, res, next, ms) {
        ms = parseInt(ms, 10);
        req.ms = ms;
        setTimeout(next, ms);
      });

      router.use('/foo/:ms/', new Router());
      router.use('/foo/:ms/', sub);

      router.handle(req1, {}, function(err) {
        assert.ifError(err);
        assert.equal(req1.ms, 50);
        assert.equal(req1.originalUrl, '/foo/50/bar');
        done();
      });

      router.handle(req2, {}, function(err) {
        assert.ifError(err);
        assert.equal(req2.ms, 10);
        assert.equal(req2.originalUrl, '/foo/10/bar');
        done();
      });
    });
  });
})
