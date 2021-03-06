'use strict';

var Promise = require('bluebird');

function renderPostFilter() {
var self = this;

function renderPosts(model) {
var posts = model.toArray().filter(function(post) {
return post.content == null;
});

return Promise.map(posts, function(post) {
post.content = post._content;

return self.post.render(post.full_source, post).then(function() {
return post.save();
});
