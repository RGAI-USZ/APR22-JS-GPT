var extend = require('../extend');

extend.tag.register('youtube', function(args, content){
  var id = args[0];

  return '<div class="video-container"><iframe width="560" height="315" src="http://www.youtube.com/embed/' + id + '" frameborder="0" allowfullscreen></iframe></div>';
});