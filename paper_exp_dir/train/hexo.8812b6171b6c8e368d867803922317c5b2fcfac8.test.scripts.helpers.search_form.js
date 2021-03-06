'use strict';

var should = require('chai').should();

describe('search_form', function(){
var searchForm = require('../../../lib/plugins/helper/search_form').bind({
config: {url: 'http://hexo.io'}
});

it('default', function(){
searchForm().should.eql('<form action="//google.com/search" method="get" accept-charset="UTF-8" class="search-form">' +
'<input type="search" name="q" results="0" class="search-form-input" placeholder="Search">' +
'<input type="hidden" name="sitesearch" value="http://hexo.io">' +
'</form>');
});

it('class', function(){
searchForm({class: 'foo'}).should.eql('<form action="//google.com/search" method="get" accept-charset="UTF-8" class="foo">' +
'<input type="search" name="q" results="0" class="foo-input" placeholder="Search">' +
'<input type="hidden" name="sitesearch" value="http://hexo.io">' +
'</form>');
});

it('text', function(){
searchForm({text: 'Find'}).should.eql('<form action="//google.com/search" method="get" accept-charset="UTF-8" class="search-form">' +
'<input type="search" name="q" results="0" class="search-form-input" placeholder="Find">' +
'<input type="hidden" name="sitesearch" value="http://hexo.io">' +
'</form>');
});

it('button enabled', function(){
searchForm({button: true, text: 'Find'}).should.eql('<form action="//google.com/search" method="get" accept-charset="UTF-8" class="search-form">' +
'<input type="search" name="q" results="0" class="search-form-input" placeholder="Find">' +
'<button type="submit" class="search-form-submit">Find</button>' +
'<input type="hidden" name="sitesearch" value="http://hexo.io">' +
'</form>');
});

it('button text', function(){
searchForm({button: 'Go', text: 'Find'}).should.eql('<form action="//google.com/search" method="get" accept-charset="UTF-8" class="search-form">' +
'<input type="search" name="q" results="0" class="search-form-input" placeholder="Find">' +
'<button type="submit" class="search-form-submit">Go</button>' +
'<input type="hidden" name="sitesearch" value="http://hexo.io">' +
'</form>');
});
});
