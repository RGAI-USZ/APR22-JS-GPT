'use strict'

const fs = require('graceful-fs')
const mm = require('minimatch')
const isBinaryFile = require('isbinaryfile')
const _ = require('lodash')
const CryptoUtils = require('./utils/crypto-utils')

const log = require('./logger').create('preprocess')

function createNextProcessor (preprocessors, file, done) {
return function nextPreprocessor (error, content) {

if (arguments.length === 1 && typeof error === 'string') {
content = error
error = null
}

if (error) {
file.content = null
file.contentPath = null
return done(error)
}

if (!preprocessors.length) {
file.contentPath = null
file.content = content
file.sha = CryptoUtils.sha1(content)
return done()
}

preprocessors.shift()(content, file, nextPreprocessor)
}
}

function createPriorityPreprocessor (config, preprocessorPriority, basePath, injector) {
const emitter = injector.get('emitter')
const alreadyDisplayedErrors = {}
const instances = {}
let patterns = Object.keys(config)

function instantiatePreprocessor (name) {
if (alreadyDisplayedErrors[name]) {
return
}

let p

try {
p = injector.get('preprocessor:' + name)
} catch (e) {
if (e.message.includes(`No provider for "preprocessor:${name}"`)) {
log.error(`Can not load "${name}", it is not registered!\n  Perhaps you are missing some plugin?`)
} else {
log.error(`Can not load "${name}"!\n  ` + e.stack)
}
alreadyDisplayedErrors[name] = true
emitter.emit('load_error', 'preprocessor', name)
}

return p
}

let allPreprocessors = []
patterns.forEach((pattern) => {
allPreprocessors = _.union(allPreprocessors, config[pattern])
})
allPreprocessors.forEach(instantiatePreprocessor)

return function preprocess (file, done) {
patterns = Object.keys(config)
let retryCount = 0
let maxRetries = 3
function readFileCallback (err, buffer) {
if (err) {
log.warn(err)
if (retryCount < maxRetries) {
retryCount++
log.warn('retrying ' + retryCount)
fs.readFile(file.originalPath, readFileCallback)
return
} else {
throw err
}
}

isBinaryFile(buffer, buffer.length, function (err, isBinary) {
if (err) {
throw err
}

let preprocessorNames = []
patterns.forEach((pattern) => {
if (mm(file.originalPath, pattern, { dot: true })) {
preprocessorNames = _.union(preprocessorNames, config[pattern])
}
})


let sortedPreprocessorNames = preprocessorNames
.map((name) => [name, preprocessorPriority[name] || 0])
.sort((a, b) => b[1] - a[1])
.map((duo) => duo[0])

let preprocessors = []
const nextPreprocessor = createNextProcessor(preprocessors, file, done)
sortedPreprocessorNames.forEach((name) => {
