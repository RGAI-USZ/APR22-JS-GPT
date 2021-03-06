
// Expose modules in ./support for demo purposes
require.paths.unshift(__dirname + '/../../support');

/**
 * Module dependencies.
 */

var express = require('../../lib/express')
  , blog = require('../blog/app');

var app = express.createServer();

app.use(express.cookieParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use('/blog', blog);

app.get('/', function(req, res){
  res.send('Visit <a href="/blog">/blog</a>');
});

app.listen(3000);
console.log('Server listening on port 3000');