
// Express - Plugins - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

process.mixin(require('express/plugins/common-logger'))
process.mixin(require('express/plugins/content-length'))
process.mixin(require('express/plugins/method-override'))