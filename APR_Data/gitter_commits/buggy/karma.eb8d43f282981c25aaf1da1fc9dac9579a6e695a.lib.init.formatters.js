var fs = require('fs');
var util = require('util');

var JS_TEMPLATE_PATH = __dirname + '/../../config.tpl.js';
var COFFEE_TEMPLATE_PATH = __dirname + '/../../config.tpl.coffee';
var COFFEE_REGEXP = /\.coffee$/;


var isCoffeeFile = function(filename) {
  return COFFEE_REGEXP.test(filename);
};


var JavaScriptFormatter = function() {

  var quote = function(value) {
    return '\'' + value + '\'';
  };

  var quoteNonIncludedPattern = function(value) {
    return util.format('{pattern: %s, included: false}', quote(value));
  };

  var pad = function(str, pad) {
    return str.replace(/\n/g, '\n' + pad);
  };

  this.TEMPLATE_FILE_PATH = JS_TEMPLATE_PATH;

  this.formatFiles = function(includedFiles, onlyServedFiles) {
    var files = includedFiles.map(quote);

    onlyServedFiles.forEach(function(onlyServedFile) {
      files.push(quoteNonIncludedPattern(onlyServedFile));
    });

    return files.join(',\n      ');
  };

  this.formatPreprocessors = function(preprocessors) {
    var lines = [];
    Object.keys(preprocessors).forEach(function(pattern) {
      lines.push('  ' + quote(pattern) + ': [' + preprocessors[pattern].map(quote).join(', ') + ']');
    });

    return pad('{\n' + lines.join(',\n') + '\n}', '    ');
  };

  this.formatFrameworks = function(frameworks) {
    return frameworks.map(quote).join(', ');
  };

  this.formatBrowsers = function(browsers) {
    return browsers.map(quote).join(', ');
  };

  this.formatAnswers = function(answers) {
    return {
      DATE: new Date(),
      BASE_PATH: answers.basePath,
      FRAMEWORKS: this.formatFrameworks(answers.frameworks),
      FILES: this.formatFiles(answers.files, answers.onlyServedFiles),
      EXCLUDE: this.formatFiles(answers.exclude, []),
      AUTO_WATCH: answers.autoWatch ? 'true' : 'false',
      BROWSERS: this.formatBrowsers(answers.browsers),
      PREPROCESSORS: this.formatPreprocessors(answers.preprocessors)
    };
  };

  this.generateConfigFile = function(answers) {
    var template = fs.readFileSync(this.TEMPLATE_FILE_PATH).toString();
    var replacements = this.formatAnswers(answers);

    return template.replace(/%(.*)%/g, function(a, key) {
      return replacements[key];
    });
  };

  this.writeConfigFile = function(path, answers) {
    fs.writeFileSync(path, this.generateConfigFile(answers));
  };
};

var CoffeeFormatter = function() {
  JavaScriptFormatter.call(this);

  this.TEMPLATE_FILE_PATH = COFFEE_TEMPLATE_PATH;
};


exports.JavaScript = JavaScriptFormatter;
exports.Coffee = CoffeeFormatter;

exports.createForPath = function(path) {
  return isCoffeeFile(path) ? new CoffeeFormatter() : new JavaScriptFormatter();
};
