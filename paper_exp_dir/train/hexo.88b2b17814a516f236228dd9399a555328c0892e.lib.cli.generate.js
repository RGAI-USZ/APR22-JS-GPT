var extend = require('../extend'),
route = require('../route'),
util = require('../util'),
file = util.file,
spawn = util.spawn,
utilFn = require('util'),
inherits = utilFn.inherits,
format = utilFn.format,
async = require('async'),
colors = require('colors'),
fs = require('fs'),
_ = require('underscore'),
publicDir = hexo.public_dir,
stdout = hexo.process.stdout,
cache = {};