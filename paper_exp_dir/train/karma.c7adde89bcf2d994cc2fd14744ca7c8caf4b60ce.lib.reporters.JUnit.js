var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');

var u = require('../util');
var log = require('../logger').create('reporter');


var JUnitReporter = function(formatError, outputFile, pkgName) {
var xml;
var suites;

this.adapters = [];

this.onRunStart = function(browsers) {
suites = {};
xml = builder.create('testsuites');

var suite;
var timestamp = (new Date()).toISOString().substr(0, 19);
browsers.forEach(function(browser) {
suite = suites[browser.id] = xml.ele('testsuite', {
name: browser.name, 'package': pkgName, timestamp: timestamp, id: 0, hostname: os.hostname()
});
suite.ele('properties').ele('property', {name: 'browser.fullName', value: browser.fullName});
});
};

this.onBrowserComplete = function(browser) {
var suite = suites[browser.id];
var result = browser.lastResult;

suite.att('tests', result.total);
suite.att('errors', result.disconnected || result.error ? 1 : 0);
suite.att('failures', result.failed);
suite.att('time', result.netTime / 1000);

suite.ele('system-out');
suite.ele('system-err');
};

this.onRunComplete = function() {
var xmlToOutput = xml;

u.mkdirIfNotExists(path.dirname(outputFile), function() {
fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function(err) {
if (err) {
log.warn('Cannot write JUnit xml\n\t' + err.message);
} else {
log.debug('JUnit results written to "%s".', outputFile);
}
});
