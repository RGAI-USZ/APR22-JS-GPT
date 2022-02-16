
// first:
// $ npm install redis online
// $ redis-server

/**
 * Module dependencies.
 */

var express = require('../..')
  , online = require('online')
  , redis = require('redis')
  , db = redis.createClient();

// online

online = online(db);

// app

var app = express();

// activity tracking, in this case using
// the UA string, you would use req.user.id etc

app.use(function(req, res, next){
  // fire-and-forget
  online.add(req.headers['user-agent']);
  next();
});

/**
 * List helper.
 */

function list(ids) {
  return '<ul>' + ids.map(function(id){
    return '<li>' + id + '</li>';
  }).join('') + '</ul>';
}

/**
 * GET users online.
 */

app.get('/', function(req, res, next){
  online.last(5, function(err, ids){
    if (err) return next(err);
    res.send('<p>Users online: ' + ids.length + '</p>' + list(ids));
  });
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}
