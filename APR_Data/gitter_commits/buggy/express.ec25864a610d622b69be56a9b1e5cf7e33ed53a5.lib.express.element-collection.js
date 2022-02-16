
// Express - ElementCollection - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Load libxml support.
 */

var libxml = require('support/libxmljs')

// --- ElementCollection

ElementCollection = Collection.extend({
  
  /**
   * Initialize with string of _markup_.
   *
   * @param  {string} markup
   * @api private
   */
  
  init: function(markup) {
    if (typeof markup != 'string')
      return this.__super__(markup)
    if (!(/<html>/.test(markup))) 
      markup = '<html><body>' + markup + '</body></html>'
    this.document = libxml.parseString(markup)
    this.arr = [this.document.root()]
  },
  
  /**
   * Return the first element's name.
   *
   * @return {string}
   * @api public
   */
  
  name: function() {
    return this.at(0).name()
  },
  
  /**
   * Search child elements with the given _xpath_.
   *
   * @param  {string} xpath
   * @return {ElementCollection}
   * @api public
   */
  
  xpath: function(xpath) {
    return $(this.reduce([], function(array, e){
      $(e.find(xpath)).each(function(child){
        array.push(child)
      })
      return array
    }))
  },
  
  toString: function() {
    if (this.at(0) && this.at(0).doc)
      return '[Collection <elements>]'
    return this.__super__()
  }
})

/**
 * Add markup support to $().
 *
 * @param  {object} arr
 * @return {Collection, ElementCollection}
 * @api public
 */
 
var $ = exports.$ = function(arr) {
  if (arr instanceof Collection) return arr
  return new ElementCollection(arr)
}