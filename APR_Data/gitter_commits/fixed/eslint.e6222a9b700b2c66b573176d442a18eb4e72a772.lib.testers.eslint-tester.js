/**
 * @fileoverview Mocha test wrapper
 * @author Ilya Volodin
 */
"use strict";

/* global describe, it */

/*
 * This is a wrapper around mocha to allow for DRY unittests for eslint
 * Format:
 * RuleTester.add("{ruleName}", {
 *      valid: [
 *          "{code}",
 *          { code: "{code}", options: {options}, global: {globals}, globals: {globals}, parser: "{parser}", settings: {settings} }
 *      ],
 *      invalid: [
 *          { code: "{code}", errors: {numErrors} },
 *          { code: "{code}", options: {options}, global: {globals}, parser: "{parser}", settings: {settings}, errors: [{ message: "{errorMessage}", type: "{errorNodeType}"}] }
 *      ]
 *  });
 *
 * Variables:
 * {code} - String that represents the code to be tested
 * {options} - Arguments that are passed to the configurable rules.
 * {globals} - An object representing a list of variables that are
 *             registered as globals
 * {parser} - String representing the parser to use
 * {settings} - An object representing global settings for all rules
 * {numErrors} - If failing case doesn't need to check error message,
 *               this integer will specify how many errors should be
 *               received
 * {errorMessage} - Message that is returned by the rule on failure
 * {errorNodeType} - AST node type that is returned by they rule as
 *                   a cause of the failure.
 *
 * Requirements:
 * Each rule has to have at least one invalid and at least one valid check.
 * If one of them is missing, the test will be marked as failed.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var assert = require("assert"),
    util = require("util"),
    merge = require("lodash.merge"),
    omit = require("lodash.omit"),
    clone = require("lodash.clonedeep"),
    validator = require("../config-validator"),
    validate = require("is-my-json-valid"),
    eslint = require("../eslint"),
    metaSchema = require("../../conf/json-schema-schema.json");

//------------------------------------------------------------------------------
// Private Members
//------------------------------------------------------------------------------
// testerDefaultConfig must not be modified as it allows to reset the tester to
// the initial default configuration
var testerDefaultConfig = { rules: {} };
var defaultConfig = { rules: {} };
// List every parameters possible on a test case that are not related to eslint
// configuration
var RuleTesterParameters = [
    "code",
    "filename",
    "options",
    "args",
    "errors"
];

var validateSchema = validate(metaSchema, { verbose: true });

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

/**
 * Creates a new instance of RuleTester.
 * @param {Object} [testerConfig] Optional, extra configuration for the tester
 * @constructor
 */
function RuleTester(testerConfig) {

    /**
     * The configuration to use for this tester. Combination of the tester
     * configuration and the default configuration.
     * @type {Object}
     */
    this.testerConfig = merge(
        // we have to clone because merge uses the object on the left for
        // recipient
        clone(defaultConfig),
        testerConfig
    );
}

/**
 * Set the configuration to use for all future tests
 * @param {Object} config the configuration to use.
 * @returns {void}
 */
RuleTester.setDefaultConfig = function(config) {
    if (typeof config !== "object") {
        throw new Error("RuleTester.setDefaultConfig: config must be an object");
    }
    defaultConfig = config;

    // Make sure the rules object exists since it is assumed to exist later
    defaultConfig.rules = defaultConfig.rules || {};
};

/**
 * Get the current configuration used for all tests
 * @returns {Object} the current configuration
 */
RuleTester.getDefaultConfig = function() {
    return defaultConfig;
};

/**
 * Reset the configuration to the initial configuration of the tester removing
 * any changes made until now.
 * @returns {void}
 */
RuleTester.resetDefaultConfig = function() {
    defaultConfig = clone(testerDefaultConfig);
};

// default separators for testing
RuleTester.describe = (typeof describe === "function") ? describe : function(text, method) {
    return method.apply(this);
};

RuleTester.it = (typeof it === "function") ? it : function(text, method) {
    return method.apply(this);
};

