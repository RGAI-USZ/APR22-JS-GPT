/**
 * Vimeo tag
 *
 * Syntax:
 *   {% vimeo video_id %}
 */

module.exports = function(args, content){
  var id = args[0];

  return '<div class="video-container"><iframe src="http://player.vimeo.com/video/' + id + '" frameborder="0" allowfullscreen></iframe></div>';
};