'use strict'

describe('Browser', () => {
let collection
let emitter
let socket
const e = require('../../lib/events')
const Browser = require('../../lib/browser')
const Collection = require('../../lib/browser_collection')
const createMockTimer = require('./mocks/timer')

let browser = collection = emitter = socket = null
let socketId = 0

const mkSocket = () => {
const s = new e.EventEmitter()
socketId = socketId + 1
s.id = socketId
return s
}

beforeEach(() => {
socket = mkSocket()
emitter = new e.EventEmitter()
collection = new Collection(emitter)
})

it('should set fullName and name', () => {
const fullName = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.7 ' + '(KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'
browser = new Browser('id', fullName, collection, emitter, socket)
expect(browser.name).to.equal('Chrome 16.0.912.63 (Mac OS 10.6.8)')
expect(browser.fullName).to.equal(fullName)
})

it('should serialize to JSON', () => {
const fullName = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.7 ' + '(KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'
browser = new Browser('id', fullName, collection, emitter, socket)
emitter.browser = browser
const json = JSON.stringify(browser)
expect(json).to.contain(fullName)
})

describe('init', () => {
it('should emit "browser_register"', () => {
const spyRegister = sinon.spy()
emitter.on('browser_register', spyRegister)
browser = new Browser(12345, '', collection, emitter, socket)
browser.init()

expect(spyRegister).to.have.been.called
expect(spyRegister.args[0][0]).to.equal(browser)
})

it('should ad itself into the collection', () => {
browser = new Browser(12345, '', collection, emitter, socket)
browser.init()

expect(collection.length).to.equal(1)
collection.forEach((browserInCollection) => {
expect(browserInCollection).to.equal(browser)
})
})
})

describe('toString', () => {
it('should return browser name', () => {
const fullName = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.7 ' + '(KHTML, like Gecko) Chrome/16.0.912.63 Safari/535.7'
browser = new Browser('id', fullName, collection, emitter, socket)
expect(browser.toString()).to.equal('Chrome 16.0.912.63 (Mac OS 10.6.8)')
})

it('should return verbatim user agent string for unrecognized browser', () => {
const fullName = 'NonexistentBot/1.2.3'
browser = new Browser('id', fullName, collection, emitter, socket)
expect(browser.toString()).to.equal('NonexistentBot/1.2.3')
})
})

describe('onKarmaError', () => {
beforeEach(() => {
browser = new Browser('fake-id', 'full name', collection, emitter, socket)
})

it('should set lastResult.error and fire "browser_error"', () => {
const spy = sinon.spy()
emitter.on('browser_error', spy)
browser.state = Browser.STATE_EXECUTING

browser.onKarmaError()
expect(browser.lastResult.error).to.equal(true)
expect(spy).to.have.been.called
})

it('should not set lastResult if browser not executing', () => {
browser.state = Browser.STATE_CONNECTED

browser.onKarmaError()
expect(browser.lastResult.error).to.equal(false)
})
})

describe('onInfo', () => {
beforeEach(() => {
browser = new Browser('fake-id', 'full name', collection, emitter, socket)
})

it('should emit "browser_log"', () => {
const spy = sinon.spy()
emitter.on('browser_log', spy)

browser.state = Browser.STATE_EXECUTING
browser.onInfo({ log: 'something', type: 'info' })
expect(spy).to.have.been.calledWith(browser, 'something', 'info')
})

it('should emit "browser_info"', () => {
const spy = sinon.spy()
const infoData = {}
emitter.on('browser_info', spy)

browser.state = Browser.STATE_EXECUTING
browser.onInfo(infoData)
expect(spy).to.have.been.calledWith(browser, infoData)
})

it('should update total specs count during execution', () => {
browser.state = Browser.STATE_EXECUTING
browser.onInfo({ total: 20 })

expect(browser.lastResult.total).to.equal(20)
})

it('should ignore update total if not executing', () => {
const spy = sinon.spy()
emitter.on('browser_log', spy)
emitter.on('browser_info', spy)

browser.state = Browser.STATE_CONNECTED
browser.onInfo({ total: 20 })

expect(browser.lastResult.total).to.equal(0)
expect(spy).not.to.have.been.called
})
})

describe('onStart', () => {
beforeEach(() => {
browser = new Browser('fake-id', 'full name', collection, emitter, socket)
})

it('should change state to EXECUTING', () => {
browser.state = Browser.STATE_CONNECTED
browser.onStart({ total: 20 })
expect(browser.state).to.equal(Browser.STATE_EXECUTING)
})

it('should set total count of specs', () => {
browser.onStart({ total: 20 })
expect(browser.lastResult.total).to.equal(20)
})

it('should emit "browser_start"', () => {
const spy = sinon.spy()
emitter.on('browser_start', spy)

browser.onStart({ total: 20 })

expect(spy).to.have.been.calledWith(browser, { total: 20 })
})
})

describe('onComplete', () => {
beforeEach(() => {
sinon.stub(Date, 'now')
Date.now.returns(12345)
browser = new Browser('fake-id', 'full name', collection, emitter, socket)
})

afterEach(() => {
Date.now.restore()
})

it('should set isConnected to true', () => {
browser.state = Browser.STATE_EXECUTING
browser.onComplete()
expect(browser.isConnected()).to.equal(true)
})

it('should fire "browsers_change" event', () => {
const spy = sinon.spy()
emitter.on('browsers_change', spy)

browser.state = Browser.STATE_EXECUTING
browser.onComplete()
expect(spy).to.have.been.calledWith(collection)
})

it('should ignore if browser not executing', () => {
const spy = sinon.spy()
emitter.on('browsers_change', spy)
emitter.on('browser_complete', spy)

browser.state = Browser.STATE_CONNECTED
browser.onComplete()
expect(spy).not.to.have.been.called
})

it('should set totalTime', () => {
Date.now.returns(12347)

browser.state = Browser.STATE_EXECUTING
browser.onComplete()

expect(browser.lastResult.totalTime).to.equal(2)
})
})

describe('onSocketDisconnect', () => {
let timer = null

beforeEach(() => {
timer = createMockTimer()
browser = new Browser('fake-id', 'full name', collection, emitter, socket, timer, 10)
browser.init()
})

it('should remove from parent collection', () => {
expect(collection.length).to.equal(1)

browser.onSocketDisconnect('socket.io-reason', socket)
expect(collection.length).to.equal(0)
})

it('should complete if browser executing', () => {
const spy = sinon.spy()
emitter.on('browser_complete', spy)
browser.state = Browser.STATE_EXECUTING

browser.onSocketDisconnect('socket.io-reason', socket)
timer.wind(20)

expect(browser.lastResult.disconnected).to.equal(true)
expect(spy).to.have.been.called
})

it('should not complete if browser not executing', () => {
const spy = sinon.spy()
emitter.on('browser_complete', spy)
browser.state = Browser.STATE_CONNECTED

browser.onSocketDisconnect('socket.io-reason', socket)
expect(spy).not.to.have.been.called
})
})

describe('reconnect', () => {
it('should cancel disconnecting', () => {
const timer = createMockTimer()

browser = new Browser('id', 'Chrome 19.0', collection, emitter, socket, timer, 10)
browser.init()
browser.state = Browser.STATE_EXECUTING

browser.onSocketDisconnect('socket.io-reason', socket)
browser.reconnect(mkSocket(), true)

timer.wind(10)
expect(browser.state).to.equal(Browser.STATE_EXECUTING)
})

it('should ignore disconnects on old sockets, but accept other messages', () => {


browser = new Browser('id', 'Chrome 19.0', collection, emitter, socket, null, 0)
browser.init()
browser.state = Browser.STATE_EXECUTING

browser.reconnect(mkSocket(), true)


socket.emit('result', { success: true })
expect(browser.lastResult.success).to.equal(1)

socket.emit('karma_error', {})
expect(browser.lastResult.error).to.equal(true)


socket.emit('disconnect', 'socket.io reason')
expect(browser.state).to.equal(Browser.STATE_EXECUTING)
})

it('should reconnect a disconnected browser', () => {
browser = new Browser('id', 'Chrome 25.0', collection, emitter, socket, null, 10)
browser.state = Browser.STATE_DISCONNECTED

browser.reconnect(mkSocket(), true)

expect(browser.isConnected()).to.equal(true)
})

it('should not add a disconnected browser to the collection multiple times', () => {
browser = new Browser('id', 'Chrome 25.0', collection, emitter, socket, null, 10)
browser.init()

expect(collection.length).to.equal(1)

browser.state = Browser.STATE_DISCONNECTED

browser.reconnect(mkSocket(), false)

expect(collection.length).to.equal(1)
})
})

describe('onResult', () => {
const createSuccessResult = () => {
return { success: true, suite: [], log: [] }
}

const createFailedResult = () => {
return { success: false, suite: [], log: [] }
}

const createSkippedResult = () => {
return { success: true, skipped: true, suite: [], log: [] }
}

beforeEach(() => {
browser = new Browser('fake-id', 'full name', collection, emitter, socket)
})

it('should update lastResults', () => {
browser.state = Browser.STATE_EXECUTING
browser.onResult(createSuccessResult())
browser.onResult(createSuccessResult())
browser.onResult(createFailedResult())
browser.onResult(createSkippedResult())

expect(browser.lastResult.success).to.equal(2)
expect(browser.lastResult.failed).to.equal(1)
expect(browser.lastResult.skipped).to.equal(1)
})

it('should ignore if not running', () => {
browser.state = Browser.STATE_CONNECTED
browser.onResult(createSuccessResult())
browser.onResult(createSuccessResult())
browser.onResult(createFailedResult())

expect(browser.lastResult.success).to.equal(0)
expect(browser.lastResult.failed).to.equal(0)
})

it('should update netTime', () => {
browser.state = Browser.STATE_EXECUTING
browser.onResult({ time: 3, suite: [], log: [] })
browser.onResult({ time: 1, suite: [], log: [] })
browser.onResult({ time: 5, suite: [], log: [] })

expect(browser.lastResult.netTime).to.equal(9)
})

it('should accept array of results', () => {
browser.state = Browser.STATE_EXECUTING
browser.onResult([
createSuccessResult(), createSuccessResult(),
createFailedResult(), createSkippedResult()
])

expect(browser.lastResult.success).to.equal(2)
expect(browser.lastResult.failed).to.equal(1)
expect(browser.lastResult.skipped).to.equal(1)
})
})

describe('serialize', () => {
it('should return plain object with only name, id, isConnected properties', () => {
browser = new Browser('fake-id', 'full name', collection, emitter, socket)
browser.state = Browser.STATE_CONNECTED
browser.name = 'Browser 1.0'
browser.id = '12345'

expect(browser.serialize()).to.deep.equal({ id: '12345', name: 'Browser 1.0', isConnected: true })
})
})

describe('execute and start', () => {
it('should emit execute and change state to CONFIGURING', () => {
const spyExecute = sinon.spy()
const timer = undefined
