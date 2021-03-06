
// Expose modules in ./support for demo purposes
require.paths.unshift(__dirname + '/../../support');

/**
 * Module dependencies.
 */

var express = require('express')
  , app = express.createServer()
  , site = require('./site')
  , user = require('./user');

// Config

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.bodyDecoder());
app.use(express.staticProvider(__dirname + '/public'));

// General

app.get('/', site.index);

// User

app.all('/users', user.list);
app.all('/user/:id/:op?', user.load);
app.get('/user/:id', user.view);
app.get('/user/:id/view', user.view);
app.get('/user/:id/edit', user.edit);

app.listen(3000);
console.log('Express app started on port 3000');