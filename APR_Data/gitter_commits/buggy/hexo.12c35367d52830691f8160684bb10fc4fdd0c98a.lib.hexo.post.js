'use strict';

const assert = require('assert');
const moment = require('moment');
const Promise = require('bluebird');
const { join, extname, basename } = require('path');
const { magenta } = require('chalk');
const { load } = require('js-yaml');
const { slugize, escapeRegExp } = require('hexo-util');
const { copyDir, exists, listDir, mkdirs, readFile, rmdir, unlink, writeFile } = require('hexo-fs');
const yfm = require('hexo-front-matter');

const replaceSwigTag = str => str.replace(/{/g, '\uFFFCleft\uFFFC').replace(/}/g, '\uFFFCright\uFFFC');
const restoreReplacesSwigTag = str => str.replace(/\uFFFCleft\uFFFC/g, '&#123;').replace(/\uFFFCright\uFFFC/g, '&#125;');

const preservedKeys = ['title', 'slug', 'path', 'layout', 'date', 'content'];

const rPlaceholder = /(?:<|&lt;)!--\uFFFC(\d+)--(?:>|&gt;)/g;
const rSwigVar = /\{\{[\s\S]*?\}\}/g;
const rSwigComment = /\{#[\s\S]*?#\}/g;
const rSwigBlock = /\{%[\s\S]*?%\}/g;
const rSwigFullBlock = /\{% *(.+?)(?: *| +.*?)%\}[\s\S]+?\{% *end\1 *%\}/g;
const rSwigRawFullBlock = /{% *raw *%\}[\s\S]+?\{% *endraw *%\}/g;
const rSwigTagInsideInlineCode = /`.*?{.*?}.*?`/g;

const _escapeContent = (cache, str) => {
  const placeholder = '\uFFFC';
  return `<!--${placeholder}${cache.push(str) - 1}-->`;
};

class PostRenderCache {
  constructor() {
    this.cache = [];
  }

  loadContent(str) {
    if (str.includes('hexoPostRenderEscape')) {
      str = str.replace(/<!--hexoPostRenderEscape:/g, '').replace(/:hexoPostRenderEscape-->/g, '');
    }

    const restored = str.replace(rPlaceholder, (_, index) => {
      assert(this.cache[index]);
      const value = this.cache[index];
      this.cache[index] = null;
      return value;
    });
    if (restored === str) return restored;
    return this.loadContent(restored); // self-recursive for nexted escaping
  }

  escapeAllSwigTags(str) {
    const escape = _str => _escapeContent(this.cache, _str);
    return str.replace(rSwigRawFullBlock, escape) // Escape {% raw %} first
      .replace(rSwigTagInsideInlineCode, replaceSwigTag) // Avoid double escaped by marked renderer
      .replace(rSwigFullBlock, escape)
      .replace(rSwigBlock, escape)
      .replace(rSwigComment, '')
      .replace(rSwigVar, escape);
  }
}

const prepareFrontMatter = data => {
  for (const [key, item] of Object.entries(data)) {
    if (moment.isMoment(item)) {
      data[key] = item.utc().format('YYYY-MM-DD HH:mm:ss');
    } else if (moment.isDate(item)) {
      data[key] = moment.utc(item).format('YYYY-MM-DD HH:mm:ss');
    } else if (typeof item === 'string') {
      data[key] = `"${item}"`;
    }
  }

  return data;
};


const removeExtname = str => {
  return str.substring(0, str.length - extname(str).length);
};

const createAssetFolder = (path, assetFolder) => {
  if (!assetFolder) return Promise.resolve();

  const target = removeExtname(path);

  if (basename(target) === 'index') return Promise.resolve();

  return exists(target).then(exist => {
    if (!exist) return mkdirs(target);
  });
};

class Post {
  constructor(context) {
    this.context = context;
  }

  create(data, replace, callback) {
    if (!callback && typeof replace === 'function') {
      callback = replace;
      replace = false;
    }

    const ctx = this.context;
    const { config } = ctx;

    data.slug = slugize((data.slug || data.title).toString(), { transform: config.filename_case });
    data.layout = (data.layout || config.default_layout).toLowerCase();
    data.date = data.date ? moment(data.date) : moment();

    return Promise.all([
      // Get the post path
      ctx.execFilter('new_post_path', data, {
        args: [replace],
        context: ctx
      }),
      this._renderScaffold(data)
    ]).spread((path, content) => {
      const result = { path, content };

      return Promise.all([
        // Write content to file
        writeFile(path, content),
        // Create asset folder
        createAssetFolder(path, config.post_asset_folder)
      ]).then(() => {
        ctx.emit('new', result);
      }).thenReturn(result);
    }).asCallback(callback);
  }

  _getScaffold(layout) {
    const ctx = this.context;

    return ctx.scaffold.get(layout).then(result => {
      if (result != null) return result;
      return ctx.scaffold.get('normal');
    });
  }

  _renderScaffold(data) {
    const { tag } = this.context.extend;
    let yfmSplit;

    return this._getScaffold(data.layout).then(scaffold => {
      const frontMatter = prepareFrontMatter({ ...data });
      yfmSplit = yfm.split(scaffold);

      return tag.render(yfmSplit.data, frontMatter);
    }).then(frontMatter => {
      const { separator } = yfmSplit;
      const jsonMode = separator.startsWith(';');

      // Parse front-matter
      const obj = jsonMode ? JSON.parse(`{${frontMatter}}`) : load(frontMatter);

      // Add data which are not in the front-matter
      for (const key of Object.keys(data)) {
        if (!preservedKeys.includes(key) && obj[key] == null) {
          obj[key] = data[key];
        }
      }

      let content = '';
      // Prepend the separator
      if (yfmSplit.prefixSeparator) content += `${separator}\n`;

      content += yfm.stringify(obj, {
        mode: jsonMode ? 'json' : ''
      });

      // Concat content
      content += yfmSplit.content;

      if (data.content) {
        content += `\n${data.content}`;
      }

      return content;
    });
  }

  publish(data, replace, callback) {
    if (!callback && typeof replace === 'function') {
      callback = replace;
      replace = false;
    }

    if (data.layout === 'draft') data.layout = 'post';

    const ctx = this.context;
    const { config } = ctx;
    const draftDir = join(ctx.source_dir, '_drafts');
    const slug = slugize(data.slug.toString(), { transform: config.filename_case });
    data.slug = slug;
    const regex = new RegExp(`^${escapeRegExp(slug)}(?:[^\\/\\\\]+)`);
    let src = '';
    const result = {};

    data.layout = (data.layout || config.default_layout).toLowerCase();

    // Find the draft
    return listDir(draftDir).then(list => {
      const item = list.find(item => regex.test(item));
      if (!item) throw new Error(`Draft "${slug}" does not exist.`);

      // Read the content
      src = join(draftDir, item);
      return readFile(src);
    }).then(content => {
      // Create post
      Object.assign(data, yfm(content));
      data.content = data._content;
      delete data._content;

      return this.create(data, replace);
    }).then(post => {
      result.path = post.path;
      result.content = post.content;
      return unlink(src);
    }).then(() => { // Remove the original draft file
      if (!config.post_asset_folder) return;

      // Copy assets
      const assetSrc = removeExtname(src);
      const assetDest = removeExtname(result.path);

      return exists(assetSrc).then(exist => {
        if (!exist) return;

        return copyDir(assetSrc, assetDest).then(() => rmdir(assetSrc));
      });
    }).thenReturn(result).asCallback(callback);
  }

  render(source, data = {}, callback) {
    const ctx = this.context;
    const { config } = ctx;
    const { tag } = ctx.extend;
    const ext = data.engine || (source ? extname(source) : '');

    let promise;

    if (data.content != null) {
      promise = Promise.resolve(data.content);
    } else if (source) {
      // Read content from files
      promise = readFile(source);
    } else {
      return Promise.reject(new Error('No input file or string!')).asCallback(callback);
    }

    // disable Nunjucks when the renderer specify that.
    const disableNunjucks = ext && ctx.render.renderer.get(ext) && !!ctx.render.renderer.get(ext).disableNunjucks;

    const cacheObj = new PostRenderCache();

    return promise.then(content => {
      data.content = content;
      // Run "before_post_render" filters
      return ctx.execFilter('before_post_render', data, { context: ctx });
    }).then(() => {
      // Escape all Nunjucks/Swig tags
      if (!disableNunjucks) {
        data.content = cacheObj.escapeAllSwigTags(data.content);
      }

      const options = data.markdown || {};
      if (!config.highlight.enable) options.highlight = null;

      ctx.log.debug('Rendering post: %s', magenta(source));
      // Render with markdown or other renderer
      return ctx.render.render({
        text: data.content,
        path: source,
        engine: data.engine,
        toString: true,
        onRenderEnd(content) {
          // Replace cache data with real contents
          data.content = cacheObj.loadContent(restoreReplacesSwigTag(content));

          // Return content after replace the placeholders
          if (disableNunjucks) return data.content;

          // Render with Nunjucks
          return tag.render(data.content, data);
        }
      }, options);
    }).then(content => {
      // restore { and } inside inline code
      data.content = content;

      // Run "after_post_render" filters
      return ctx.execFilter('after_post_render', data, { context: ctx });
    }).asCallback(callback);
  }
}

module.exports = Post;
