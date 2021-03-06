var path = require('path');

var logger = require('./logger');
var log = logger.create('config');
var helper = require('./helper');
var constant = require('./constants');

// Coffee is required here to enable config files written in coffee-script.
// It's not directly used in this file.
require('coffee-script');


var Pattern = function(pattern, served, included, watched) {
  this.pattern = pattern;
  this.served = helper.isDefined(served) ? served : true;
  this.included = helper.isDefined(included) ? included : true;
  this.watched = helper.isDefined(watched) ? watched : true;
};

var UrlPattern = function(url) {
  Pattern.call(this, url, false, true, false);
};


var createPatternObject = function(pattern) {
  if (helper.isString(pattern)) {
    return helper.isUrlAbsolute(pattern) ? new UrlPattern(pattern) : new Pattern(pattern);
  }

  if (helper.isObject(pattern)) {
    if (!helper.isDefined(pattern.pattern)) {
      log.warn('Invalid pattern %s!\n\tObject is missing "pattern" property".', pattern);
    }

    return helper.isUrlAbsolute(pattern.pattern) ?
        new UrlPattern(pattern.pattern) :
        new Pattern(pattern.pattern, pattern.served, pattern.included, pattern.watched);
  }

  log.warn('Invalid pattern %s!\n\tExpected string or object with "pattern" property.', pattern);
  return new Pattern(null, false, false, false);
};

var normalizeConfig = function(config, configFilePath) {

  var basePathResolve = function(relativePath) {
    if (helper.isUrlAbsolute(relativePath)) {
      return relativePath;
    }

    if (!helper.isDefined(config.basePath) || !helper.isDefined(relativePath)) {
      return '';
    }
    return path.resolve(config.basePath, relativePath);
  };

  var createPatternMapper = function(resolve) {
    return function(objectPattern) {
      objectPattern.pattern = resolve(objectPattern.pattern);

      return objectPattern;
    };
  };

  if (helper.isString(configFilePath)) {
    // resolve basePath
    config.basePath = path.resolve(path.dirname(configFilePath), config.basePath);

    // always ignore the config file itself
    config.exclude.push(configFilePath);
  } else {
    config.basePath = path.resolve(config.basePath || '.');
  }

  config.files = config.files.map(createPatternObject).map(createPatternMapper(basePathResolve));
  config.exclude = config.exclude.map(basePathResolve);
  config.junitReporter.outputFile = basePathResolve(config.junitReporter.outputFile);
  config.coverageReporter.dir = basePathResolve(config.coverageReporter.dir);

  // normalize paths on windows
  config.basePath = helper.normalizeWinPath(config.basePath);
  config.files = config.files.map(createPatternMapper(helper.normalizeWinPath));
  config.exclude = config.exclude.map(helper.normalizeWinPath);
  config.junitReporter.outputFile = helper.normalizeWinPath(config.junitReporter.outputFile);
  config.coverageReporter.dir = helper.normalizeWinPath(config.coverageReporter.dir);

  // normalize urlRoot
  var urlRoot = config.urlRoot;
  if (urlRoot.charAt(0) !== '/') {
    urlRoot = '/' + urlRoot;
  }

  if (urlRoot.charAt(urlRoot.length - 1) !== '/') {
    urlRoot = urlRoot + '/';
  }

  if (urlRoot !== config.urlRoot) {
    log.warn('urlRoot normalized to "%s"', urlRoot);
    config.urlRoot = urlRoot;
  }

  if (config.proxies && config.proxies.hasOwnProperty(config.urlRoot)) {
    log.warn('"%s" is proxied, you should probably change urlRoot to avoid conflicts',
        config.urlRoot);
  }

  if (config.singleRun && config.autoWatch) {
    log.debug('autoWatch set to false, because of singleRun');
    config.autoWatch = false;
  }

  if (helper.isString(config.reporters)) {
    config.reporters = config.reporters.split(',');
  }

  // TODO(vojta): remove
  if (helper.isDefined(config.reporter)) {
    log.warn('"reporter" is deprecated, use "reporters" instead');
  }

  // normalize preprocessors
  var preprocessors = config.preprocessors || {};
  var normalizedPreprocessors = config.preprocessors = Object.create(null);

  Object.keys(preprocessors).forEach(function(pattern) {
    var normalizedPattern = helper.normalizeWinPath(basePathResolve(pattern));

    normalizedPreprocessors[normalizedPattern] = helper.isString(preprocessors[pattern]) ?
        [preprocessors[pattern]] : preprocessors[pattern];
  });

  return config;
};

