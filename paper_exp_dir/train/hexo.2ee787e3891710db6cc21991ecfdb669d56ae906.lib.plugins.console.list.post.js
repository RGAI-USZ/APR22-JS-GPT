'use strict';

const chalk = require('chalk');
const table = require('text-table');
const common = require('./common');

function mapName(item) {
return item.name;
}

function listPost() {
const Post = this.model('Post');

const data = Post.sort({published: -1, date: 1}).map(post => {
const date = post.published ? post.date.format('YYYY-MM-DD') : 'Draft';
const tags = post.tags.map(mapName);
const categories = post.categories.map(mapName);

return [
chalk.gray(date),
post.title,
chalk.magenta(post.source),
categories.join(', '),
tags.join(', ')
];
});


const header = ['Date', 'Title', 'Path', 'Category', 'Tags'].map(str => chalk.underline(str));

