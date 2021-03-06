const mocks = require('mocks')
const path = require('path')

describe('watcher', () => {
const config = require('../../lib/config')

let m = null

beforeEach(() => {
const mocks_ = {chokidar: mocks.chokidar}
m = mocks.loadFile(path.join(__dirname, '/../../lib/watcher.js'), mocks_)
})

describe('baseDirFromPattern', () => {
it('should return parent directory without start', () => {
expect(m.baseDirFromPattern('/some/path/**/more.js')).to.equal('/some/path')
expect(m.baseDirFromPattern('/some/p*/file.js')).to.equal('/some')
})

it('should remove part with !(x)', () => {
expect(m.baseDirFromPattern('/some/p/!(a|b).js')).to.equal('/some/p')
expect(m.baseDirFromPattern('/some/p!(c|b)*.js')).to.equal('/some')
})

it('should remove part with +(x)', () => {
expect(m.baseDirFromPattern('/some/p/+(a|b).js')).to.equal('/some/p')
expect(m.baseDirFromPattern('/some/p+(c|bb).js')).to.equal('/some')
})

it('should remove part with (x)?', () => {
expect(m.baseDirFromPattern('/some/p/(a|b)?.js')).to.equal('/some/p')
expect(m.baseDirFromPattern('/some/p(c|b)?.js')).to.equal('/some')
})

it('should allow paths with parentheses', () => {
expect(m.baseDirFromPattern('/some/x (a|b)/a.js')).to.equal('/some/x (a|b)/a.js')
expect(m.baseDirFromPattern('/some/p(c|b)/*.js')).to.equal('/some/p(c|b)')
})

it('should ignore exact files', () => {
expect(m.baseDirFromPattern('/usr/local/bin.js')).to.equal('/usr/local/bin.js')
})
})

describe('watchPatterns', () => {
let chokidarWatcher = null

beforeEach(() => {
chokidarWatcher = new mocks.chokidar.FSWatcher()
})

it('should watch all the patterns', () => {
m.watchPatterns(['/some/*.js', '/a/*'], chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal(['/some', '/a'])
})

it('should expand braces and watch all the patterns', () => {
m.watchPatterns(['/some/{a,b}/*.js', '/a/*'], chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal(['/some/a', '/some/b', '/a'])
})

it('should not watch the same path twice', () => {
m.watchPatterns(['/some/a*.js', '/some/*.txt'], chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal(['/some'])
})

it('should not watch the same path twice when using braces', () => {
m.watchPatterns(['/some/*.{js,txt}'], chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal(['/some'])
})

it('should not watch subpaths that are already watched', () => {
m.watchPatterns(['/some/sub/*.js', '/some/a*.*'].map(path.normalize), chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal([path.normalize('/some')])
})

it('should watch a file matching subpath directory', () => {

m.watchPatterns(['/some/test-file.js', '/some/test/**'], chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal(['/some/test-file.js', '/some/test'])
})

it('should watch files matching a subpath directory with braces', () => {
m.watchPatterns(['/some/{a,b}/test.js'], chokidarWatcher)
expect(chokidarWatcher.watchedPaths_).to.deep.equal(['/some/a/test.js', '/some/b/test.js'])
})
})

describe('getWatchedPatterns', () => {
it('should return list of watched patterns (strings)', () => {
const watchedPatterns = m.getWatchedPatterns([
config.createPatternObject('/watched.js'),
config.createPatternObject({pattern: 'non/*.js', watched: false})
])
expect(watchedPatterns).to.deep.equal(['/watched.js'])
})
})

describe('ignore', () => {
const FILE_STAT = {
isDirectory: () => false,
isFile: () => true
}

const DIRECTORY_STAT = {
isDirectory: () => true,
isFile: () => false
}

it('should ignore all files', () => {
const ignore = m.createIgnore(['**/*'], ['**/*'])
