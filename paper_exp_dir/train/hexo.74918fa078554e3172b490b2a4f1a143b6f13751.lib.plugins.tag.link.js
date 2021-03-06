'use strict';

const util = require('hexo-util');
const htmlTag = util.htmlTag;

const rUrl = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[.!/\\w]*))?)/;



function linkTag(args, content) {
let url = '';
const text = [];
let external = false;
let title = '';
let item = '';
let i = 0;
const len = args.length;


for (; i < len; i++) {
item = args[i];

if (rUrl.test(item)) {
url = item;
break;
} else {
text.push(item);
}
}


args = args.slice(i + 1);



if (args.length) {
const shift = args[0];

if (shift === 'true' || shift === 'false') {
external = shift === 'true';
args.shift();
}

title = args.join(' ');
}

const attrs = {
href: url,
title,
target: external ? '_blank' : ''
};

return htmlTag('a', attrs, text.join(' '));
}

module.exports = linkTag;
