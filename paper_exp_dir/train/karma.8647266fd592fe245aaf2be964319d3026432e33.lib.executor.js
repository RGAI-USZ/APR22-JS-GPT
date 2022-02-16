var log = require('./logger').create();

var Executor = function(capturedBrowsers, config, emitter) {
var self = this;
var executionScheduled = false;
var pendingCount = 0;
var runningBrowsers;

var schedule = function() {
var nonReady = [];

if (!capturedBrowsers.length) {
log.warn('No captured browser, open http://%s:%s%s', config.hostname, config.port,
config.urlRoot);
return false;
}

if (capturedBrowsers.areAllReady(nonReady)) {
log.debug('All browsers are ready, executing');
executionScheduled = false;
capturedBrowsers.clearResults();
capturedBrowsers.setAllToExecuting();
pendingCount = capturedBrowsers.length;
runningBrowsers = capturedBrowsers.clone();
emitter.emit('run_start', runningBrowsers);
self.socketIoSockets.emit('execute', config.client);


capturedBrowsers.forEach(function(browser) {
emitter.emit('browser_start', browser);
});
return true;
}

log.info('Delaying execution, these browsers are not ready: ' + nonReady.join(', '));
executionScheduled = true;
return false;