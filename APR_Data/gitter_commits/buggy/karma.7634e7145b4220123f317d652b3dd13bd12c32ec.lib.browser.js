'use strict'

const BrowserResult = require('./browser_result')
const helper = require('./helper')
const logger = require('./logger')

const CONNECTED = 1 // The browser is connected but not yet been commanded to execute tests.
const CONFIGURING = 2 // The browser has been told to execute tests; it is configuring before tests execution.
const EXECUTING = 3 // The browser is executing the tests.
const EXECUTING_DISCONNECTED = 4 // The browser is executing the tests, but temporarily disconnect (waiting for reconnecting).
const DISCONNECTED = 5 // The browser got permanently disconnected (being removed from the collection and destroyed).

class Browser {
  constructor (id, fullName, collection, emitter, socket, timer, disconnectDelay, noActivityTimeout) {
    this.id = id
    this.fullName = fullName
    this.name = helper.browserFullNameToShort(fullName)
    this.state = CONNECTED
    this.lastResult = new BrowserResult()
    this.disconnectsCount = 0
    this.activeSockets = [socket]
    this.noActivityTimeout = noActivityTimeout
    this.collection = collection
    this.emitter = emitter
    this.socket = socket
    this.timer = timer
    this.disconnectDelay = disconnectDelay

    this.log = logger.create(this.name)

    this.noActivityTimeoutId = null
    this.pendingDisconnect = null
  }

  init () {
    this.log.info(`Connected on socket ${this.socket.id} with id ${this.id}`)

    this.bindSocketEvents(this.socket)
    this.collection.add(this)
    this.emitter.emit('browsers_change', this.collection) // TODO(vojta): move to collection
    this.emitter.emit('browser_register', this)
  }

  onKarmaError (error) {
    if (this.isNotConnected()) {
      this.lastResult.error = true
      this.emitter.emit('browser_error', this, error)
      this.refreshNoActivityTimeout()
    }
  }

  onInfo (info) {
    if (this.isNotConnected()) {
      if (helper.isDefined(info.dump)) {
        this.emitter.emit('browser_log', this, info.dump, 'dump')
      }

      if (helper.isDefined(info.log)) {
        this.emitter.emit('browser_log', this, info.log, info.type)
      } else if (!helper.isDefined(info.dump)) {
        this.emitter.emit('browser_info', this, info)
      }

      this.refreshNoActivityTimeout()
    }
  }

  onStart (info) {
    if (info.total === null) {
      this.log.warn('Adapter did not report total number of specs.')
    }

    this.lastResult = new BrowserResult(info.total)
    this.state = EXECUTING
    this.emitter.emit('browser_start', this, info)
    this.refreshNoActivityTimeout()
  }

  onComplete (result) {
    if (this.isNotConnected()) {
      this.state = CONNECTED
      this.lastResult.totalTimeEnd()

      if (!this.lastResult.success) {
        this.lastResult.error = true
      }

      this.emitter.emit('browsers_change', this.collection)
      this.emitter.emit('browser_complete', this, result)

      this.clearNoActivityTimeout()
    }
  }

  onDisconnect (reason, disconnectedSocket) {
    helper.arrayRemove(this.activeSockets, disconnectedSocket)

    if (this.activeSockets.length) {
      this.log.debug(`Disconnected ${disconnectedSocket.id}, still have ${this.getActiveSocketsIds()}`)
      return
    }

    if (this.isConnected()) {
      this.disconnect(`Client disconnected from CONNECTED state (${reason})`)
    } else if ([CONFIGURING, EXECUTING].includes(this.state)) {
      this.log.debug(`Disconnected during run, waiting ${this.disconnectDelay}ms for reconnecting.`)
      this.state = EXECUTING_DISCONNECTED

      this.pendingDisconnect = this.timer.setTimeout(() => {
        this.lastResult.totalTimeEnd()
        this.lastResult.disconnected = true
        this.disconnect(`reconnect failed before timeout of ${this.disconnectDelay}ms (${reason})`)
        this.emitter.emit('browser_complete', this)
      }, this.disconnectDelay)

      this.clearNoActivityTimeout()
    }
  }

