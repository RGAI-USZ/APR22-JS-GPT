'use strict';

class Locals {
constructor() {
this.cache = {};
this.getters = {};
}

get(name) {
if (typeof name !== 'string') throw new TypeError('name must be a string!');

let cache = this.cache[name];

if (cache == null) {
const getter = this.getters[name];
if (!getter) return;

cache = getter();
this.cache[name] = cache;
}

return cache;
}

set(name, value) {
if (typeof name !== 'string') throw new TypeError('name must be a string!');
if (value == null) throw new TypeError('value is required!');

const getter = typeof value === 'function' ? value : () => value;

this.getters[name] = getter;
this.cache[name] = null;

return this;
}

remove(name) {
if (typeof name !== 'string') throw new TypeError('name must be a string!');

this.getters[name] = null;
this.cache[name] = null;

return this;
}

invalidate() {
this.cache = {};

return this;
}

toObject() {
const result = {};
const keys = Object.keys(this.getters);

for (let i = 0, len = keys.length; i < len; i++) {
const key = keys[i];
const item = this.get(key);

if (item != null) result[key] = item;
}

return result;
}
}

module.exports = Locals;
