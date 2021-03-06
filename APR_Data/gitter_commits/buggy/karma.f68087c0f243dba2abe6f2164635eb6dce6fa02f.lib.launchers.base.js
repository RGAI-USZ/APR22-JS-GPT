const KarmaEventEmitter = require('../events').EventEmitter
const EventEmitter = require('events').EventEmitter
const Promise = require('bluebird')

const log = require('../logger').create('launcher')
const helper = require('../helper')

const BEING_CAPTURED = 1
const CAPTURED = 2
const BEING_KILLED = 3
const FINISHED = 4
const RESTARTING = 5
const BEING_FORCE_KILLED = 6

/**
 * Base launcher that any custom launcher extends.
 */
function BaseLauncher (id, emitter) {
  if (this.start) {
    return
  }

  // TODO(vojta): figure out how to do inheritance with DI
  Object.keys(EventEmitter.prototype).forEach(function (method) {
    this[method] = EventEmitter.prototype[method]
  }, this)

  this.bind = KarmaEventEmitter.prototype.bind.bind(this)
  this.emitAsync = KarmaEventEmitter.prototype.emitAsync.bind(this)

  this.id = id
  this.state = null
  this.error = null

  const self = this
  let killingPromise
  let previousUrl

  this.start = function (url) {
    previousUrl = url

    this.error = null
    this.state = BEING_CAPTURED
    this.emit('start', url + '?id=' + this.id + (helper.isDefined(self.displayName) ? '&displayName=' + encodeURIComponent(self.displayName) : ''))
  }

  this.kill = function () {
    // Already killed, or being killed.
    if (killingPromise) {
      return killingPromise
    }

    killingPromise = this.emitAsync('kill').then(function () {
      self.state = FINISHED
    })

    this.state = BEING_KILLED

    return killingPromise
  }

  this.forceKill = function () {
    this.kill()
    this.state = BEING_FORCE_KILLED

    return killingPromise
  }

  this.restart = function () {
    if (this.state === BEING_FORCE_KILLED) {
      return
    }

    if (!killingPromise) {
      killingPromise = this.emitAsync('kill')
    }

    killingPromise.then(function () {
      if (self.state === BEING_FORCE_KILLED) {
        self.state = FINISHED
      } else {
        killingPromise = null
        log.debug('Restarting %s', self.name)
        self.start(previousUrl)
      }
    })

    self.state = RESTARTING
  }

  this.markCaptured = function () {
    if (this.state === BEING_CAPTURED) {
      this.state = CAPTURED
    }
  }

  this.isCaptured = function () {
    return this.state === CAPTURED
  }

  this.toString = function () {
    return this.name
  }

  this._done = function (error) {
    killingPromise = killingPromise || Promise.resolve()

    this.error = this.error || error
    this.emit('done')

    if (this.error && this.state !== BEING_FORCE_KILLED && this.state !== RESTARTING) {
      emitter.emit('browser_process_failure', this)
    }

    this.state = FINISHED
  }

  this.STATE_BEING_CAPTURED = BEING_CAPTURED
  this.STATE_CAPTURED = CAPTURED
  this.STATE_BEING_KILLED = BEING_KILLED
  this.STATE_FINISHED = FINISHED
  this.STATE_RESTARTING = RESTARTING
  this.STATE_BEING_FORCE_KILLED = BEING_FORCE_KILLED
}

BaseLauncher.decoratorFactory = function (id, emitter) {
  return function (launcher) {
    BaseLauncher.call(launcher, id, emitter)
  }
}

module.exports = BaseLauncher
