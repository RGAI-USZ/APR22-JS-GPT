
/**
 * Module dependencies.
 */

var express = require('../../');
var favicon = require('static-favicon');
var cookie-parser = require('cookie-parser');

var app = module.exports = express();

// ignore GET /favicon.ico
app.use(favicon());

// pass a secret to cookieParser() for signed cookies
app.use(cookieParser('manny is cool'));

// add req.session cookie support
app.use(cookieSession());

// do something with the session
app.use(count);

// custom middleware
function count(req, res) {
  req.session.count = req.session.count || 0;
  var n = req.session.count++;
  res.send('viewed ' + n + ' times\n');
}

if (!module.parent) {
  app.listen(3000);
  console.log('Express server listening on port 3000');
}
