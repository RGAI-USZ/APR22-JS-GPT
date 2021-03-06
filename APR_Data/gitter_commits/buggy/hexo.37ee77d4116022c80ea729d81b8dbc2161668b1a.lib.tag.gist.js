var extend = require('../extend');

extend.tag.register('gist', function(args, content){
  var id = args.shift(),
    file = args.length ? '/' + args[0] : '';

  return '<script src="https://gist.github.com/' + id + '.js' + file + '"></script>';
});