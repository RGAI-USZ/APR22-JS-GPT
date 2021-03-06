'use strict';

const Schema = require('warehouse').Schema;
const util = require('hexo-util');
const slugize = util.slugize;
const hasOwn = Object.prototype.hasOwnProperty;

module.exports = ctx => {
const Tag = new Schema({
name: {type: String, required: true}
});

Tag.virtual('slug').get(function() {
const map = ctx.config.tag_map || {};
let name = this.name;
if (!name) return;

if (Reflect.apply(hasOwn, map, [name])) {
name = map[name] || name;
}

return slugize(name, {transform: ctx.config.filename_case});
});

Tag.virtual('path').get(function() {
let tagDir = ctx.config.tag_dir;
if (tagDir[tagDir.length - 1] !== '/') tagDir += '/';

return `${tagDir + this.slug}/`;
});

Tag.virtual('permalink').get(function() {
return `${ctx.config.url}/${this.path}`;
});

Tag.virtual('posts').get(function() {
const PostTag = ctx.model('PostTag');

const ids = PostTag.find({tag_id: this._id}).map(item => item.post_id);

return ctx.locals.get('posts').find({
_id: {$in: ids}
});
});

Tag.virtual('length').get(function() {
return this.posts.length;
});


Tag.pre('save', data => {
const name = data.name;
if (!name) return;

const Tag = ctx.model('Tag');
const tag = Tag.findOne({name}, {lean: true});

if (tag) {
throw new Error(`Tag \`${name}\` has already existed!`);
}
});


Tag.pre('remove', data => {
const PostTag = ctx.model('PostTag');
return PostTag.remove({tag_id: data._id});
});

return Tag;
};
