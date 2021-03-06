


var express = require('express')
, connect = require('connect')
, assert = require('assert')
, should = require('should');

module.exports = {
'test inheritance': function(){
var server = express.createServer();
server.should.be.an.instanceof(connect.HTTPServer);
},

'test connect middleware autoloaders': function(){
express.errorHandler.should.equal(connect.errorHandler);
},

'test createServer() precedence': function(){
var app = express.createServer(function(req, res){
res.send(req.query.bar);
});

assert.response(app,
{ url: '/foo?bar=baz' },
{ body: 'baz' });
},

'test basic server': function(){
var server = express.createServer();

server.get('/', function(req, res){
server.set('env').should.equal('test');
res.writeHead(200, {});
res.end('wahoo');
});

server.put('/user/:id', function(req, res){
res.writeHead(200, {});
res.end('updated user ' + req.params.id)
});

server.del('/something', function(req, res){
res.send('Destroyed');
});

server.delete('/something/else', function(req, res){
res.send('Destroyed');
});

server.all('/staff/:id', function(req, res, next){
req.staff = { id: req.params.id };
next();
});

server.get('/staff/:id', function(req, res){
res.send('GET Staff ' + req.staff.id);
});

server.post('/staff/:id', function(req, res){
res.send('POST Staff ' + req.staff.id);
});

server.all('*', function(req, res){
res.send('requested ' + req.url);
});

assert.response(server,
{ url: '/' },
{ body: 'wahoo' });

assert.response(server,
{ url: '/user/12', method: 'PUT' },
{ body: 'updated user 12' });

assert.response(server,
{ url: '/something', method: 'DELETE' },
{ body: 'Destroyed' });

assert.response(server,
{ url: '/something/else', method: 'DELETE' },
{ body: 'Destroyed' });

assert.response(server,
{ url: '/staff/12' },
{ body: 'GET Staff 12' });

assert.response(server,
{ url: '/staff/12', method: 'POST' },
{ body: 'POST Staff 12' });

assert.response(server,
{ url: '/foo/bar/baz', method: 'DELETE' },
{ body: 'requested /foo/bar/baz' });
},

'test constructor middleware': function(beforeExit){
var calls = [];

function one(req, res, next){
calls.push('one');
next();
}

function two(req, res, next){
calls.push('two');
next();
}

var app = express.createServer(one, two);
app.get('/', function(req, res){
res.writeHead(200, {});
res.end('foo bar');
});

assert.response(app,
{ url: '/' },
{ body: 'foo bar' });

beforeExit(function(){
calls.should.eql(['one', 'two']);
});
},

'test #error()': function(){

var app = express.createServer();

app.get('/', function(req, res, next){
next(new Error('broken'));
});

app.use('/', connect.errorHandler());

assert.response(app,
{ url: '/' },
{ body: 'Internal Server Error' });


var app = express.createServer();

app.error(function(err, req, res){
res.send('Shit: ' + err.message, 500);
});

app.get('/', function(req, res, next){
next(new Error('broken'));
});

assert.response(app,
{ url: '/' },
{ body: 'Shit: broken', status: 500 });


var app = express.createServer();

app.error(function(err, req, res, next){
if (err.message === 'broken') {
next(err);
} else {
res.send(500);
}
});

app.error(function(err, req, res, next){
res.send(err.message, 500);
});

app.get('/', function(req, res, next){
throw new Error('broken');
});
app.get('/foo', function(req, res, next){
throw new Error('oh noes');
});

assert.response(app,
{ url: '/' },
{ body: 'broken', status: 500 });
assert.response(app,
{ url: '/foo' },
{ body: 'Internal Server Error' });
},

'test error() with route-specific middleware': function(){
var app = express.createServer();


},

'test next()': function(){
var app = express.createServer();

app.get('/user.:format?', function(req, res, next){
switch (req.params.format) {
case 'json':
res.writeHead(200, {});
res.end('some json');
break;
default:
next();
}
});

app.get('/user', function(req, res){
res.writeHead(200, {});
res.end('no json :)');
});

assert.response(app,
{ url: '/user.json' },
{ body: 'some json' });

assert.response(app,
{ url: '/user' },
{ body: 'no json :)' });
},

'test #use()': function(){
var app = express.createServer();

app.get('/users', function(req, res, next){
next(new Error('fail!!'));
});
app.use('/', connect.errorHandler({ showMessage: true }));

assert.response(app,
{ url: '/users' },
{ body: 'Error: fail!!' });
},

'test #configure()': function(beforeExit){
var calls = [];
process.env.NODE_ENV = 'development';
var server = express.createServer();


var ret = server.configure(function(){
assert.equal(this, server, 'Test context of configure() is the server');
calls.push('any');
}).configure('development', function(){
calls.push('dev');
}).configure('production', function(){
calls.push('production');
});

should.equal(ret, server, 'Test #configure() returns server for chaining');

assert.response(server,
{ url: '/' },
{ body: 'Cannot GET /' });

beforeExit(function(){
calls.should.eql(['any', 'dev']);
});
},

'test #configure() immediate call': function(){
var app = express.createServer();

app.configure(function(){
app.use(connect.bodyParser());
});

app.post('/', function(req, res){
res.send(req.param('name') || 'nope');
});

assert.response(app,
{ url: '/', method: 'POST', data: 'name=tj', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }},
{ body: 'tj' });
},

