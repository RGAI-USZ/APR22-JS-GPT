'use strict';

describe('Meta Generator', () => {
const Hexo = require('../../../lib/hexo');
const hexo = new Hexo();
const metaGenerator = require('../../../lib/plugins/filter/meta_generator').bind(hexo);
const cheerio = require('cheerio');

it('default', () => {
const content = '<head><link></head>';
const result = metaGenerator(content);

const $ = cheerio.load(result);
$('meta[name="generator"]').length.should.eql(1);
$('meta[name="generator"]').attr('content').should.eql(`Hexo ${hexo.version}`);
});

it('disable meta_generator', () => {
const content = '<head><link></head>';
hexo.config.meta_generator = false;
const result = metaGenerator(content);

const resultType = typeof result;
