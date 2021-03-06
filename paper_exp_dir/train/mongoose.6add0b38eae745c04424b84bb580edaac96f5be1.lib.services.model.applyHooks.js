'use strict';

const utils = require('../../utils');



module.exports = applyHooks;



function applyHooks(model, schema, options) {
options = options || {};

const kareemOptions = {
useErrorHandlers: true,
numCallbackParams: 1,
nullResultByDefault: true,
contextParameter: true
};
const objToDecorate = options.decorateDoc ? model : model.prototype;

model.$appliedHooks = true;
for (let i = 0; i < schema.childSchemas.length; ++i) {
const childModel = schema.childSchemas[i].model;
if (childModel.$appliedHooks) {
continue;
}
applyHooks(childModel, schema.childSchemas[i].schema, options);
if (childModel.discriminators != null) {
let keys = Object.keys(childModel.discriminators);
for (let j = 0; j < keys.length; ++j) {
applyHooks(childModel.discriminators[keys[j]],
childModel.discriminators[keys[j]].schema, options);
}
}
}




objToDecorate.$__save = schema.s.hooks.
createWrapper('save', objToDecorate.$__save, null, kareemOptions);
objToDecorate.$__validate = schema.s.hooks.
createWrapper('validate', objToDecorate.$__validate, null, kareemOptions);
objToDecorate.$__remove = schema.s.hooks.
createWrapper('remove', objToDecorate.$__remove, null, kareemOptions);
objToDecorate.$__init = schema.s.hooks.
createWrapperSync('init', objToDecorate.$__init, null, kareemOptions);


const customMethods = Object.keys(schema.methods);
const customMethodOptions = Object.assign({}, kareemOptions, {




checkForPromise: true
});
for (const method of customMethods) {
if (!schema.s.hooks.hasHooks(method)) {



continue;
}
const originalMethod = objToDecorate[method];
objToDecorate[method] = function() {
const args = Array.prototype.slice.call(arguments);
const cb = utils.last(args);
const argsWithoutCallback = cb == null ? args :
args.slice(0, args.length - 1);
return utils.promiseOrCallback(cb, callback => {
this[`$__${method}`].apply(this,
argsWithoutCallback.concat([callback]));
});
};
objToDecorate[`$__${method}`] = schema.s.hooks.
createWrapper(method, originalMethod, null, customMethodOptions);
}
}
