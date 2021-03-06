'use strict'

describe('BrowserCollection', () => {
  let emitter
  const e = require('../../lib/events')
  const Collection = require('../../lib/browser_collection')
  const Browser = require('../../lib/browser')
  let collection = emitter = null

  beforeEach(() => {
    emitter = new e.EventEmitter()
    collection = new Collection(emitter)
  })

  describe('add', () => {
    it('should add browser', () => {
      expect(collection.length).to.equal(0)
      collection.add(new Browser('id'))
      expect(collection.length).to.equal(1)
    })

    it('should fire "browsers_change" event', () => {
      const spy = sinon.spy()
      emitter.on('browsers_change', spy)
      collection.add({})
      expect(spy).to.have.been.called
    })
  })

  describe('remove', () => {
    it('should remove given browser', () => {
      const browser = new Browser('id')
      collection.add(browser)

      expect(collection.length).to.equal(1)
      expect(collection.remove(browser)).to.equal(true)
      expect(collection.length).to.equal(0)
    })

    it('should fire "browsers_change" event', () => {
      const spy = sinon.spy()
      const browser = new Browser('id')
      collection.add(browser)

      emitter.on('browsers_change', spy)
      collection.remove(browser)
      expect(spy).to.have.been.called
    })

    it('should return false if given browser does not exist within the collection', () => {
      const spy = sinon.spy()
      emitter.on('browsers_change', spy)
      expect(collection.remove({})).to.equal(false)
      expect(spy).not.to.have.been.called
    })
  })

  describe('getById', () => {
    it('should find the browser by id', () => {
      const browser = new Browser(123)
      collection.add(browser)

      expect(collection.getById(123)).to.equal(browser)
    })

    it('should return null if no browser with given id', () => {
      expect(collection.getById(123)).to.equal(null)

      collection.add(new Browser(456))
      expect(collection.getById(123)).to.equal(null)
    })
  })

  describe('setAllToExecuting', () => {
    let browsers = null

    beforeEach(() => {
      browsers = [new Browser(), new Browser(), new Browser()]
      browsers.forEach((browser) => {
        collection.add(browser)
      })
    })

    it('should set all browsers state to executing', () => {
      collection.setAllToExecuting()
      browsers.forEach((browser) => {
        expect(browser.isReady()).to.equal(false)
        expect(browser.state).to.equal(Browser.STATE_EXECUTING)
      })
    })

    it('should fire "browsers_change" event', () => {
      const spy = sinon.spy()
      emitter.on('browsers_change', spy)
      collection.setAllToExecuting()
      expect(spy).to.have.been.called
    })
  })

  describe('areAllReady', () => {
    let browsers = null

    beforeEach(() => {
      browsers = [new Browser(), new Browser(), new Browser()]
      browsers.forEach((browser) => {
        browser.state = Browser.STATE_READY
        collection.add(browser)
      })
    })

    it('should return true if all browsers are ready', () => {
      expect(collection.areAllReady()).to.equal(true)
    })

    it('should return false if at least one browser is not ready', () => {
      browsers[1].state = Browser.STATE_EXECUTING
      expect(collection.areAllReady()).to.equal(false)
    })

    it('should add all non-ready browsers into given array', () => {
      browsers[0].state = Browser.STATE_EXECUTING
      browsers[1].state = Browser.STATE_EXECUTING_DISCONNECTED
      const nonReady = []
      collection.areAllReady(nonReady)
      expect(nonReady).to.deep.equal([browsers[0], browsers[1]])
    })
  })

  describe('serialize', () => {
    it('should return plain array with serialized browsers', () => {
      const browsers = [new Browser('1'), new Browser('2')]
      browsers[0].name = 'B 1.0'
      browsers[1].name = 'B 2.0'
      collection.add(browsers[0])
      collection.add(browsers[1])

      expect(collection.serialize()).to.deep.equal([
        {id: '1', name: 'B 1.0', isReady: true},
        {id: '2', name: 'B 2.0', isReady: true}
      ])
    })
  })

  describe('getResults', () => {
    it('should return sum of all browser results', () => {
      const browsers = [new Browser(), new Browser()]
      collection.add(browsers[0])
      collection.add(browsers[1])
      browsers[0].lastResult.success = 2
      browsers[0].lastResult.failed = 3
      browsers[1].lastResult.success = 4
      browsers[1].lastResult.failed = 5

      const results = collection.getResults()
      expect(results.success).to.equal(6)
      expect(results.failed).to.equal(8)
    })

    it('should compute disconnected true if any browser got disconnected', () => {
      const browsers = [new Browser(), new Browser()]
      collection.add(browsers[0])
      collection.add(browsers[1])

      let results = collection.getResults()
      expect(results.disconnected).to.equal(false)

      browsers[0].lastResult.disconnected = true
      results = collection.getResults()
      expect(results.disconnected).to.equal(true)

      browsers[1].lastResult.disconnected = true
      results = collection.getResults()
      expect(results.disconnected).to.equal(true)

      browsers[0].lastResult.disconnected = false
      results = collection.getResults()
      expect(results.disconnected).to.equal(true)
    })

    it('should compute error true if any browser had error', () => {
      const browsers = [new Browser(), new Browser()]
      collection.add(browsers[0])
      collection.add(browsers[1])

      let results = collection.getResults()
      expect(results.error).to.equal(false)

      browsers[0].lastResult.error = true
      results = collection.getResults()
      expect(results.error).to.equal(true)

      browsers[1].lastResult.error = true
      results = collection.getResults()
      expect(results.error).to.equal(true)

      browsers[0].lastResult.error = false
      results = collection.getResults()
      expect(results.error).to.equal(true)
    })

    it('should compute exitCode', () => {
      const browsers = [new Browser(), new Browser()]
      browsers.forEach((browser) => collection.add(browser))

      browsers[0].lastResult.success = 2
      let results = collection.getResults()
      expect(results.exitCode).to.equal(0)

      browsers[0].lastResult.failed = 2
      results = collection.getResults()
      expect(results.exitCode).to.equal(1)

      browsers[0].lastResult.failed = 0
      browsers[1].lastResult.error = true
      results = collection.getResults()
      expect(results.exitCode).to.equal(1)

      browsers[0].lastResult.disconnected = true
      browsers[1].lastResult.error = false
      results = collection.getResults()
      expect(results.exitCode).to.equal(1)

      browsers[0].lastResult.disconnected = false
      results = collection.getResults()
      expect(results.exitCode).to.equal(0)
    })
  })

  describe('clearResults', () => {
    it('should clear all results', () => {
      // Date.now.returns 112233
      const browsers = [new Browser(), new Browser()]
      collection.add(browsers[0])
      collection.add(browsers[1])
      browsers[0].lastResult.sucess++
      browsers[0].lastResult.error = true
      browsers[1].lastResult.failed++
      browsers[1].lastResult.skipped++
      browsers[1].lastResult.disconnected = true

      collection.clearResults()
      browsers.forEach((browser) => {
        expect(browser.lastResult.success).to.equal(0)
        expect(browser.lastResult.failed).to.equal(0)
        expect(browser.lastResult.skipped).to.equal(0)
        expect(browser.lastResult.error).to.equal(false)
        expect(browser.lastResult.disconnected).to.equal(false)
      })
    })
  })

  describe('clone', () => {
    it('should create a shallow copy of the collection', () => {
      const browsers = [new Browser(), new Browser(), new Browser()]
      browsers.forEach((browser) => collection.add(browser))

      const clone = collection.clone()
      expect(clone.length).to.equal(3)

      clone.remove(browsers[0])
      expect(clone.length).to.equal(2)
      expect(collection.length).to.equal(3)
    })
  })

  describe('map', () => {
    it('should have map()', () => {
      const browsers = [new Browser(1), new Browser(2), new Browser(3)]
      browsers.forEach((browser) => collection.add(browser))

      const mappedIds = collection.map((browser) => browser.id)

      expect(mappedIds).to.deep.equal([1, 2, 3])
    })
  })

  describe('forEach', () => {
    it('should have forEach()', () => {
      const browsers = [new Browser(0), new Browser(1), new Browser(2)]
      browsers.forEach((browser) => collection.add(browser))

      collection.forEach((browser, index) => {
        expect(browser.id).to.equal(index)
      })
    })
  })
})
