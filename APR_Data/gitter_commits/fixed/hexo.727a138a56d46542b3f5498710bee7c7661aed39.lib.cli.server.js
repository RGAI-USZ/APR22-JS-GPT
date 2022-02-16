var connect = require('connect'),
  colors = require('colors'),
  extend = require('../extend');

extend.console.register('server', 'Run Server', function(args){
  var app = connect.createServer(),
    config = hexo.config;

  if (config.logger){
    if (config.logger_format) app.use(connect.logger(config.logger_format));
    else app.use(connect.logger());
  } else if (hexo.debug){
    app.use(connect.logger());
  }

  app.use(config.root, connect.static(hexo.public_dir));
  app.use(connect.compress());
  app.use('/', function(req, res){
    res.statusCode = 302;
    res.setHeader('Location', config.root);
    res.end();
  });

  app.listen(config.port, function(){
    console.log('Hexo is running at %s. Press Ctrl+C to stop.', ('http://localhost:' + config.port + config.root).bold);
    hexo.emit('server');
  });
});