var KarmaDsl = function(config) {
  this.LOG_DISABLE = constant.LOG_DISABLE;
  this.LOG_ERROR = constant.LOG_ERROR;
  this.LOG_WARN = constant.LOG_WARN;
  this.LOG_INFO = constant.LOG_INFO;
  this.LOG_DEBUG = constant.LOG_DEBUG;

  // TODO(vojta): remove
  var CONST_ERR = '%s is not supported anymore.\n\tPlease use `frameworks = ["%s"];` instead.';
  ['JASMINE', 'MOCHA', 'QUNIT'].forEach(function(framework) {
    [framework, framework + '_ADAPTER'].forEach(function(name) {
      Object.defineProperty(global, name, {get: function() {
        log.warn(CONST_ERR, name, framework.toLowerCase());
      }});
    });
  });

  ['REQUIRE', 'REQUIRE_ADAPTER'].forEach(function(name) {
    Object.defineProperty(global, name, {get: function() {
      log.warn(CONST_ERR, name, 'requirejs');
    }});
  });

  ['ANGULAR_SCENARIO', 'ANGULAR_SCENARIO_ADAPTER'].forEach(function(name) {
    Object.defineProperty(global, name, {get: function() {
      log.warn(CONST_ERR, name, 'requirejs');
    }});
  });

  ['LOG_DISABLE', 'LOG_INFO', 'LOG_DEBUG', 'LOG_WARN', 'LOG_ERROR'].forEach(function(name) {
    Object.defineProperty(global, name, {get: function() {
      log.warn('%s is not supported anymore.\n  Please use `karma.%s` instead.', name, name);
      return constant.LOG_INFO;
    }});
  });

  this.configure = function(newConfig) {
    Object.keys(newConfig).forEach(function(key) {
      config[key] = newConfig[key];
    });
  };

  // this.defineLauncher
  // this.defineReporter
  // this.definePreprocessor
  ['launcher', 'reporter', 'preprocessor'].forEach(function(type) {
    this['define' + helper.ucFirst(type)] = function(name, base, options) {
      var module = Object.create(null);
      var token = type + ':' + base;
      var locals = {
        args: ['value', options]
      };

      if (!helper.isString(name)) {
        return log.warn('Can not define %s. Name has to be a string.', type);
      }

      if (!helper.isString(base)) {
        return log.warn('Can not define %s %s. Missing parent %s.', type, name, type);
      }

      if (!helper.isObject(options)) {
        return log.warn('Can not define %s %s. Arguments has to be an object.', type, name);
      }

      module[type + ':' + name] = ['factory', function(injector) {
        return injector.createChild([locals], [token]).get(token);
      }];

      config.plugins.push(module);
    };
  }, this);
};

var parseConfig = function(configFilePath, cliOptions) {
  var configModule;
  if (configFilePath) {
    try {
      configModule = require(configFilePath);
    } catch(e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        log.error('Config file does not exist!');
      } else {
        log.error('Invalid config file!\n', e);
      }
      return process.exit(1);
    }
    if (!helper.isFunction(configModule)) {
      log.error('Config file must export a function!');
      return process.exit(1);
    }
  } else {
    // if no config file path is passed, we define a dummy config module.
    configModule = function() {};
  }

  var config = {
    frameworks: [],
    port: constant.DEFAULT_PORT,
    runnerPort: constant.DEFAULT_RUNNER_PORT,
    hostname: constant.DEFAULT_HOSTNAME,
    basePath: '',
    files: [],
    exclude: [],
    logLevel: constant.LOG_INFO,
    colors: true,
    autoWatch: false,
    reporters: ['progress'],
    singleRun: false,
    browsers: [],
    captureTimeout: 60000,
    proxies: {},
    preprocessors: {'**/*.coffee': 'coffee'},
    urlRoot: '/',
    reportSlowerThan: 0,
    // TODO(vojta): remove
    junitReporter: {
      outputFile: 'test-results.xml',
      suite: ''
    },
    // TODO(vojta): remove
    coverageReporter: {
      type: 'html',
      dir: 'coverage/'
    },
    loggers: [ constant.CONSOLE_APPENDER ],
    transports: [ 'websocket', 'flashsocket', 'xhr-polling', 'jsonp-polling' ],
    plugins: [ 'karma-*' ]
  };
  var dsl = new KarmaDsl(config);
  try {
    configModule(dsl);
  } catch(e) {
    log.error('Error in config file!\n', e);
    return process.exit(1);
  }

  // merge the config from config file and cliOptions (precendense)
  dsl.configure(cliOptions);

  // configure the logger as soon as we can
  logger.setup(config.logLevel, config.colors, config.loggers);

  return normalizeConfig(config, configFilePath);
};

// PUBLIC API
exports.parseConfig = parseConfig;
exports.Pattern = Pattern;
exports.createPatternObject = createPatternObject;
