


var express = require('../..');





var one = express();

one.use(express.logger());

one.get('/', function(req, res){
res.send('Hello from app one!')
});

one.get('/:sub', function(req, res){
res.send('requsted ' + req.params.sub);
});



var two = express();

two.get('/', function(req, res){
res.send('Hello from app two!')
});



var redirect = express();

redirect.all('*', function(req, res){
console.log(req.subdomains);
res.redirect('http://localhost:3000/' + req.subdomains[0]);
});



var app = express();

app.use(express.vhost('*.localhost', redirect))
app.use(express.vhost('localhost', one));
app.use(express.vhost('dev', two));

app.listen(3000);
console.log('Express app started on port 3000');
