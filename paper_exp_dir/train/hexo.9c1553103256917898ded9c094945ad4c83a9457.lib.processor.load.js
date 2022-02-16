var extend = require('../extend'),
renderer = Object.keys(extend.renderer.list()),
tag = extend.tag.list(),
render = require('../render'),
renderFn = render.render,
compileFn = render.compile,
route = require('../route'),
util = require('../util'),
yfm = util.yfm,
highlight = util.highlight,
titlecase = util.titlecase,
fs = require('fs'),
pathFn = require('path'),
sep = pathFn.sep,
fs = require('graceful-fs'),
swig = require('swig'),