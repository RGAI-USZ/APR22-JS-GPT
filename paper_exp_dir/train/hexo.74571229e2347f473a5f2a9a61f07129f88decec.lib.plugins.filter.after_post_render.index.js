'use strict';

module.exports = function(ctx){
var filter = ctx.extend.filter;

filter.register('after_post_render', require('./excerpt'));