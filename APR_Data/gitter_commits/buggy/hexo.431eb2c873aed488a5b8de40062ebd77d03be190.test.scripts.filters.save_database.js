'use strict';

const fs = require('hexo-fs');
const Promise = require('bluebird');

describe('Save database', () => {
  const Hexo = require('../../../lib/hexo');
  const hexo = new Hexo();
  const saveDatabase = Promise.method(require('../../../lib/plugins/filter/before_exit/save_database')).bind(hexo);
  const dbPath = hexo.database.options.path;

  it('default', () => {
    hexo.env.init = true;
    hexo._dbLoaded = true;

    return saveDatabase().then(() => fs.exists(dbPath)).then(exist => {
      exist.should.be.true;
      return fs.unlink(dbPath);
    });
  });

  it('do nothing if hexo is not initialized', () => {
    hexo.env.init = false;
    hexo._dbLoaded = true;

    return saveDatabase().then(() => fs.exists(dbPath)).then(exist => {
      exist.should.be.false;
    });
  });

  it('do nothing if database is not loaded', () => {
    hexo.env.init = true;
    hexo._dbLoaded = false;

    return saveDatabase().then(() => fs.exists(dbPath)).then(exist => {
      exist.should.be.false;
    });
  });
});
