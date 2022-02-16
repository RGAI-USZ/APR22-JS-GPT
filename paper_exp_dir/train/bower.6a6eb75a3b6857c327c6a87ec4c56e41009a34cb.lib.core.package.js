













var spawn    = require('child_process').spawn;
var _        = require('lodash');
var fstream  = require('fstream');
var mkdirp   = require('mkdirp');
var events   = require('events');
var rimraf   = require('rimraf');
var semver   = require('semver');
var async    = require('async');
var https    = require('https');
var http     = require('http');
var path     = require('path');
var url      = require('url');
var tmp      = require('tmp');
var fs       = require('fs');

var config   = require('./config');
var source   = require('./source');
var template = require('../util/template');
var readJSON = require('../util/read-json');
var UnitWork = require('./unit_work');

var Package = function (name, endpoint, manager) {
this.dependencies  = {};
this.json          = {};
this.name          = name;




if (manager && manager.unitWork) {
this.manager     = manager;
this.unitWork    = manager.unitWork;
this.opts        = manager.opts;
} else {
this.unitWork    = new UnitWork;
this.opts        = _.extend({ force: false }, manager);