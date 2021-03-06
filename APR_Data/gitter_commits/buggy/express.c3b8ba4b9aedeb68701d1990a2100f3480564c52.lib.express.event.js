
// Express - Event - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

exports.Event = new NewClass({
  
  /**
   * Initialize with event _name_ and optional _data_.
   *
   * @param  {string} name
   * @param  {hash} data
   * @api private
   */
  
  constructor: function(name, data) {
    this.name = name
    this.merge(data || {})
  },
  
  /**
   * Return event string.
   *
   * @return {string}
   * @api public
   */
  
  toString: function() {
    return '[Event ' + this.name + ']'
  }
})