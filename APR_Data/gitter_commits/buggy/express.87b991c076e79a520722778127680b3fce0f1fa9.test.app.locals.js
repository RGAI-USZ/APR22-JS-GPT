
var express = require('../')
  , request = require('./support/http');

describe('app', function(){
  describe('.locals(obj)', function(){
    it('should merge locals', function(){
      var app = express();
      Object.keys(app.locals).should.eql(['use', 'settings']);
      app.locals({ user: 'tobi', age: 1 });
      app.locals({ age: 2 });
      Object.keys(app.locals).should.eql(['use', 'settings', 'user', 'age']);
      app.locals.user.should.equal('tobi');
      app.locals.age.should.equal(2);
    })
  })
  
  describe('.locals.settings', function(){
    it('should expose app settings', function(){
      var app = express();
      app.set('title', 'House of Manny');
      var obj = app.locals.settings;
      obj.should.have.property('root', '/');
      obj.should.have.property('env', 'test');
      obj.should.have.property('title', 'House of Manny');
    })
  })
})
