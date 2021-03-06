'use strict';

const util = require('hexo-util');
const cheerio = require('cheerio');

describe('code', () => {
const Hexo = require('../../../lib/hexo');
const hexo = new Hexo();
const codeTag = require('../../../lib/plugins/tag/code')(hexo);
const { escapeHTML } = util;

const fixture = [
'if (tired && night){',
'  sleep();',
'}'
].join('\n');

function code(args, content) {
return codeTag(args.split(' '), content);
}


function enablePrismjs() {
hexo.config.highlight.enable = false;
hexo.config.prismjs.enable = true;
}

function highlight(code, options) {
return util.highlight(code, options || {})
.replace(/{/g, '&#123;')
.replace(/}/g, '&#125;');
}

function prism(code, options) {
return util.prismHighlight(code, options || {})
.replace(/{/g, '&#123;')
.replace(/}/g, '&#125;');
}

it('highlightjs - default', () => {
const result = code('', fixture);
result.should.eql(highlight(fixture));
});

it('highlightjs - non standard indent', () => {
const nonStandardIndent = [
'  ',
'  return x;',
'}',
'',
fixture,
'  '
].join('/n');
const result = code('', nonStandardIndent);
result.should.eql(highlight(nonStandardIndent));
});

it('highlightjs - lang', () => {
const result = code('lang:js', fixture);
result.should.eql(highlight(fixture, {
lang: 'js'
}));
});

it('highlightjs - line_number', () => {
let result = code('line_number:false', fixture);
result.should.eql(highlight(fixture, {
gutter: false
}));
result = code('line_number:true', fixture);
result.should.eql(highlight(fixture, {
gutter: true
}));
});

it('highlightjs - highlight disable', () => {
const result = code('highlight:false', fixture);
result.should.eql('<pre><code>' + escapeHTML(fixture) + '</code></pre>');
});

it('highlightjs - title', () => {
const result = code('Hello world', fixture);
result.should.eql(highlight(fixture, {
caption: '<span>Hello world</span>'
}));
});

it('highlightjs - link', () => {
const result = code('Hello world https://hexo.io/', fixture);
const expected = highlight(fixture, {
caption: '<span>Hello world</span><a href="https://hexo.io/">link</a>'
});

result.should.eql(expected);
});

it('highlightjs - link text', () => {
const result = code('Hello world https://hexo.io/ Hexo', fixture);
const expected = highlight(fixture, {
caption: '<span>Hello world</span><a href="https://hexo.io/">Hexo</a>'
});

result.should.eql(expected);
});

it('highlightjs - disabled', () => {
hexo.config.highlight.enable = false;

const result = code('', fixture);
result.should.eql('<pre><code>' + escapeHTML(fixture) + '</code></pre>');

hexo.config.highlight.enable = true;
});

it('highlightjs - first_line', () => {
let result = code('first_line:1234', fixture);
result.should.eql(highlight(fixture, {
firstLine: 1234
}));
result = code('', fixture);
result.should.eql(highlight(fixture, {
firstLine: 1
}));
});

it('highlightjs - mark', () => {
const source = [
'const http = require(\'http\');',
'',
'const hostname = \'127.0.0.1\';',
'const port = 1337;',
'',
'http.createServer((req, res) => {',
'  res.writeHead(200, { \'Content-Type\': \'text/plain\' });',
'  res.end(\'Hello World\n\');',
'}).listen(port, hostname, () => {',
'  console.log(`Server running at http://${hostname}:${port}/`);',
'});'
].join('\n');

code('mark:1,7-9,11', source).should.eql(highlight(source, {
mark: [1, 7, 8, 9, 11]
}));

code('mark:11,9-7,1', source).should.eql(highlight(source, {
mark: [1, 7, 8, 9, 11]
}));
});

it('highlightjs - # lines', () => {
const result = code('', fixture);
const $ = cheerio.load(result);
$('.gutter .line').should.have.lengthOf(3);
});

it('highlightjs - wrap', () => {
let result = code('wrap:false', fixture);
result.should.eql(highlight(fixture, {
wrap: false
}));
result = code('wrap:true', fixture);
result.should.eql(highlight(fixture, {
wrap: true
}));
});

it('prismjs - default', () => {
enablePrismjs();

const result = code('', fixture);
result.should.eql(prism(fixture));
});

it('prismjs - non standard indent', () => {
enablePrismjs();

const nonStandardIndent = [
'  ',
'  return x;',
'}',
'',
fixture,
'  '
].join('/n');
const result = code('', nonStandardIndent);
result.should.eql(prism(nonStandardIndent));
});

it('prismjs - lang', () => {
enablePrismjs();

const result = code('lang:js', fixture);
result.should.eql(prism(fixture, {
lang: 'js'
}));
});

it('prismjs - line_number', () => {
enablePrismjs();

let result = code('line_number:false', fixture);
result.should.eql(prism(fixture, {
lineNumber: false
}));
result = code('line_number:true', fixture);
result.should.eql(prism(fixture, {
lineNumber: true
}));
});

it('prismjs - highlight disable', () => {
enablePrismjs();

const result = code('highlight:false', fixture);
result.should.eql('<pre><code>' + escapeHTML(fixture) + '</code></pre>');
});

it('prismjs - disabled', () => {
hexo.config.highlight.enable = false;
hexo.config.prismjs.enable = false;

const result = code('', fixture);
result.should.eql('<pre><code>' + escapeHTML(fixture) + '</code></pre>');

hexo.config.highlight.enable = true;
});

it('prismjs - first_line', () => {
enablePrismjs();

let result = code('first_line:1234', fixture);
result.should.eql(prism(fixture, {
firstLine: 1234
}));
result = code('', fixture);
result.should.eql(prism(fixture, {
firstLine: 1
}));
});

it('prismjs - mark', () => {
enablePrismjs();

const source = [
'const http = require(\'http\');',
'',
'const hostname = \'127.0.0.1\';',
'const port = 1337;',
'',
'http.createServer((req, res) => {',
'  res.writeHead(200, { \'Content-Type\': \'text/plain\' });',
'  res.end(\'Hello World\n\');',
'}).listen(port, hostname, () => {',
'  console.log(`Server running at http://${hostname}:${port}/`);',
'});'
].join('\n');

code('mark:1,7-9,11', source).should.eql(prism(source, {
mark: [1, 7, 8, 9, 11]
}));

code('mark:11,9-7,1', source).should.eql(prism(source, {
mark: [1, 7, 8, 9, 11]
}));
});