  reconnect (newSocket) {
    if (this.state === EXECUTING_DISCONNECTED) {
      this.log.debug(`Reconnected on ${newSocket.id}.`)
      this.state = EXECUTING
    } else if ([CONNECTED, CONFIGURING, EXECUTING].includes(this.state)) {
      this.log.debug(`New connection ${newSocket.id} (already have ${this.getActiveSocketsIds()})`)
    } else if (this.state === DISCONNECTED) {
      this.log.info(`Connected on socket ${newSocket.id} with id ${this.id}`)
      this.state = CONNECTED

      this.collection.add(this)
      this.emitter.emit('browsers_change', this.collection) // TODO(vojta): move to collection
      this.emitter.emit('browser_register', this)
    }

    if (!this.activeSockets.some((s) => s.id === newSocket.id)) {
      this.activeSockets.push(newSocket)
      this.bindSocketEvents(newSocket)
    }

    if (this.pendingDisconnect) {
      this.timer.clearTimeout(this.pendingDisconnect)
    }

    this.refreshNoActivityTimeout()
  }

  onResult (result) {
    if (result.length) {
      result.forEach(this.onResult, this)
      return
    } else if (this.isNotConnected()) {
      this.lastResult.add(result)
      this.emitter.emit('spec_complete', this, result)
    }
    this.refreshNoActivityTimeout()
  }

  execute (config) {
    this.activeSockets.forEach((socket) => socket.emit('execute', config))
    this.state = CONFIGURING
    this.refreshNoActivityTimeout()
  }

  getActiveSocketsIds () {
    return this.activeSockets.map((s) => s.id).join(', ')
  }

  disconnect (reason) {
    this.log.warn(`Disconnected (${this.disconnectsCount} times)${reason || ''}`)
    this.state = DISCONNECTED
    this.disconnectsCount++
    this.emitter.emit('browser_error', this, `Disconnected${reason || ''}`)
    this.collection.remove(this)
  }

  refreshNoActivityTimeout () {
    if (this.noActivityTimeout) {
      this.clearNoActivityTimeout()

      this.noActivityTimeoutId = this.timer.setTimeout(() => {
        this.lastResult.totalTimeEnd()
        this.lastResult.disconnected = true
        this.disconnect(`, because no message in ${this.noActivityTimeout} ms.`)
        this.emitter.emit('browser_complete', this)
      }, this.noActivityTimeout)
    }
  }

  clearNoActivityTimeout () {
    if (this.noActivityTimeout && this.noActivityTimeoutId) {
      this.timer.clearTimeout(this.noActivityTimeoutId)
      this.noActivityTimeoutId = null
    }
  }

  bindSocketEvents (socket) {
    // TODO: check which of these events are actually emitted by socket
    socket.on('disconnect', (reason) => this.onDisconnect(reason, socket))
    socket.on('start', (info) => this.onStart(info))
    socket.on('karma_error', (error) => this.onKarmaError(error))
    socket.on('complete', (result) => this.onComplete(result))
    socket.on('info', (info) => this.onInfo(info))
    socket.on('result', (result) => this.onResult(result))
  }

  isConnected () {
    return this.state === CONNECTED
  }

  isNotConnected () {
    return !this.isConnected()
  }

  serialize () {
    return {
      id: this.id,
      name: this.name,
      isConnected: this.state === CONNECTED
    }
  }

  toString () {
    return this.name
  }

  toJSON () {
    return {
      id: this.id,
      fullName: this.fullName,
      name: this.name,
      state: this.state,
      lastResult: this.lastResult,
      disconnectsCount: this.disconnectsCount,
      noActivityTimeout: this.noActivityTimeout,
      disconnectDelay: this.disconnectDelay
    }
  }
}

Browser.factory = function (
  id, fullName, /* capturedBrowsers */ collection, emitter, socket, timer,
  /* config.browserDisconnectTimeout */ disconnectDelay,
  /* config.browserNoActivityTimeout */ noActivityTimeout
) {
  return new Browser(id, fullName, collection, emitter, socket, timer, disconnectDelay, noActivityTimeout)
}

Browser.STATE_CONNECTED = CONNECTED
Browser.STATE_CONFIGURING = CONFIGURING
Browser.STATE_EXECUTING = EXECUTING
Browser.STATE_EXECUTING_DISCONNECTED = EXECUTING_DISCONNECTED
Browser.STATE_DISCONNECTED = DISCONNECTED

module.exports = Browser