RuleTester.prototype = {

    /**
     * Define a rule for one particular run of tests.
     * @param {string} name The name of the rule to define.
     * @param {Function} rule The rule definition.
     * @returns {void}
     */
    defineRule: function(name, rule) {
        eslint.defineRule(name, rule);
    },

    /**
     * Adds a new rule test to execute.
     * @param {string} ruleName The name of the rule to run.
     * @param {Function} rule The rule to test.
     * @param {Object} test The collection of tests to run.
     * @returns {void}
     */
    run: function(ruleName, rule, test) {

        var testerConfig = this.testerConfig,
            result = {};

        /* eslint-disable no-shadow */

        function runRuleForItem(ruleName, item) {
            var config = clone(testerConfig),
                code, filename, schema;

            if (typeof item === "string") {
                code = item;
            } else {
                code = item.code;
                // Assumes everything on the item is a config except for the
                // parameters used by this tester
                var itemConfig = omit(item, RuleTesterParameters);
                // Create the config object from the tester config and this item
                // specific configurations.
                config = merge(
                    config,
                    itemConfig
                );
            }

            if (item.filename) {
                filename = item.filename;
            }

            if (item.options) {
                var options = item.options.concat();
                options.unshift(1);
                config.rules[ruleName] = options;
            } else {
                config.rules[ruleName] = 1;
            }

            eslint.defineRule(ruleName, rule);

            schema = validator.getRuleOptionsSchema(ruleName);

            validateSchema(schema);

            if (validateSchema.errors) {
                throw new Error([
                    "Schema for rule " + ruleName + " is invalid:"
                ].concat(validateSchema.errors.map(function(error) {
                    return "\t" + error.field + ": " + error.message;
                })).join("\n"));
            }

            validator.validate(config, "rule-tester");

            return eslint.verify(code, config, filename);
        }

        // all valid cases go through this.
        function testValidTemplate(ruleName, item) {
            var messages = runRuleForItem(ruleName, item);

            assert.equal(messages.length, 0, util.format("Should have no errors but had %d: %s",
                        messages.length, util.inspect(messages)));
        }

        // all invalid cases go through this.
        function testInvalidTemplate(ruleName, item) {
            var messages = runRuleForItem(ruleName, item);

            if (typeof item.errors === "number") {
                assert.equal(messages.length, item.errors, util.format("Should have %d errors but had %d: %s",
                    item.errors, messages.length, util.inspect(messages)));
            } else {
                assert.equal(messages.length, item.errors.length,
                    util.format("Should have %d errors but had %d: %s",
                    item.errors.length, messages.length, util.inspect(messages)));

                for (var i = 0, l = item.errors.length; i < l; i++) {
                    assert.ok(!("fatal" in messages[i]), "A fatal parsing error occurred: " + messages[i].message);
                    assert.equal(messages[i].ruleId, ruleName, "Error rule name should be the same as the name of the rule being tested");
                    if (item.errors[i].message) {
                        assert.equal(messages[i].message, item.errors[i].message, "Error message should be " + item.errors[i].message);
                    }
                    if (item.errors[i].type) {
                        assert.equal(messages[i].nodeType, item.errors[i].type, "Error type should be " + item.errors[i].type);
                    }
                    if (item.errors[i].hasOwnProperty("line")) {
                        assert.equal(messages[i].line, item.errors[i].line, "Error line should be " + item.errors[i].line);
                    }
                    if (item.errors[i].hasOwnProperty("column")) {
                        assert.equal(messages[i].column, item.errors[i].column, "Error column should be " + item.errors[i].column);
                    }
                }
            }
        }

        // this creates a mocha test suite and pipes all supplied info
        // through one of the templates above.
        RuleTester.describe(ruleName, function() {
            test.valid.forEach(function(valid) {
                RuleTester.it(valid.code || valid, function() {
                    testValidTemplate(ruleName, valid);
                });
            });

            test.invalid.forEach(function(invalid) {
                RuleTester.it(invalid.code, function() {
                    testInvalidTemplate(ruleName, invalid);
                });
            });
        });

        return result.suite;
    }
};


module.exports = RuleTester;
