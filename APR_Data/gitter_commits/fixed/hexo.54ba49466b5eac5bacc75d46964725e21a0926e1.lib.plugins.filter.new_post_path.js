'use strict';

const { join, extname } = require('path');
const moment = require('moment');
const defaults = require('lodash/defaults');
const Promise = require('bluebird');
const { Permalink } = require('hexo-util');
const fs = require('hexo-fs');
let permalink;

const reservedKeys = {
  year: true,
  month: true,
  i_month: true,
  day: true,
  i_day: true,
  title: true
};

function newPostPathFilter(data = {}, replace) {
  const sourceDir = this.source_dir;
  const draftDir = join(sourceDir, '_drafts');
  const postDir = join(sourceDir, '_posts');
  const { config } = this;
  const newPostName = config.new_post_name;
  const permalinkDefaults = config.permalink_defaults;
  const { path, layout, slug } = data;
  let target = '';

  if (!permalink || permalink.rule !== newPostName) {
    permalink = new Permalink(newPostName);
  }

  if (path) {
    switch (layout) {
      case 'page':
        target = join(sourceDir, path);
        break;

      case 'draft':
        target = join(draftDir, path);
        break;

      default:
        target = join(postDir, path);
    }
  } else if (slug) {
    switch (layout) {
      case 'page':
        target = join(sourceDir, slug, 'index');
        break;

      case 'draft':
        target = join(draftDir, slug);
        break;

      default: {
        const date = moment(data.date || Date.now());
        const keys = Object.keys(data);
        let key = '';

        const filenameData = {
          year: date.format('YYYY'),
          month: date.format('MM'),
          i_month: date.format('M'),
          day: date.format('DD'),
          i_day: date.format('D'),
          title: slug
        };

        for (let i = 0, len = keys.length; i < len; i++) {
          key = keys[i];
          if (!reservedKeys[key]) filenameData[key] = data[key];
        }

        target = join(postDir, permalink.stringify(
          defaults(filenameData, permalinkDefaults)));
      }
    }
  } else {
    return Promise.reject(new TypeError('Either data.path or data.slug is required!'));
  }

  if (!extname(target)) {
    target += extname(newPostName) || '.md';
  }

  if (replace) {
    return Promise.resolve(target);
  }

  return fs.ensurePath(target);
}

module.exports = newPostPathFilter;
