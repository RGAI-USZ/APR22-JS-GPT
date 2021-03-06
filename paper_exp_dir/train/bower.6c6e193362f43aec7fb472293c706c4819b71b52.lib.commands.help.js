







var events = require('events');
var hogan  = require('hogan.js');
var nopt   = require('nopt');
var path   = require('path');
var fs     = require('fs');
var _      = require('underscore');

var template  = require('../util/template');
var config    = require('../config');

module.exports = function (name) {
var context      = {};
var emitter      = new events.EventEmitter;
var commands     = require('../commands');
var templateName = name ? 'help-' + name : 'help';

if (!name) context = { commands: Object.keys(commands).join(', ') };
_.extend(context, config)
template(templateName, context).on('data', emitter.emit.bind(emitter, 'end'));
return emitter;
}

module.exports.line = function (argv) {
var options  = nopt({}, {}, argv);
var paths    = options.argv.remain.slice(1);
return module.exports(paths[0]);
};
