var expect = require('expect.js');
var runBin = require('../helpers').runBin;

describe('bower', function () {
    process.env.CI = '1';

    it('runs bower installation', function () {
        var result = runBin();
        var text = result.stdout.toString();

        expect(text).to.contain('Usage:');
        expect(text).to.contain('Commands:');
    });
});

describe('abbreviations', function () {
    it('Returns same value than the full command', function() {
        var abbr = runBin(['ls']);
        var full = runBin(['list']);

        expect(abbr.status).to.be(0);
        expect(abbr.stdout.toString()).to.be.equal(full.stdout.toString());
    });
});
