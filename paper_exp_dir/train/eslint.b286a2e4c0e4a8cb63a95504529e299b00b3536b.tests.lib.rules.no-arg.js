







var vows = require("vows"),
assert = require("assert"),
eslint = require("../../../lib/eslint");





var RULE_ID = "no-caller";





vows.describe(RULE_ID).addBatch({

"when evaluating 'var x = arguments.callee'": {

topic: "var x = arguments.callee",

"should report a violation": function(topic) {

var config = { rules: {} };
config.rules[RULE_ID] = 1;

var messages = eslint.verify(topic, config);

assert.equal(messages.length, 1);
assert.equal(messages[0].ruleId, RULE_ID);
assert.equal(messages[0].message, "Avoid arguments.callee.");
assert.include(messages[0].node.type, "MemberExpression");
}
},

"when evaluating 'var x = arguments.caller'": {

topic: "var x = arguments.caller",

"should report a violation": function(topic) {

var config = { rules: {} };
config.rules[RULE_ID] = 1;

var messages = eslint.verify(topic, config);

assert.equal(messages.length, 1);
assert.equal(messages[0].ruleId, RULE_ID);
assert.equal(messages[0].message, "Avoid arguments.caller.");
assert.include(messages[0].node.type, "MemberExpression");
}
},

"when evaluating 'var x = arguments.length'": {

topic: "var x = arguments.length",

"should not report a violation": function(topic) {

var config = { rules: {} };
config.rules[RULE_ID] = 1;

var messages = eslint.verify(topic, config);

assert.equal(messages.length, 0);
}
},

"when evaluating 'var x = arguments'": {
