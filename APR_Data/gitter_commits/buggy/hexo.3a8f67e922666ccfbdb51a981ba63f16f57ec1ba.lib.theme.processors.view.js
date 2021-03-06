var Pattern = require('../../box/pattern');
var pathFn = require('path');

exports.process = function(file){
  var path = file.params.path;

  if (file.type === 'delete'){
    file.box.removeView(path);
    return;
  }

  return file.read().then(function(result){
    file.box.setView(path, result);
  });
};

exports.pattern = new Pattern('layout/*path');