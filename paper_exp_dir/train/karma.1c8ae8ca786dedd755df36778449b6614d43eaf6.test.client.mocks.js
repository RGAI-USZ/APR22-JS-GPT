

var Emitter = function() {
var listeners = {};

this.on = function(event, fn) {
if (!listeners[event]) {
listeners[event] = [];
}

listeners[event].push(fn);
};

this.done = function(fn) {
this.on("done", fn);
};

this.testStart = function(fn) {
this.on("testStart", fn);
};

this.testDone = function(fn) {
this.on("testDone", fn);
};

this.log = function(fn) {
this.on("log", fn);
};

this.emit = function(event) {
var eventListeners = listeners[event];

if (!eventListeners) return;

var i = 0;
