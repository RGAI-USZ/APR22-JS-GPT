const should = require('chai').should();

describe('plain', () => {
const r = require('../../../lib/plugins/renderer/plain');

it('normal', () => {
r({text: '123'}).should.eql('123');
});
});
