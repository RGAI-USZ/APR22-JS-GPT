'use strict';

describe('External link', () => {
const Hexo = require('../../../lib/hexo');
const hexo = new Hexo();
const externalLink = require('../../../lib/plugins/filter/after_render/external_link').bind(hexo);

hexo.config = {
url: 'https://example.com',
external_link: {
enable: true,
field: 'site',
exclude: ''
}
};

it('disabled', () => {
const content = 'foo'
+ '<a href="https://hexo.io/">Hexo</a>'
+ 'bar';

hexo.config.external_link.enable = false;

const result = typeof externalLink(content);
result.should.eql('undefined');
hexo.config.external_link.enable = true;
});

it('field is post', () => {
const content = 'foo'
+ '<a href="https://hexo.io/">Hexo</a>'
+ 'bar';

hexo.config.external_link.field = 'post';

const result = typeof externalLink(content);
result.should.eql('undefined');
hexo.config.external_link.field = 'site';
});

it('enabled', () => {
const content = [
'# External link test',
'1. External link',
'<a href="https://hexo.io/">Hexo</a>',
'2. External link with "rel" Attribute',
'<a rel="external" href="https://hexo.io/">Hexo</a>',
'<a href="https://hexo.io/" rel="external">Hexo</a>',
'<a rel="noopenner" href="https://hexo.io/">Hexo</a>',
'<a href="https://hexo.io/" rel="noopenner">Hexo</a>',
'<a rel="external noopenner" href="https://hexo.io/">Hexo</a>',
'<a href="https://hexo.io/" rel="external noopenner">Hexo</a>',
'3. External link with Other Attributes',
'<a class="img" href="https://hexo.io/">Hexo</a>',
'<a href="https://hexo.io/" class="img">Hexo</a>',
'4. Internal link',
'<a href="/archives/foo.html">Link</a>',
'5. Ignore links have "target" attribute',
'<a href="https://hexo.io/" target="_blank">Hexo</a>',
'6. Ignore links don\'t have "href" attribute',
'<a>Anchor</a>',
'7. Ignore links whose hostname is same as config',
'<a href="https://example.com">Example Domain</a>'
].join('\n');

const result = externalLink(content);

result.should.eql([
'# External link test',
'1. External link',
'<a href="https://hexo.io/" target="_blank" rel="noopener">Hexo</a>',
'2. External link with "rel" Attribute',
'<a rel="external noopener" href="https://hexo.io/" target="_blank">Hexo</a>',
'<a href="https://hexo.io/" target="_blank" rel="external noopener">Hexo</a>',
'<a rel="noopenner" href="https://hexo.io/" target="_blank">Hexo</a>',
'<a href="https://hexo.io/" target="_blank" rel="noopenner">Hexo</a>',
'<a rel="external noopenner" href="https://hexo.io/" target="_blank">Hexo</a>',
'<a href="https://hexo.io/" target="_blank" rel="external noopenner">Hexo</a>',
'3. External link with Other Attributes',
'<a class="img" href="https://hexo.io/" target="_blank" rel="noopener">Hexo</a>',
'<a href="https://hexo.io/" target="_blank" rel="noopener" class="img">Hexo</a>',
'4. Internal link',
'<a href="/archives/foo.html">Link</a>',
'5. Ignore links have "target" attribute',
'<a href="https://hexo.io/" target="_blank">Hexo</a>',
'6. Ignore links don\'t have "href" attribute',
'<a>Anchor</a>',
'7. Ignore links whose hostname is same as config',
'<a href="https://example.com">Example Domain</a>'
].join('\n'));
});

it('old option - false', () => {
const content = 'foo'
+ '<a href="https://hexo.io/">Hexo</a>'
+ 'bar';

hexo.config.external_link = false;

const result = typeof externalLink(content);
result.should.eql('undefined');

hexo.config.external_link = {
enable: true,
field: 'site',
exclude: ''
};
});

it('old option - true', () => {
const content = '<a href="https://hexo.io/">Hexo</a>';

hexo.config.external_link = true;

const result = externalLink(content);
result.should.eql('<a href="https://hexo.io/" target="_blank" rel="noopener">Hexo</a>');

hexo.config.external_link = {
enable: true,
field: 'site',
exclude: ''
};
});

it('exclude - string', () => {
const content = [
'<a href="https://foo.com/">Hexo</a>',
'<a href="https://bar.com/">Hexo</a>',
'<a href="https://baz.com/">Hexo</a>'
].join('\n');

hexo.config.external_link.exclude = 'foo.com';

const result = externalLink(content);

result.should.eql([
'<a href="https://foo.com/">Hexo</a>',
'<a href="https://bar.com/" target="_blank" rel="noopener">Hexo</a>',
'<a href="https://baz.com/" target="_blank" rel="noopener">Hexo</a>'
].join('\n'));

hexo.config.external_link.exclude = '';
});

it('exclude - array', () => {
const content = [
'<a href="https://foo.com/">Hexo</a>',
'<a href="https://bar.com/">Hexo</a>',
'<a href="https://baz.com/">Hexo</a>'
].join('\n');

hexo.config.external_link.exclude = ['foo.com', 'bar.com'];

const result = externalLink(content);

result.should.eql([
'<a href="https://foo.com/">Hexo</a>',
'<a href="https://bar.com/">Hexo</a>',
'<a href="https://baz.com/" target="_blank" rel="noopener">Hexo</a>'
].join('\n'));

hexo.config.external_link.exclude = '';
});
});

describe('External link - post', () => {
const Hexo = require('../../../lib/hexo');
const hexo = new Hexo();
const externalLink = require('../../../lib/plugins/filter/after_post_render/external_link').bind(hexo);

hexo.config = {
url: 'https://example.com',
external_link: {
enable: true,
field: 'post',
exclude: ''
}
};

it('disabled', () => {
const content = 'foo<a href="https://hexo.io/">Hexo</a>bar';

const data = {content};
hexo.config.external_link.enable = false;

externalLink(data);
data.content.should.eql(content);
hexo.config.external_link.enable = true;
});

