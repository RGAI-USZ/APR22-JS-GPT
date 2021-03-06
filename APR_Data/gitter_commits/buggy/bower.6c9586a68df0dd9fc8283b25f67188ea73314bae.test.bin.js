var spawn  = require('child_process').spawn;
var rimraf = require('rimraf');
var fs     = require('fs');
var assert = require('assert');

describe('bin', function () {
  var testDir = __dirname + '/install_test';

  function clean(done) {
    rimraf(testDir, function (err) {
      if (err) throw new Error('Unable to remove cache directory');
      done();
    });
  }

  beforeEach(function (done) {
    clean(function () {
      fs.mkdirSync(testDir);
      done();
    });
  });
  after(clean);

  it('should exit with status 0 if there were no errors', function (done) {
    var cp = spawn('node', [__dirname + '/../bin/bower', 'install', 'jquery'], {
      cwd: testDir
    });

    cp.on('exit', function (status) {
      assert.equal(status, 0);
      done();
    });
  });

  it('should exit with status 1 if there were errors', function (done) {
    var cp = spawn('node', [__dirname + '/../bin/bower', 'install', 'packagethatwillneverexist'], {
      cwd: testDir
    });

    cp.on('exit', function (status) {
      assert.equal(status, 1);
      done();
    });
  });
});