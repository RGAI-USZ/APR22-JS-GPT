'use strict';

const { relative_url } = require('hexo-util');

module.exports = function(from, to) {
return relative_url.call(this, from, to);
