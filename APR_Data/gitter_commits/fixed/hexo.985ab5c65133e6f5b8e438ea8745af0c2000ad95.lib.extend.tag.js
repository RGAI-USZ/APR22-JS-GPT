'use strict';

const stripIndent = require('strip-indent');
const nunjucks = require('nunjucks');
const inherits = require('util').inherits;
const Promise = require('bluebird');

function Tag() {
  this.env = new nunjucks.Environment(null, {
    autoescape: false
  });
}

Tag.prototype.register = function(name, fn, options) {
  if (!name) throw new TypeError('name is required');
  if (typeof fn !== 'function') throw new TypeError('fn must be a function');

  if (options == null || typeof options === 'boolean') {
    options = {ends: options};
  }

  let tag;

  if (options.async) {
    if (fn.length > 2) {
      fn = Promise.promisify(fn);
    } else {
      fn = Promise.method(fn);
    }

    if (options.ends) {
      tag = new NunjucksAsyncBlock(name, fn);
    } else {
      tag = new NunjucksAsyncTag(name, fn);
    }
  } else {
    if (options.ends) {
      tag = new NunjucksBlock(name, fn);
    } else {
      tag = new NunjucksTag(name, fn);
    }
  }

  this.env.addExtension(name, tag);
};

const placeholder = '\uFFFC';
const rPlaceholder = /(?:<|&lt;)!--\uFFFC(\d+)--(?:>|&gt;)/g;

Tag.prototype.render = function(str, options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  const cache = [];

  const escapeContent = str => `<!--${placeholder}${cache.push(str) - 1}-->`;

  str = str.replace(/<pre><code.*>[\s\S]*?<\/code><\/pre>/gm, escapeContent);

  return Promise.fromCallback(cb => { this.env.renderString(str, options, cb); })
    .then(result => result.replace(rPlaceholder, (_, index) => cache[index]));
};

function NunjucksTag(name, fn) {
  this.tags = [name];
  this.fn = fn;
}

NunjucksTag.prototype.parse = function(parser, nodes, lexer) {
  const node = this._parseArgs(parser, nodes, lexer);

  return new nodes.CallExtension(this, 'run', node, []);
};

NunjucksTag.prototype._parseArgs = (parser, nodes, lexer) => {
  const tag = parser.nextToken();
  const node = new nodes.NodeList(tag.lineno, tag.colno);
  let token;

  const argarray = new nodes.Array(tag.lineno, tag.colno);

  let argitem = '';
  while ((token = parser.nextToken(true))) {
    if (token.type === lexer.TOKEN_WHITESPACE || token.type === lexer.TOKEN_BLOCK_END) {
      if (argitem !== '') {
        const argnode = new nodes.Literal(tag.lineno, tag.colno, argitem.trim());
        argarray.addChild(argnode);
        argitem = '';
      }

      if (token.type === lexer.TOKEN_BLOCK_END) {
        break;
      }
    } else {
      argitem += token.value;
    }
  }

  node.addChild(argarray);

  return node;
};

NunjucksTag.prototype.run = function(context, args) {
  return this._run(context, args, '');
};

NunjucksTag.prototype._run = function(context, args, body) {
  return this.fn.call(context.ctx, args, body);
};

function NunjucksBlock(name, fn) {
  NunjucksTag.call(this, name, fn);
}

inherits(NunjucksBlock, NunjucksTag);

NunjucksBlock.prototype.parse = function(parser, nodes, lexer) {
  const node = this._parseArgs(parser, nodes, lexer);
  const body = this._parseBody(parser, nodes, lexer);

  return new nodes.CallExtension(this, 'run', node, [body]);
};

NunjucksBlock.prototype._parseBody = function(parser, nodes, lexer) {
  const body = parser.parseUntilBlocks(`end${this.tags[0]}`);

  parser.advanceAfterBlockEnd();
  return body;
};

NunjucksBlock.prototype.run = function(context, args, body) {
  return this._run(context, args, trimBody(body));
};

function trimBody(body) {
  return stripIndent(body()).replace(/^\n?|\n?$/g, '');
}

function NunjucksAsyncTag(name, fn) {
  NunjucksTag.call(this, name, fn);
}

inherits(NunjucksAsyncTag, NunjucksTag);

NunjucksAsyncTag.prototype.parse = function(parser, nodes, lexer) {
  const node = this._parseArgs(parser, nodes, lexer);

  return new nodes.CallExtensionAsync(this, 'run', node, []);
};

NunjucksAsyncTag.prototype.run = function(context, args, callback) {
  return this._run(context, args, '').then(result => {
    callback(null, result);
  }, callback);
};

function NunjucksAsyncBlock(name, fn) {
  NunjucksBlock.call(this, name, fn);
}

inherits(NunjucksAsyncBlock, NunjucksBlock);

NunjucksAsyncBlock.prototype.parse = function(parser, nodes, lexer) {
  const node = this._parseArgs(parser, nodes, lexer);
  const body = this._parseBody(parser, nodes, lexer);

  return new nodes.CallExtensionAsync(this, 'run', node, [body]);
};

NunjucksAsyncBlock.prototype.run = function(context, args, body, callback) {
  // enable async tag nesting
  body((err, result) => {
    // wrapper for trimBody expecting
    // body to be a function
    body = () => result || '';

    this._run(context, args, trimBody(body)).then(result => {
      callback(err, result);
    });
  });
};

module.exports = Tag;
