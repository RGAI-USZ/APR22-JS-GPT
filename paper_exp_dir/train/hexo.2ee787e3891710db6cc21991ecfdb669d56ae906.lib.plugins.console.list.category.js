'use strict';

const chalk = require('chalk');
const table = require('text-table');
const common = require('./common');

function listCategory() {
const categories = this.model('Category');

const data = categories.sort({name: 1}).map(cate => [cate.name, String(cate.length)]);


const header = ['Name', 'Posts'].map(str => chalk.underline(str));

data.unshift(header);

