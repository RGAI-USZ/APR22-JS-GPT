var live = require('LiveScript');

var log = require('../logger').create('preprocess.ls');

var Live = function(content, file, basePath, done) {
log.debug('Processing "%s".', file.originalPath);
file.path = file.originalPath + '-compiled.js';

var processed = null;
try {
processed = live.compile(content, {bare: true});
