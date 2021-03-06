const should = require('chai').should();

describe('list_posts', () => {
const Hexo = require('../../../lib/hexo');
const hexo = new Hexo(__dirname);
const Post = hexo.model('Post');

const ctx = {
config: hexo.config
};

ctx.url_for = require('../../../lib/plugins/helper/url_for').bind(ctx);

const listPosts = require('../../../lib/plugins/helper/list_posts').bind(ctx);

hexo.config.permalink = ':title/';

before(() => hexo.init().then(() => Post.insert([
{source: 'foo', slug: 'foo', title: 'Its', date: 1e8},
{source: 'bar', slug: 'bar', title: 'Chemistry', date: 1e8 + 1},
{source: 'baz', slug: 'baz', title: 'Bitch', date: 1e8 - 1}
])).then(() => {
hexo.locals.invalidate();
ctx.site = hexo.locals.toObject();
}));

it('default', () => {
const result = listPosts();

result.should.eql([
'<ul class="post-list">',
'<li class="post-list-item"><a class="post-list-link" href="/bar/">Chemistry</a></li>',
'<li class="post-list-item"><a class="post-list-link" href="/foo/">Its</a></li>',
'<li class="post-list-item"><a class="post-list-link" href="/baz/">Bitch</a></li>',
'</ul>'
].join(''));
});

it('specified collection', () => {
const result = listPosts(Post.find({
title: 'Its'
}));

result.should.eql([
'<ul class="post-list">',
'<li class="post-list-item"><a class="post-list-link" href="/foo/">Its</a></li>',
'</ul>'
].join(''));
});

it('style: false', () => {
const result = listPosts({
style: false
});

result.should.eql([
'<a class="post-link" href="/bar/">Chemistry</a>',
'<a class="post-link" href="/foo/">Its</a>',
'<a class="post-link" href="/baz/">Bitch</a>'
].join(', '));
});

it('orderby', () => {
const result = listPosts({
