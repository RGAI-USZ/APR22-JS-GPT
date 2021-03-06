var _ = require('lodash'),
moment = require('moment');

exports.list_categories = function(categories, options){
if (!options){
options = categories;
categories = this.site.categories;
}

var options = _.extend({
orderby: 'name',
order: 1,
show_count: true,
style: 'list',
separator: ', ',
depth: 0,
class: 'category'
}, options);

var style = options.style,
showCount = options.show_count,
className = options.class,
depth = options.depth,
orderby = options.orderby,
order = options.order,
root = this.config.root;

if (style === 'list'){
var result = '<ul class="' + className + '-list">';
} else {
var result = '';
}

var arr = [];

var list = function(i, parent){
var html = '';

if (depth == -1){
var condition = {};
} else {
var condition = {
parent: parent ? parent : {$exist: false}
};
}

categories.find(condition).sort(orderby, order).each(function(cat){
if (!cat.length) return;

if (style === 'list'){
html += '<li class="' + className + '-list-item">' +
'<a class="' + className + '-list-link" href="' + root + cat.path + '">' + cat.name + '</a>' +
(showCount ? '<span class="' + className + '-count">' + cat.length + '</span>' : '');

if (depth == 0 || depth > i + 1){
var child = list(i + 1, cat._id);

if (child){
html += '<ul class="' + className + '-list-child">' + child + '</ul>';
}
}

html += '</li>';

if (i == 0 && depth > -1) arr.push(html);
} else {
arr.push('<a class="' + className + '-link" href="' + root + cat.path + '">' +
cat.name +
(showCount ? '<span class="' + className + '-count">' + cat.length + '</span>' : '') +
'</a>');

if (depth == 0 || depth > i + 1){
list(i + 1, cat._id);
}
}
});

if (style === 'list'){
if (i > 0){
return html;
} else if (depth == -1){
arr.push(html);
}
}
};

list(0);

if (style === 'list'){
result += arr.join('') + '</ul>';
} else {
result += arr.join(options.separator);
}

return result;
};

exports.list_tags = function(tags, options){
if (!options){
options = tags;
tags = this.site.tags;
}

var options = _.extend({
orderby: 'name',
order: 1,
show_count: true,
style: 'list',
separator: ', ',
class: 'tag'
}, options);

var style = options.style,
showCount = options.show_count,
className = options.class,
root = this.config.root;

if (style === 'list'){
var result = '<ul class="' + className + '-list">';
} else {
var result = '';
}

var arr = [];

tags.sort(options.orderby, options.order).each(function(tag){
if (!tag.length) return;

if (style === 'list'){
arr.push('<li class="' + className + '-list-item">' +
'<a class="' + className + '-list-link" href="' + root + tag.path + '">' + tag.name + '</a>' +
(showCount ? '<span class="' + className + '-list-count">' + tag.length + '</span>' : '') +
'</li>');
} else {
arr.push('<a class="' + className + '-link" href="' + root + tag.path + '">' +
tag.name +
(showCount ? '<span class="' + className + '-count">' + tag.length + '</span>' : '') +
'</a>');
}
});

if (style === 'list'){
result += arr.join('') + '</ul>';
} else {
result += arr.join(options.separator);
}

return result;
};

exports.list_archives = function(options){
var options = _.extend({
type: 'monthly',
order: 1,
show_count: true,
style: 'list',
separator: ', ',
class: 'archive'
}, options);

if (!options.format){
if (options.type === 'monthly'){
options.format = 'MMMM YYYY';
} else {
options.format = 'YYYY';
}
}

var style = options.style,
showCount = options.show_count,
className = options.class,
type = options.type,
format = options.format,
root = this.config.root,
archiveDir = this.config.archive_dir;

if (style === 'list'){
var result = '<ul class="' + className + '-list">';
} else {
var result = '';
}

var posts = this.site.posts.sort('date', -1),
arr = [];

if (!posts.length) return '';

var item = function(href, name, length){
if (style === 'list'){
arr.push('<li class="' + className + '-list-item">' +
'<a class="' + className + '-list-link" href="' + root + archiveDir + '/' + href + '">' + name + '</a>' +
(showCount ? '<span class="' + className + '-list-count">' + length + '</span>' : '') +
'</li>')
} else {
arr.push('<a class="' + className + '-link" href="' + root + archiveDir + '/' + href + '">' +
name +
(showCount ? '<span class="' + className + '-count">' + length + '</span>' : '') +
'</a>');
}
};

var newest = posts.first().date,
oldest = posts.last().date;

for (var i = oldest.year(); i <= newest.year(); i++){
var yearly = posts.find({date: {$year: i}});

if (!yearly.length) continue;

if (type === 'yearly'){
item(i, moment([i]).format(format), yearly.length);

continue;
}

for (var j = 1; j <= 12; j++){
var monthly = yearly.find({date: {$year: i, $month: j}});

if (!monthly.length) continue;

item(i + '/' + (j < 10 ? '0' + j : j), moment([i, j]).format(format), monthly.length);
}
}

if (options.order == -1 || options.order === 'desc') arr.reverse();

if (style === 'list'){
result += arr.join('') + '</ul>';
} else {
result += arr.join(options.separator);
}

return result;
};
