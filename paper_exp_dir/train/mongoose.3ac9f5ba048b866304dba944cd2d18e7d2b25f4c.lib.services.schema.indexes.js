'use strict';

const get = require('lodash.get');
const utils = require('../../utils');



module.exports = function getIndexes(schema) {
let indexes = [];
const schemaStack = [];
const indexTypes = schema.constructor.indexTypes;

const collectIndexes = function(schema, prefix) {


if (schemaStack.indexOf(schema) !== -1) {
return;
}
schemaStack.push(schema);

prefix = prefix || '';
const keys = Object.keys(schema.paths);
const length = keys.length;

for (let i = 0; i < length; ++i) {
const key = keys[i];
const path = schema.paths[key];

if (path.$isMongooseDocumentArray || path.$isSingleNested) {
if (get(path, 'options.excludeIndexes') !== true &&
get(path, 'schemaOptions.excludeIndexes') !== true) {
collectIndexes(path.schema, prefix + key + '.');
}

if (path.schema.discriminators != null) {
const discriminators = path.schema.discriminators;
const discriminatorKeys = Object.keys(discriminators);
for (const discriminatorKey of discriminatorKeys) {
collectIndexes(discriminators[discriminatorKey]._originalSchema,
prefix + key + '.');
}
}



if (path.$isMongooseDocumentArray) {
continue;
}
}

const index = path._index || (path.caster && path.caster._index);

if (index !== false && index !== null && index !== undefined) {
const field = {};
const isObject = utils.isObject(index);
const options = isObject ? index : {};
const type = typeof index === 'string' ? index :
isObject ? index.type :
false;

if (type && indexTypes.indexOf(type) !== -1) {
field[prefix + key] = type;
} else if (options.text) {
field[prefix + key] = 'text';
delete options.text;
} else {
field[prefix + key] = 1;
}

delete options.type;
if (!('background' in options)) {
options.background = true;
}

indexes.push([field, options]);
}
}

schemaStack.pop();

if (prefix) {
fixSubIndexPaths(schema, prefix);
} else {
schema._indexes.forEach(function(index) {
if (!('background' in index[1])) {
index[1].background = true;
}
});
indexes = indexes.concat(schema._indexes);
}
};

collectIndexes(schema);
return indexes;



function fixSubIndexPaths(schema, prefix) {
const subindexes = schema._indexes;
const len = subindexes.length;
for (let i = 0; i < len; ++i) {
const indexObj = subindexes[i][0];
const keys = Object.keys(indexObj);
const klen = keys.length;
const newindex = {};


for (let j = 0; j < klen; ++j) {
const key = keys[j];
newindex[prefix + key] = indexObj[key];
}

indexes.push([newindex, subindexes[i][1]]);
}
}
};
