'use strict';

describe('Renderer', () => {
const Renderer = require('../../../lib/extend/renderer');

it('register()', () => {
const r = new Renderer();


r.register('yaml', 'json', () => {});

r.get('yaml').should.exist;
r.get('yaml').output.should.eql('json');


r.register('yaml', 'json', () => {}, true);

r.get('yaml').should.exist;
r.get('yaml').output.should.eql('json');
r.get('yaml', true).should.exist;
r.get('yaml', true).output.should.eql('json');


should.throw(() => r.register('yaml', 'json'), TypeError, 'fn must be a function');


should.throw(() => r.register('yaml'), TypeError, 'output is required');


should.throw(() => r.register(), TypeError, 'name is required');
});

it('register() - promisify', async () => {
const r = new Renderer();


r.register('yaml', 'json', (data, options, callback) => {
callback(null, 'foo');
});

const yaml = await r.get('yaml')({}, {});
yaml.should.eql('foo');


r.register('swig', 'html', (data, options) => 'foo', true);

const swig = await r.get('swig')({}, {});
swig.should.eql('foo');
});

it('register() - compile', () => {
const r = new Renderer();

function renderer(data, locals) {}

renderer.compile = data => {

};

r.register('swig', 'html', renderer);
r.get('swig').compile.should.eql(renderer.compile);
});

it('getOutput()', () => {
const r = new Renderer();

r.register('yaml', 'json', () => {});

r.getOutput('yaml').should.eql('json');
r.getOutput('.yaml').should.eql('json');
r.getOutput('config.yaml').should.eql('json');
r.getOutput('foo.xml').should.not.ok;
});

it('isRenderable()', () => {
const r = new Renderer();

r.register('yaml', 'json', () => {});

r.isRenderable('yaml').should.be.true;
r.isRenderable('.yaml').should.be.true;
r.isRenderable('config.yaml').should.be.true;
r.isRenderable('foo.xml').should.be.false;
});

it('isRenderableSync()', () => {
const r = new Renderer();

r.register('yaml', 'json', () => {});

r.isRenderableSync('yaml').should.be.false;

r.register('swig', 'html', () => {}, true);

r.isRenderableSync('swig').should.be.true;
r.isRenderableSync('.swig').should.be.true;
r.isRenderableSync('layout.swig').should.be.true;
r.isRenderableSync('foo.html').should.be.false;
});

it('get()', () => {
const r = new Renderer();

r.register('yaml', 'json', () => {});

r.get('yaml').should.exist;
r.get('.yaml').should.exist;
r.get('config.yaml').should.exist;
should.not.exist(r.get('foo.xml'));
should.not.exist(r.get('yaml', true));

r.register('swig', 'html', () => {}, true);

r.get('swig').should.exist;
r.get('swig', true).should.exist;
});

it('list()', () => {
const r = new Renderer();

r.register('yaml', 'json', () => {});

r.register('swig', 'html', () => {}, true);

r.list().should.to.have.all.keys(['yaml', 'swig']);
r.list(true).should.to.have.all.keys(['swig']);
});
});
