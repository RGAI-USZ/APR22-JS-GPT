'use strict';

const abbrev = require('abbrev');

const store = {
page: require('./page'),
post: require('./post'),
route: require('./route'),
tag: require('./tag'),
category: require('./category')
};

const alias = abbrev(Object.keys(store));

function listConsole(args) {
const type = args._.shift();
const self = this;


if (!type || !alias[type]) {
return this.call('help', {_: ['list']});
}

return this.load().then(() => store[alias[type]].call(self, args));
}

module.exports = listConsole;
