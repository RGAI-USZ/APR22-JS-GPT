var Q = require('q');
var expect = require('expect.js');
var helpers = require('../helpers');

var register = helpers.command('register');

var fakeRepositoryFactory = function (canonicalDir, pkgMeta) {
function FakeRepository() { }

FakeRepository.prototype.fetch = function () {
return Q.fcall(function () {
return [canonicalDir, pkgMeta];
});
};

FakeRepository.prototype.getRegistryClient = function () {
return {
register: function (name, url, cb) {
cb(null, { name: name, url: url });
}
};
};

return FakeRepository;
};

var register = helpers.command('register');

var registerFactory = function (canonicalDir, pkgMeta) {
return helpers.command('register', {
'../core/PackageRepository': fakeRepositoryFactory(
canonicalDir, pkgMeta
)
});
};

describe('bower register', function () {

var mainPackage = new helpers.TempDir({
'bower.json': {
name: 'package'
}
});

it('correctly reads arguments', function () {
expect(register.readOptions(['jquery', 'url']))
.to.eql(['jquery', 'url']);
});

it('errors if name is not provided', function () {
return helpers.run(register).fail(function (reason) {
expect(reason.message).to.be('Usage: bower register <name> <url>');
expect(reason.code).to.be('EINVFORMAT');
});
});

it('errors if url is not provided', function () {
return helpers.run(register, ['some-name'])
.fail(function (reason) {
expect(reason.message).to.be('Usage: bower register <name> <url>');
expect(reason.code).to.be('EINVFORMAT');
});
});

it('errors if trying to register private package', function () {
mainPackage.prepare({ 'bower.json': { private: true } });

var register = registerFactory(mainPackage.path, mainPackage.meta());
return helpers.run(register, ['some-name', 'git://fake-url.git'])
.fail(function (reason) {
expect(reason.message).to.be('The package you are trying to register is marked as private');
expect(reason.code).to.be('EPRIV');
});
});

it('should call registry client with name and url', function () {
mainPackage.prepare();

var register = registerFactory(mainPackage.path, mainPackage.meta());
return helpers.run(register, ['some-name', 'git://fake-url.git'])
.spread(function (result) {
expect(result).to.eql({

name: 'some-name', url: 'git://fake-url.git'
});
});
});

it('should call registry client with name and github source', function () {
mainPackage.prepare();

var register = registerFactory(mainPackage.path, mainPackage.meta());
.spread(function (result) {
expect(result).to.eql({

});
});
});

