
var express = require('../')
, request = require('supertest')
, assert = require('assert');

describe('res', function(){
describe('.json(object)', function(){
it('should not support jsonp callbacks', function(done){
var app = express();

app.use(function(req, res){
res.json({ foo: 'bar' });
});

request(app)
.get('/?callback=foo')
.expect('{"foo":"bar"}', done);
})

it('should not override previous Content-Types', function(done){
var app = express();

app.get('/', function(req, res){
res.type('application/vnd.example+json');
res.json({ hello: 'world' });
});

request(app)
.get('/')
.expect('Content-Type', 'application/vnd.example+json; charset=utf-8')
.expect(200, '{"hello":"world"}', done);
})

describe('when given primitives', function(){
it('should respond with json for null', function(done){
var app = express();

app.use(function(req, res){
res.json(null);
});

request(app)
.get('/')
.expect('Content-Type', 'application/json; charset=utf-8')
.expect(200, 'null', done)
})

it('should respond with json for Number', function(done){
var app = express();

app.use(function(req, res){
res.json(300);
});

request(app)
.get('/')
.expect('Content-Type', 'application/json; charset=utf-8')
.expect(200, '300', done)
})

it('should respond with json for String', function(done){
var app = express();

app.use(function(req, res){
res.json('str');
});

request(app)
.get('/')
.expect('Content-Type', 'application/json; charset=utf-8')
.expect(200, '"str"', done)
})
})

describe('when given an array', function(){
it('should respond with json', function(done){
var app = express();

app.use(function(req, res){
res.json(['foo', 'bar', 'baz']);
});

request(app)
.get('/')
.expect('Content-Type', 'application/json; charset=utf-8')
.expect(200, '["foo","bar","baz"]', done)
})
})

describe('when given an object', function(){
it('should respond with json', function(done){
var app = express();

app.use(function(req, res){
res.json({ name: 'tobi' });
});

request(app)
.get('/')
.expect('Content-Type', 'application/json; charset=utf-8')
.expect(200, '{"name":"tobi"}', done)
})
})

describe('"json escape" setting', function () {
it('should be undefined by default', function () {
var app = express()
assert.strictEqual(app.get('json escape'), undefined)
})

it('should unicode escape HTML-sniffing characters', function (done) {
var app = express()

app.enable('json escape')
