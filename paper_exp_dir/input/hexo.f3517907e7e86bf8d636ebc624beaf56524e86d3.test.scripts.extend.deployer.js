
describe('Deployer', () => {
const Deployer = require('../../../lib/extend/deployer');

it('register()', () => {
const d = new Deployer();


d.register('test', () => {});

d.get('test').should.exist;


try {
d.register();
} catch (err) {
err.should.be
.instanceOf(TypeError)
.property('message', 'name is required');
}


try {
d.register('test');
} catch (err) {
err.should.be
.instanceOf(TypeError)
.property('message', 'fn must be a function');
}
});

it('register() - promisify', () => {
const d = new Deployer();

d.register('test', (args, callback) => {
args.should.eql({foo: 'bar'});
callback(null, 'foo');
});

d.get('test')({
foo: 'bar'
}).then(result => {
result.should.eql('foo');
});
});

it('register() - Promise.method', () => {
const d = new Deployer();

d.register('test', args => {
args.should.eql({foo: 'bar'});
return 'foo';
});

d.get('test')({
foo: 'bar'
}).then(result => {
result.should.eql('foo');
});
});

it('list()', () => {
const d = new Deployer();

d.register('test', () => {});

d.list().should.have.keys(['test']);
});

it('get()', () => {
const d = new Deployer();

d.register('test', () => {});

d.get('test').should.exist;
});
});
