var log = require('./logger').create('launcher');
var baseBrowserDecoratorFactory = require('./launchers/base').decoratorFactory;


var Launcher = function(emitter, injector) {
var browsers = [];
var lastUrl;

this.launch = function(names, hostname, port, urlRoot) {
var browser;
var url = lastUrl = 'http://' + hostname + ':' + port + urlRoot;

names.forEach(function(name) {
var locals = {
id: ['value', Launcher.generateId()],
name: ['value', name],
baseBrowserDecorator: ['factory', baseBrowserDecoratorFactory]
};


if (name.indexOf('/') !== -1) {
name = 'Script';
}

try {
browser = injector.createChild([locals], ['launcher:' + name]).get('launcher:' + name);
} catch (e) {
if (e.message.indexOf('No provider for "launcher:' + name + '"') !== -1) {
log.warn('Can not load "%s", it is not registered!\n  ' +
'Perhaps you are missing some plugin?', name);
} else {
log.warn('Can not load "%s"!\n  ' + e.stack, name);
}

return;
}

log.info('Starting browser %s', browser.name);
browser.start(url);
browsers.push(browser);
});

return browsers;
};

this.launch.$inject = ['config.browsers', 'config.hostname', 'config.port', 'config.urlRoot'];


this.kill = function(id, callback) {
for (var i = 0; i < browsers.length; i++) {
if (browsers[i].id === id) {
browsers[i].kill(callback);
return true;
}
}

if (callback) {
process.nextTick(callback);
}
return false;
};


this.restart = function(id) {
for (var i = 0; i < browsers.length; i++) {
if (browsers[i].id === id) {
browsers[i].kill(function() {
browsers[i].start(lastUrl);
});
return true;
}
}

return false;
};


this.killAll = function(callback) {
log.debug('Disconnecting all browsers');

var remaining = 0;
var finish = function() {
remaining--;
if (!remaining && callback) {
callback();
}
};

if (!browsers.length) {
return process.nextTick(callback);
}

browsers.forEach(function(browser) {
remaining++;
browser.kill(finish);
});
};


this.areAllCaptured = function() {
return !browsers.some(function(browser) {
return !browser.isCaptured();
});
};


this.markCaptured = function(id) {
browsers.forEach(function(browser) {
if (browser.id === id) {
browser.markCaptured();
}
});
};



emitter.on('exit', this.killAll);
};

Launcher.$inject = ['emitter', 'injector'];

Launcher.generateId = function() {
return '' + Math.floor(Math.random() * 100000000);
};



exports.Launcher = Launcher;
