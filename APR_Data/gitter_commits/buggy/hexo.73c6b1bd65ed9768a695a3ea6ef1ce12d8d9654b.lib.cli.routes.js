var extend = require('../extend'),
  route = require('../route'),
  clc = require('cli-color');

extend.console.register('routes', 'Display all routes', function(args){
  require('../generate')({preview: true}, function(){
    var list = Object.keys(route.list()).sort();

    console.log('\nRoutes:');

    list.forEach(function(key){
      console.log('- ' + key);
    });

    console.log('\nTotal %d routes.\n', list.length);
  });
});