'use strict';

var should = require('chai').should();
var assert = require('chai').assert;
var url = require('url');
var pathFn = require('path');

describe('PostAsset', function(){
  var Hexo = require('../../../lib/hexo');
  var hexo = new Hexo();
  var PostAsset = hexo.model('PostAsset');
  var Post = hexo.model('Post');
  var post;

  before(function(){
    return hexo.init().then(function(){
      return Post.insert({
        source: 'foo.md',
        slug: 'bar'
      });
    }).then(function(post_){
      post = post_;
    });
  });

  it('default values', function(){
    return PostAsset.insert({
      _id: 'foo',
      slug: 'foo',
      post: post._id
    }).then(function(data){
      data.modified.should.be.true;
      return PostAsset.removeById(data._id);
    });
  });

  it('_id - required', function(){
    return PostAsset.insert({}).then(function(){
      assert.fail();
    }).catch(function(err){
      err.should.have.property('message', 'ID is not defined');
    });
  });

  it('slug - required', function(){
    return PostAsset.insert({
      _id: 'foo'
    }).then(function(){
      assert.fail();
    }).catch(function(err){
      err.should.have.property('message', '`slug` is required!');
    });
  });

  it('path - virtual', function(){
    return PostAsset.insert({
      _id: 'source/_posts/test/foo.jpg',
      slug: 'foo.jpg',
      post: post._id
    }).then(function(data){
      data.path.should.eql(url.resolve(post.path, data.slug));
      return PostAsset.removeById(data._id);
    });
  });

  it('source - virtual', function(){
    return PostAsset.insert({
      _id: 'source/_posts/test/foo.jpg',
      slug: 'foo.jpg',
      post: post._id
    }).then(function(data){
      data.source.should.eql(pathFn.join(hexo.base_dir, data._id));
      return PostAsset.removeById(data._id);
    });
  });
});