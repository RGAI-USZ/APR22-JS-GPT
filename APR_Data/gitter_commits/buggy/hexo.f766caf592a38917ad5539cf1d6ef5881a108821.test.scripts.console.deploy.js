'use strict';

const { exists, mkdirs, readFile, rmdir, writeFile } = require('hexo-fs');
const { join } = require('path');
const { spy, stub } = require('sinon');

describe('deploy', () => {
  const Hexo = require('../../../lib/hexo');
  const hexo = new Hexo(join(__dirname, 'deploy_test'), { silent: true });
  const deploy = require('../../../lib/plugins/console/deploy').bind(hexo);

  before(async () => {
    await mkdirs(hexo.public_dir);
    hexo.init();
  });

  beforeEach(() => {
    hexo.config.deploy = { type: 'foo' };
    hexo.extend.deployer.register('foo', () => {});
  });

  after(() => rmdir(hexo.base_dir));

  it('no deploy config', () => {
    delete hexo.config.deploy;

    const logStub = stub(console, 'log');

    try {
      should.not.exist(deploy({ test: true }));
    } finally {
      logStub.restore();
    }

    logStub.calledWithMatch(
      'You should configure deployment settings in _config.yml first!'
    ).should.be.true;
  });

  it('single deploy setting', async () => {
    hexo.config.deploy = {
      type: 'foo',
      foo: 'bar'
    };

    const deployer = spy();
    const beforeListener = spy();
    const afterListener = spy();

    hexo.once('deployBefore', beforeListener);
    hexo.once('deployAfter', afterListener);
    hexo.extend.deployer.register('foo', deployer);

    await deploy({ foo: 'foo', bar: 'bar' });
    deployer.calledOnce.should.be.true;
    beforeListener.calledOnce.should.be.true;
    afterListener.calledOnce.should.be.true;

    deployer.calledWith({
      type: 'foo',
      foo: 'foo',
      bar: 'bar'
    }).should.be.true;
  });

  it('multiple deploy setting', async () => {
    const deployer1 = spy();
    const deployer2 = spy();

    hexo.config.deploy = [
      {type: 'foo', foo: 'foo'},
      {type: 'bar', bar: 'bar'}
    ];

    hexo.extend.deployer.register('foo', deployer1);
    hexo.extend.deployer.register('bar', deployer2);

    await deploy({ test: true });
    deployer1.calledOnce.should.be.true;
    deployer2.calledOnce.should.be.true;

    deployer1.calledWith({
      type: 'foo',
      foo: 'foo',
      test: true
    }).should.be.true;
    deployer2.calledWith({
      type: 'bar',
      bar: 'bar',
      test: true
    }).should.be.true;
  });

  // it('deployer not found'); missing-unit-test

  it('generate', async () => {
    await writeFile(join(hexo.source_dir, 'test.txt'), 'test');
    await deploy({ generate: true });
    const content = await readFile(join(hexo.public_dir, 'test.txt'));

    content.should.eql('test');

    await rmdir(hexo.source_dir);
  });

  it('run generate if public directory not exist', async () => {
    await rmdir(hexo.public_dir);
    await deploy({});
    const exist = await exists(hexo.public_dir);

    exist.should.be.true;
  });
});
