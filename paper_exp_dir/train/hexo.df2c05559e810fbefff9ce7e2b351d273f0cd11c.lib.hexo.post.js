var moment = require('moment');
var swig = require('swig');
var Promise = require('bluebird');
var pathFn = require('path');
var _ = require('lodash');
var yaml = require('js-yaml');
var util = require('hexo-util');
var fs = require('hexo-fs');
var yfm = require('hexo-front-matter');

var slugize = util.slugize;
var escapeRegExp = util.escapeRegExp;

var rEscapeContent = /<escape(?:[^>]*)>([\s\S]*?)<\/escape>/g;
var rSwigVar = /\{\{[\s\S]*?\}\}/g;
var rSwigComment = /\{#[\s\S]*?#\}/g;
var rSwigBlock = /\{%[\s\S]*?%\}/g;
var rSwigFullBlock = /\{% *(.*?) *.*?%\}[\s\S]+?\{% *end\1 *%\}/g;
var placeholder = '\uFFFC';
var rPlaceholder = /(?:<p>)?\uFFFC(\d+)(?:<\/p>)?/g;

var preservedKeys = {
title: true,
slug: true,
path: true,
layout: true,
date: true,
content: true
};

swig.setDefaults({
autoescape: false
});

function Post(context){
this.context = context;
}

Post.prototype.create = function(data, replace, callback){
if (!callback && typeof replace === 'function'){
callback = replace;
replace = false;
}

var ctx = this.context;
var config = ctx.config;

data.slug = slugize(data.slug || data.title, {transform: config.filename_case});
data.layout = (data.layout || config.default_layout).toLowerCase();
data.date = data.date ? moment(data.date) : moment();

return Promise.all([

ctx.extend.filter.exec('new_post_path', data, {
args: [replace],
context: ctx
}),

this._getScaffold(data.layout)
]).spread(function(path, scaffold){

data.title = '"' + data.title + '"';
data.date = data.date.format('YYYY-MM-DD HH:mm:ss');


var split = yfm.split(scaffold);


var content = swig.compile(split.data)(data) + '\n';


var compiled = yaml.load(content);


var keys = Object.keys(data);
var key = '';
var obj = {};

for (var i = 0, len = keys.length; i < len; i++){
key = keys[i];

if (!preservedKeys[key] && !compiled.hasOwnProperty(key)){
obj[key] = data[key];
}
}

if (Object.keys(obj).length){
content += yaml.dump(obj);
}

content += '---\n';


content += split.content;

if (data.content){
content += '\n' + data.content;
}

var result = {
path: path,
content: content
};

return Promise.all([

fs.writeFile(path, content),

createAssetFolder(path, config.post_asset_folder)
]).then(function(){
ctx.emit('new', result);
}).thenReturn(result);
}).nodeify(callback);
};

Post.prototype._getScaffold = function(layout){
var ctx = this.context;

return ctx.scaffold.get(layout).then(function(result){
if (result != null) return result;
return ctx.scaffold.get('normal');
});
};

function createAssetFolder(path, assetFolder){
if (!assetFolder) return Promise.resolve();

var target = removeExtname(path);

return fs.exists(target).then(function(exist){
if (!exist) return fs.mkdirs(target);
});
}

function removeExtname(str){
return str.substring(0, str.length - pathFn.extname(str).length);
}

Post.prototype.publish = function(data, replace, callback){
if (!callback && typeof replace === 'function'){
callback = replace;
replace = false;
}

if (data.layout === 'draft') data.layout = 'post';

var ctx = this.context;
var config = ctx.config;
var draftDir = pathFn.join(ctx.source_dir, '_drafts');
var slug = data.slug = slugize(data.slug, {transform: config.filename_case});
var regex = new RegExp('^' + escapeRegExp(slug) + '(?:[^\\/\\\\]+)');
var self = this;
var src = '';
var result = {};

data.layout = (data.layout || config.default_layout).toLowerCase();


return fs.listDir(draftDir).then(function(list){
var item = '';

for (var i = 0, len = list.length; i < len; i++){
item = list[i];
if (regex.test(item)) return item;
}
}).then(function(item){
if (!item) throw new Error('Draft "' + slug + '" does not exist.');


src = pathFn.join(draftDir, item);
return fs.readFile(src);
}).then(function(content){

_.extend(data, yfm(content));
data.content = data._content;
delete data._content;

return self.create(data, replace).then(function(post){
result.path = post.path;
result.content = post.content;
});
}).then(function(){

return fs.unlink(src);
}).then(function(){
if (!config.post_asset_folder) return;


var assetSrc = removeExtname(src);
var assetDest = removeExtname(result.path);

return fs.exists(assetSrc).then(function(exist){
if (!exist) return;

return fs.copyDir(assetSrc, assetDest).then(function(){
return fs.rmdir(assetSrc);
});
});
}).thenReturn(result).nodeify(callback);
};

Post.prototype.render = function(source, data, callback){
var ctx = this.context;
var filter = ctx.extend.filter;
var config = ctx.config;
var cache = [];

data = data || {};

function escapeContent(str){
return placeholder + (cache.push(str) - 1);
}

return new Promise(function(resolve, reject){
if (data.content != null) return resolve(data.content);
if (!source) return reject(new Error('No input file or string!'));


fs.readFile(source).then(resolve, reject);
}).then(function(content){

data.content = content
.replace(rSwigComment, '')
.replace(rSwigVar, escapeContent)
.replace(rSwigFullBlock, escapeContent)
.replace(rSwigBlock, escapeContent);


return filter.exec('before_post_render', data, {context: ctx}).then(function(){
data.content = data.content.replace(rEscapeContent, function(match, content){
return placeholder + (cache.push(content) - 1);
});
});
}).then(function(){
var options = data.markdown || {};
if (!config.highlight.enable) options.highlight = null;


return ctx.render.render({
text: data.content,
path: source,
engine: data.engine,
toString: true
}, options);
}).then(function(content){

data.content = content.replace(rPlaceholder, function(){
return cache[arguments[1]];
});


cache.length = 0;


return filter.exec('after_post_render', data, {context: ctx});
});
};

module.exports = Post;