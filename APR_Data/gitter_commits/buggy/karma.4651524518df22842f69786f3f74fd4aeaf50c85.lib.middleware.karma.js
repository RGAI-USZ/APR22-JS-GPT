/**
 * Karma middleware is responsible for serving:
 * - client.html (the entrypoint for capturing a browser)
 * - debug.html
 * - context.html (the execution context, loaded within an iframe)
 * - karma.js
 *
 * The main part is generating context.html, as it contains:
 * - generating mappings
 * - including <script> and <link> tags
 * - setting propert caching headers
 */

const path = require('path')
const url = require('url')
const helper = require('../helper')

const log = require('../logger').create('middleware:karma')
const stripHost = require('./strip_host').stripHost
const common = require('./common')

const VERSION = require('../constants').VERSION
const SCRIPT_TYPE = {
  'js': 'text/javascript',
  'dart': 'application/dart',
  'module': 'module'
}
const FILE_TYPES = [
  'css',
  'html',
  'js',
  'dart',
  'module'
]

function filePathToUrlPath (filePath, basePath, urlRoot, proxyPath) {
  if (filePath.startsWith(basePath)) {
    return proxyPath + urlRoot.substr(1) + 'base' + filePath.substr(basePath.length)
  }
  return proxyPath + urlRoot.substr(1) + 'absolute' + filePath
}

function getQuery (urlStr) {
  return url.parse(urlStr, true).query || {}
}

function getXUACompatibleMetaElement (url) {
  const query = getQuery(url)
  if (query['x-ua-compatible']) {
    return `\n<meta http-equiv="X-UA-Compatible" content="${query['x-ua-compatible']}"/>`
  }
  return ''
}

function getXUACompatibleUrl (url) {
  const query = getQuery(url)
  if (query['x-ua-compatible']) {
    return '?x-ua-compatible=' + encodeURIComponent(query['x-ua-compatible'])
  }
  return ''
}

