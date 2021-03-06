const should = require('chai').should(); // eslint-disable-line
const sinon = require('sinon');
const pathFn = require('path');
const moment = require('moment');
const Promise = require('bluebird');
const fs = require('hexo-fs');

const NEW_POST_NAME = ':title.md';

describe('new_post_path', () => {
  const Hexo = require('../../../lib/hexo');
  const hexo = new Hexo(pathFn.join(__dirname, 'new_post_path_test'));
  const newPostPath = require('../../../lib/plugins/filter/new_post_path').bind(hexo);
  const sourceDir = hexo.source_dir;
  const draftDir = pathFn.join(sourceDir, '_drafts');
  const postDir = pathFn.join(sourceDir, '_posts');

  before(() => {
    hexo.config.new_post_name = NEW_POST_NAME;

    return fs.mkdirs(hexo.base_dir).then(() => hexo.init());
  });

  after(() => fs.rmdir(hexo.base_dir));

  it('page layout + path', () => newPostPath({
    path: 'foo',
    layout: 'page'
  }).then(target => {
    target.should.eql(pathFn.join(sourceDir, 'foo.md'));
  }));

  it('draft layout + path', () => newPostPath({
    path: 'foo',
    layout: 'draft'
  }).then(target => {
    target.should.eql(pathFn.join(draftDir, 'foo.md'));
  }));

  it('default layout + path', () => newPostPath({
    path: 'foo'
  }).then(target => {
    target.should.eql(pathFn.join(postDir, 'foo.md'));
  }));

  it('page layout + slug', () => newPostPath({
    slug: 'foo',
    layout: 'page'
  }).then(target => {
    target.should.eql(pathFn.join(sourceDir, 'foo', 'index.md'));
  }));

  it('draft layout + slug', () => newPostPath({
    slug: 'foo',
    layout: 'draft'
  }).then(target => {
    target.should.eql(pathFn.join(draftDir, 'foo.md'));
  }));

  it('default layout + slug', () => {
    const now = moment();
    hexo.config.new_post_name = ':year-:month-:day-:title.md';

    return newPostPath({
      slug: 'foo'
    }).then(target => {
      target.should.eql(pathFn.join(postDir, now.format('YYYY-MM-DD') + '-foo.md'));
      hexo.config.new_post_name = NEW_POST_NAME;
    });
  });

  it('date', () => {
    const date = moment([2014, 0, 1]);
    hexo.config.new_post_name = ':year-:i_month-:i_day-:title.md';

    return newPostPath({
      slug: 'foo',
      date: date.toDate()
    }).then(target => {
      target.should.eql(pathFn.join(postDir, date.format('YYYY-M-D') + '-foo.md'));
      hexo.config.new_post_name = NEW_POST_NAME;
    });
  });

  it('extra data', () => {
    hexo.config.new_post_name = ':foo-:bar-:title.md';

    return newPostPath({
      slug: 'foo',
      foo: 'oh',
      bar: 'ya'
    }).then(target => {
      target.should.eql(pathFn.join(postDir, 'oh-ya-foo.md'));
      hexo.config.new_post_name = NEW_POST_NAME;
    });
  });

  it('append extension name if not existed', () => {
    hexo.config.new_post_name = ':title';

    return newPostPath({
      slug: 'foo'
    }).then(target => {
      target.should.eql(pathFn.join(postDir, 'foo.md'));
      hexo.config.new_post_name = NEW_POST_NAME;
    });
  });

  it('don\'t append extension name if existed', () => newPostPath({
    path: 'foo.markdown'
  }).then(target => {
    target.should.eql(pathFn.join(postDir, 'foo.markdown'));
  }));

  it('replace existing files', () => {
    const filename = 'test.md';
    const path = pathFn.join(postDir, filename);

    return fs.writeFile(path, '').then(() => newPostPath({
      path: filename
    }, true)).then(target => {
      target.should.eql(path);
      return fs.unlink(path);
    });
  });

  it('rename if target existed', () => {
    const filename = [
      'test.md',
      'test-1.md',
      'test-2.md',
      'test-foo.md'
    ];

    const path = filename.map(item => pathFn.join(postDir, item));

    return Promise.map(path, item => fs.writeFile(item, '')).then(() => newPostPath({
      path: filename[0]
    })).then(target => {
      target.should.eql(pathFn.join(postDir, 'test-3.md'));
      return path;
    }).map(item => fs.unlink(item));
  });

  it('data is required', () => {
    const errorCallback = sinon.spy(err => {
      err.should.have.property('message', 'Either data.path or data.slug is required!');
    });

    return newPostPath().catch(errorCallback).finally(() => {
      errorCallback.calledOnce.should.be.true;
    });
  });
});
