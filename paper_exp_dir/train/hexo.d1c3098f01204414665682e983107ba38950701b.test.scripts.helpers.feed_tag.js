'use strict';

var should = require('chai').should();

describe('feed_tag', function() {
var Hexo = require('../../../lib/hexo');
var hexo = new Hexo(__dirname);

var ctx = {
config: hexo.config
};

ctx.url_for = require('../../../lib/plugins/helper/url_for').bind(ctx);

var feed = require('../../../lib/plugins/helper/feed_tag').bind(ctx);

it('path', function() {
feed('atom.xml').should.eql('<link rel="alternate" href="/atom.xml" title="Hexo">');
});

it('title', function() {
feed('atom.xml', {title: 'RSS Feed'}).should.eql('<link rel="alternate" href="/atom.xml" title="RSS Feed">');
});

it('type', function() {
feed('rss.xml', {type: 'rss'}).should.eql('<link rel="alternate" href="/rss.xml" title="Hexo">');
});
});