'test #configure() precedence': function(){
var app = express.createServer();

app.configure(function(){
app.use(function(req, res, next){
res.writeHead(200, {});
res.write('first');
next();
});
app.use(app.router);
app.use(function(req, res, next){
res.end('last');
});
});

app.get('/', function(req, res, next){
res.write(' route ');
next();
});

assert.response(app,
{ url: '/' },
{ body: 'first route last' });
},

'test #set()': function(){
var app = express.createServer();
var ret = app.set('title', 'My App').set('something', 'else');
ret.should.equal(app);
app.set('title').should.equal('My App');
app.set('something').should.equal('else');
},

'test #enable()': function(){
var app = express.createServer();
var ret = app.enable('some feature');
ret.should.equal(app);
app.set('some feature').should.be.true;
app.enabled('some feature').should.be.true;
app.enabled('something else').should.be.false;
},

'test #disable()': function(){
var app = express.createServer();
var ret = app.disable('some feature');
ret.should.equal(app);
app.set('some feature').should.be.false;
app.disabled('some feature').should.be.true;
app.disabled('something else').should.be.true;
},

'test middleware precedence': function(){
var app = express.createServer();

app.use(connect.bodyParser());

assert.equal(2, app.stack.length);

app.post('/', function(req, res){
res.send(JSON.stringify(req.body || ''));
});
app.get('/', function(){

});
assert.equal(3, app.stack.length);

assert.response(app,
{ url: '/', method: 'POST', data: 'name=tj', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }},
{ body: '{"name":"tj"}' });
},

'test mounting': function(){
var called
, app = express.createServer()
, blog = express.createServer()
, map = express.createServer();

map.set('home', '/map');

map.mounted(function(parent){
called = true;
assert.equal(this, map, 'mounted() is not in context of the child app');
assert.equal(app, parent, 'mounted() was not called with parent app');
});

app.use('/blog', blog);
app.use('/contact', map);
blog.route.should.equal('/blog');
map.route.should.equal('/contact');
should.equal(true, called);

app.set("test", "parent setting");
blog.set('test').should.equal('parent setting');

app.get('/', function(req, res){
app.set('home').should.equal('/');
blog.set('home').should.equal('/blog');
map.set('home').should.equal('/contact/map');
res.send('main app');
});

blog.get('/', function(req, res){
res.send('blog index');
});

blog.get('/post/:id', function(req, res){
res.send('blog post ' + req.params.id);
});

assert.response(app,
{ url: '/' },
{ body: 'main app' });
assert.response(app,
{ url: '/blog' },
{ body: 'blog index' });
assert.response(app,
{ url: '/blog/post/12' },
{ body: 'blog post 12' });
assert.response(blog,
{ url: '/' },
{ body: 'blog index' });
},

'test route middleware': function(){
var app = express.createServer();

function allow(role) {
return function(req, res, next) {


if (req.headers['x-role'] == role) {
next();
} else {
res.send(401);
}
}
}

function restrictAge(age) {
return function(req, res, next){
if (req.headers['x-age'] >= age) {
next();
} else {
res.send(403);
}
}
}

app.get('/xxx', allow('member'), restrictAge(18), function(req, res){
res.send(200);
});

app.get('/booze', [allow('member')], restrictAge(18), function(req, res){
res.send(200);
});

app.get('/tobi', [allow('member')], [[restrictAge(18)]], function(req, res){
res.send(200);
});

['xxx', 'booze', 'tobi'].forEach(function(thing){
assert.response(app,
{ url: '/' + thing },
{ body: 'Unauthorized', status: 401 });
assert.response(app,
{ url: '/' + thing, headers: { 'X-Role': 'member' }},
{ body: 'Forbidden', status: 403 });
assert.response(app,
{ url: '/' + thing, headers: { 'X-Role': 'member', 'X-Age': 18 }},
{ body: 'OK', status: 200 });
});
},

'test named capture groups': function(){
var app = express.createServer();

app.get('/user/:id([0-9]{2,10})', function(req, res){
res.send('user ' + req.params.id);
});

assert.response(app,
{ url: '/user/12' },
{ body: 'user 12' });

assert.response(app,
{ url: '/user/ab' },
{ body: 'Cannot GET /user/ab' });
},

'test .param()': function(){
var app = express.createServer();

var users = [
{ name: 'tj' }
, { name: 'tobi' }
, { name: 'loki' }
, { name: 'jane' }
, { name: 'bandit' }
];

function integer(n){ return parseInt(n, 10); };
app.param(['to', 'from'], integer);

app.param('user', function(req, res, next, id){
if (req.user = users[id]) {
next();
} else {
next(new Error('failed to find user'));
}
});

app.get('/user/:user', function(req, res, next){
res.send('user ' + req.user.name);
});

app.get('/users/:from-:to', function(req, res, next){
var names = users.slice(req.params.from, req.params.to).map(function(user){
return user.name;
});
res.send('users ' + names.join(', '));
});

assert.response(app,
{ url: '/user/0' },
{ body: 'user tj' });

assert.response(app,
{ url: '/user/1' },
{ body: 'user tobi' });

assert.response(app,
{ url: '/users/0-3' },
{ body: 'users tj, tobi, loki' });
},

'test OPTIONS': function(){
var app = express.createServer();

app.get('/', function(){});
app.get('/user/:id', function(){});
app.put('/user/:id', function(){});

assert.response(app,
{ url: '/', method: 'OPTIONS' },
{ headers: { Allow: 'GET' }});

assert.response(app,
{ url: '/user/12', method: 'OPTIONS' },
{ headers: { Allow: 'GET,PUT' }});
}
};
