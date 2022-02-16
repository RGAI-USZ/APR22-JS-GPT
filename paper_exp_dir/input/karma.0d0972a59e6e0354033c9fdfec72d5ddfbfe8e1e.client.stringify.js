var instanceOf = require('./util').instanceOf;

var stringify = function stringify(obj, depth) {

if (depth === 0) {
return '...';
}

if (obj === null) {
return 'null';
}

switch (typeof obj) {
case 'string':
return '\'' + obj + '\'';
case 'undefined':
return 'undefined';
case 'function':
return obj.toString().replace(/\{[\s\S]*\}/, '{ ... }');
case 'boolean':
return obj ? 'true' : 'false';
case 'object':
var strs = [];
if (instanceOf(obj, 'Array')) {
strs.push('[');
for (var i = 0, ii = obj.length; i < ii; i++) {
if (i) {
strs.push(', ');
}
strs.push(stringify(obj[i], depth - 1));
}
strs.push(']');
} else if (instanceOf(obj, 'Date')) {
return obj.toString();
} else if (instanceOf(obj, 'Text')) {
return obj.nodeValue;
} else if (instanceOf(obj, 'Comment')) {
return '<!--' + obj.nodeValue + '-->';
} else if (obj.outerHTML) {
return obj.outerHTML;
} else {