function createKarmaMiddleware (
  filesPromise,
  serveStaticFile,
  serveFile,
  injector,
  basePath,
  urlRoot,
  upstreamProxy,
  browserSocketTimeout
) {
  const proxyPath = upstreamProxy ? upstreamProxy.path : '/'
  return function (request, response, next) {
    // These config values should be up to date on every request
    const client = injector.get('config.client')
    const customContextFile = injector.get('config.customContextFile')
    const customDebugFile = injector.get('config.customDebugFile')
    const customClientContextFile = injector.get('config.customClientContextFile')
    const includeCrossOriginAttribute = injector.get('config.crossOriginAttribute')

    const normalizedUrl = stripHost(request.url) || request.url
    // For backwards compatibility in middleware plugins, remove in v4.
    request.normalizedUrl = normalizedUrl

    let requestUrl = normalizedUrl.replace(/\?.*/, '')
    const requestedRangeHeader = request.headers['range']

    // redirect /__karma__ to /__karma__ (trailing slash)
    if (requestUrl === urlRoot.substr(0, urlRoot.length - 1)) {
      response.setHeader('Location', proxyPath + urlRoot.substr(1))
      response.writeHead(301)
      return response.end('MOVED PERMANENTLY')
    }

    // ignore urls outside urlRoot
    if (!requestUrl.startsWith(urlRoot)) {
      return next()
    }

    // remove urlRoot prefix
    requestUrl = requestUrl.substr(urlRoot.length - 1)

    // serve client.html
    if (requestUrl === '/') {
      // redirect client_with_context.html
      if (!client.useIframe && client.runInParent) {
        requestUrl = '/client_with_context.html'
      } else { // serve client.html
        return serveStaticFile('/client.html', requestedRangeHeader, response, (data) =>
          data
            .replace('\n%X_UA_COMPATIBLE%', getXUACompatibleMetaElement(request.url))
            .replace('%X_UA_COMPATIBLE_URL%', getXUACompatibleUrl(request.url)))
      }
    }

    if (['/karma.js', '/context.js', '/debug.js'].includes(requestUrl)) {
      return serveStaticFile(requestUrl, requestedRangeHeader, response, (data) =>
        data
          .replace('%KARMA_URL_ROOT%', urlRoot)
          .replace('%KARMA_VERSION%', VERSION)
          .replace('%KARMA_PROXY_PATH%', proxyPath)
          .replace('%BROWSER_SOCKET_TIMEOUT%', browserSocketTimeout))
    }

    // serve the favicon
    if (requestUrl === '/favicon.ico') {
      return serveStaticFile(requestUrl, requestedRangeHeader, response)
    }

    // serve context.html - execution context within the iframe
    // or debug.html - execution context without channel to the server
    const isRequestingContextFile = requestUrl === '/context.html'
    const isRequestingDebugFile = requestUrl === '/debug.html'
    const isRequestingClientContextFile = requestUrl === '/client_with_context.html'
    if (isRequestingContextFile || isRequestingDebugFile || isRequestingClientContextFile) {
      return filesPromise.then(function (files) {
        let fileServer
        let requestedFileUrl
        log.debug('custom files', customContextFile, customDebugFile, customClientContextFile)
        if (isRequestingContextFile && customContextFile) {
          log.debug('Serving customContextFile %s', customContextFile)
          fileServer = serveFile
          requestedFileUrl = customContextFile
        } else if (isRequestingDebugFile && customDebugFile) {
          log.debug('Serving customDebugFile %s', customDebugFile)
          fileServer = serveFile
          requestedFileUrl = customDebugFile
        } else if (isRequestingClientContextFile && customClientContextFile) {
          log.debug('Serving customClientContextFile %s', customClientContextFile)
          fileServer = serveFile
          requestedFileUrl = customClientContextFile
        } else {
          log.debug('Serving static request %s', requestUrl)
          fileServer = serveStaticFile
          requestedFileUrl = requestUrl
        }

        fileServer(requestedFileUrl, requestedRangeHeader, response, function (data) {
          common.setNoCacheHeaders(response)

          const scriptTags = []
          const scriptUrls = []
          for (const file of files.included) {
            let filePath = file.path
            const fileType = file.type || path.extname(filePath).substring(1)

            if (helper.isDefined(fileType) && !FILE_TYPES.includes(fileType)) {
              log.warn('Invalid file type, defaulting to js.', fileType)
            }

            if (!file.isUrl) {
              filePath = filePathToUrlPath(filePath, basePath, urlRoot, proxyPath)

              if (requestUrl === '/context.html') {
                filePath += '?' + file.sha
              }
            }

            scriptUrls.push(filePath)

            if (fileType === 'css') {
              scriptTags.push(`<link type="text/css" href="${filePath}" rel="stylesheet">`)
            } else if (fileType === 'html') {
              scriptTags.push(`<link href="${filePath}" rel="import">`)
            } else {
              const scriptType = (SCRIPT_TYPE[fileType] || 'text/javascript')
              const crossOriginAttribute = includeCrossOriginAttribute ? 'crossorigin="anonymous"' : ''
              scriptTags.push(`<script type="${scriptType}" src="${filePath}" ${crossOriginAttribute}></script>`)
            }
          }

          const mappings = data.includes('%MAPPINGS%') ? files.served.map((file) => {
            const filePath = filePathToUrlPath(file.path, basePath, urlRoot, proxyPath)
              .replace(/\\/g, '\\\\') // Windows paths contain backslashes and generate bad IDs if not escaped
              .replace(/'/g, '\\\'') // Escape single quotes - double quotes should not be allowed!

            return `  '${filePath}': '${file.sha}'`
          }) : []

          return data
            .replace('%SCRIPTS%', scriptTags.join('\n'))
            .replace('%CLIENT_CONFIG%', 'window.__karma__.config = ' + JSON.stringify(client) + ';\n')
            .replace('%SCRIPT_URL_ARRAY%', 'window.__karma__.scriptUrls = ' + JSON.stringify(scriptUrls) + ';\n')
            .replace('%MAPPINGS%', 'window.__karma__.files = {\n' + mappings.join(',\n') + '\n};\n')
            .replace('\n%X_UA_COMPATIBLE%', getXUACompatibleMetaElement(request.url))
        })
      })
    } else if (requestUrl === '/context.json') {
      return filesPromise.then((files) => {
        common.setNoCacheHeaders(response)
        response.writeHead(200)
        response.end(JSON.stringify({
          files: files.included.map((file) => filePathToUrlPath(file.path + '?' + file.sha, basePath, urlRoot, proxyPath))
        }))
      })
    }

    return next()
  }
}

createKarmaMiddleware.$inject = [
  'filesPromise',
  'serveStaticFile',
  'serveFile',
  'injector',
  'config.basePath',
  'config.urlRoot',
  'config.upstreamProxy',
  'config.browserSocketTimeout'
]

// PUBLIC API
exports.create = createKarmaMiddleware
