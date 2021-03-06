
// Express - Cookie - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */
 
var Request = require('express/request').Request,
    queryString = require('querystring')

/**
 * Parse an HTTP _cookie_ string into a hash.
 *
 * @param  {string} cookie
 * @return {hash}
 * @api public
 */

exports.parseCookie = function(cookie) {
  return cookie.split(/[;,] */).reduce(function(cookies, p) { 
    var eqidx = p.indexOf('=')
    if (eqidx == -1) return cookies
    var k = queryString.unescape(p.slice(0, eqidx).trim(), true)
    var v = queryString.unescape(p.slice(eqidx + 1).trim(), true)
    var m = v.match(/^("|')(.*)\1$/)
    if (m) v = m[2].replace('\\'+m[1], m[1])
    //RFC2109 states the most specific path will be
    //listed first
    if(!(cookie = cookies[k]))
      cookies[k] = v
    return cookies
  }, {})
}

/**
 * Compile cookie _name_, _val_ and _options_ to a string.
 *
 * @param  {string} name
 * @param  {string} val
 * @param  {hash} options
 * @return {string}
 * @api public
 */

exports.compileCookie = function(name, val, options) {
  if (!options) return name + '=' + val
  var val,
      buf = [name + '=' + val],
      keys = Object.keys(options)
  for (var i = 0, len = keys.length; i < len; ++i) {
    val = options[keys[i]]
    if (val instanceof Date)
      val = val.toGMTString()
    buf.push(val === true 
      ? keys[i]
      : keys[i] + '=' + val)
  }
  return buf.join('; ')
}

// --- Cookie

exports.Cookie = Plugin.extend({
  extend: {
    
    /**
     * Initialize extensions.
     */
    
    init: function() {
      Request.include({

        /**
         * Get or set cookie values.
         *
         * Options:
         *
         *  - path       Cookie path, defaults to '/'
         *  - domain     Tail matched domain name such as 'vision-media.ca' or 'blog.vision-media.ca' etc
         *  - expires    Date object converted to 'Wdy, DD-Mon-YYYY HH:MM:SS GMT'
         *               when undefined the cookie will last the duration of a the
         *               client's session.
         *  - secure     When true the cookie will be sent by the client only when transfering data via HTTPS
         *  - httpOnly   When true the cookie will be sent to the server only and will not be accessable via
         *               client-side scripting.
         *
         * @param  {string} name
         * @param  {string} val
         * @param  {hash} options
         * @return {string}
         * @api public
         */

        cookie: function(name, val, options) {
          options = options || {}
          options.path = options.path || '/'
          return val ?
            this.response.cookies.push(exports.compileCookie(name, val, options)) :
              this.cookies[name]
        }  
      })
    }
  },
  
  // --- Events
  
  on: {
    
    /**
     * Parse request cookie data.
     */
    
    request: function(event) {
      event.request.response.cookies = []
      event.request.cookies = event.request.headers.cookie
        ? exports.parseCookie(event.request.headers.cookie)
        : {}
    },
    
    /**
     * Set the Set-Cookie header when response cookies are available.
     */
    
    response: function(event) {
      if (event.response.cookies && 
          event.response.cookies.length)
        event.request.header('Set-Cookie', event.response.cookies.join('\r\nSet-Cookie: '))
    }
  }
})
