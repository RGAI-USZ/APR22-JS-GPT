'use strict';

var should = require('chai').should();
var url = require('url');
var pathFn = require('path');

describe('PostAsset', function(){
var Hexo = require('../../../lib/hexo');
var hexo = new Hexo();
var PostAsset = hexo.model('PostAsset');