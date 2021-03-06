
var express = require('../')
  , request = require('supertest');

describe('req', function(){
  describe('.acceptsEncodings', function(){
    it('should be true if encoding accpeted', function(done){
      var app = express();

      app.use(function(req, res){
        req.acceptsEncoding('gzip').should.be.ok;
        req.acceptsEncoding('deflate').should.be.ok;
        res.end();
      });

      request(app)
      .get('/')
      .set('Accept-Encoding', ' gzip, deflate')
      .expect(200, done);
    })

    it('should be false if encoding not accpeted', function(done){
      var app = express();

      app.use(function(req, res){
        req.acceptsEncoding('bogus').should.not.be.ok;
        res.end();
      });

      request(app)
      .get('/')
      .set('Accept-Encoding', ' gzip, deflate')
      .expect(200, done);
    })
  })
})
