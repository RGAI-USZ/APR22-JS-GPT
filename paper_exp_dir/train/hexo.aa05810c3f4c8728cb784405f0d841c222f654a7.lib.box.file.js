'use strict';

const { readFile, readFileSync, stat, statSync } = require('hexo-fs');

class File {
constructor({ source, path, params, type }) {
this.source = source;
this.path = path;
this.params = params;
this.type = type;
}

read(options, callback) {
if (!callback && typeof options === 'function') {
callback = options;
options = {};
}
return readFile(this.source, options).asCallback(callback);
}

readSync(options) {
return readFileSync(this.source, options);
}

stat(options, callback) {
