'use strict';

const stripIndent = require('strip-indent');
const { highlight } = require('hexo-util');

const rBacktick = /^((?:[^\S\r\n]*>){0,3}[^\S\r\n]*)(`{3,}|~{3,}) *(.*) *\n([\s\S]+?)\s*\2(\n+|$)/gm;
const rAllOptions = /([^\s]+)\s+(.+?)\s+(https?:\/\/\S+|\/\S+)\s*(.+)?/;
const rLangCaption = /([^\s]+)\s*(.+)?/;

function backtickCodeBlock(data) {
const config = this.config.highlight || {};
if (!config.enable) return;
data.content = data.content.replace(rBacktick, ($0, start, $2, _args, content, end) => {
const args = _args.split('=').shift();

const options = {
hljs: config.hljs,
autoDetect: config.auto_detect,
gutter: config.line_number,
tab: config.tab_replace
};

if (options.gutter) {
config.first_line_number = config.first_line_number || 'always1';
if (config.first_line_number === 'inline') {


_args = _args.replace('=+', '=');
options.gutter = _args.includes('=');


options.firstLine = options.gutter ? _args.split('=')[1] || 1 : 0;
}
}

if (args) {
const match = rAllOptions.exec(args) || rLangCaption.exec(args);


if (match) {
options.lang = match[1];

if (match[2]) {
options.caption = `<span>${match[2]}</span>`;

if (match[3]) {
options.caption += `<a href="${match[3]}">${match[4] ? match[4] : 'link'}</a>`;
}
}
}
}


if (start.includes('>')) {
const depth = start.split('>').length - 1;
const regexp = new RegExp(`^([^\\S\\r\\n]*>){0,${depth}}([^\\S\\r\\n]|$)`, 'mg');
const paddingOnEnd = ' ';
content = (content + paddingOnEnd).replace(regexp, '').replace(/\n$/, '');
}

content = highlight(stripIndent(content), options)
.replace(/{/g, '&#123;')
