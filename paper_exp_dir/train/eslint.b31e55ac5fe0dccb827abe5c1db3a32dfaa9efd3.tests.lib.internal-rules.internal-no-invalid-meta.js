

"use strict";





const rule = require("../../tools/internal-rules/internal-no-invalid-meta"),
RuleTester = require("../../../lib/testers/rule-tester");





const ruleTester = new RuleTester();

ruleTester.run("internal-no-invalid-meta", rule, {
valid: [


[
"module.exports = {",
"    meta: {",
"        docs: {",
"            description: 'some rule',",
"            category: 'Internal',",
"            recommended: false",
"        },",
"        schema: []",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {",
"                context.report({",
"                    node: node",
"                });",
"            }",
"        };",
"    }",
"};"
].join("\n"),


[
"module.exports = {",
"    meta: {",
"        docs: {",
"            description: 'some rule',",
"            category: 'Internal',",
"            recommended: false",
"        },",
"        schema: []",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {",
"                context.report(node, 'Getter is not present');",
"            }",
"        };",
"    }",
"};"
].join("\n"),


[
"module.exports = {",
"    meta: {",
"        docs: {",
"            description: 'some rule',",
"            category: 'Internal',",
"            recommended: false",
"        },",
"        schema: [],",
"        fixable: 'whitespace'",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {",
"                context.report({",
"                    node: node,",
"                    fix: function(fixer) {",
"                        return fixer.insertTextAfter(node, ' ');",
"                    }",
"                });",
"            }",
"        };",
"    }",
"};"
].join("\n")
],
invalid: [
{
code: [
"module.exports = function(context) {",
"    return {",
"        Program: function(node) {}",
"    };",
"};"
].join("\n"),
errors: [{
message: "Rule does not export an Object. Make sure the rule follows the new rule format.",
line: 1,
column: 18
}]
},
{
code: [
"module.exports = {",
"    create: function(context) {",
"        return {",
"            Program: function(node) {}",
"        };",
"    }",
"};"
].join("\n"),
errors: [{
message: "Rule is missing a meta property.",
line: 1,
column: 18
}]
},
{
code: [
"module.exports = {",
"    meta: {",
"        schema: []",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {}",
"        };",
"    }",
"};"
].join("\n"),
errors: [{
message: "Rule is missing a meta.docs property.",
line: 2,
column: 5
}]
},
{
code: [
"module.exports = {",
"    meta: {",
"        docs: {",
"            category: 'Internal',",
"            recommended: false",
"        },",
"        schema: []",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {}",
"        };",
"    }",
"};"
].join("\n"),
errors: [{
message: "Rule is missing a meta.docs.description property.",
line: 2,
column: 5
}]
},
{
code: [
"module.exports = {",
"    meta: {",
"        docs: {",
"            description: 'some rule',",
"            recommended: false",
"        },",
"        schema: []",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {}",
"        };",
"    }",
"};"
].join("\n"),
errors: [{
message: "Rule is missing a meta.docs.category property.",
line: 2,
column: 5
}]
},
{
code: [
"module.exports = {",
"    meta: {",
"        docs: {",
"            description: 'some rule',",
"            category: 'Internal'",
"        },",
"        schema: []",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {}",
"        };",
"    }",
"};"
].join("\n"),
errors: [{
message: "Rule is missing a meta.docs.recommended property.",
line: 2,
column: 5
}]
},
{
code: [
"module.exports = {",
"    meta: {",
"        docs: {",
"            description: 'some rule',",
"            category: 'Internal',",
"            recommended: false",
"        }",
"    },",

"    create: function(context) {",
"        return {",
"            Program: function(node) {}",
"        };",
"    }",
"};"
].join("\n"),
errors: [{
message: "Rule is missing a meta.schema property.",
line: 2,
column: 5
}]
}
]
});
