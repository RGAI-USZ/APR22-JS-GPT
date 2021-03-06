
/*!
 * Express - Utils
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Parse mini markdown implementation.
 * The following conversions are supported,
 * primarily for the "flash" middleware:
 *
 *    _foo_ or *foo* become <em>foo</em>
 *    __foo__ or **foo** become <strong>foo</strong>
 *    [A](B) becomes <a href="B">A</a>
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.miniMarkdown = function(str){
    return String(str)
        .replace(/(__|\*\*)(.*?)\1/g, '<strong>$2</strong>')
        .replace(/(_|\*)(.*?)\1/g, '<em>$2</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
};

/**
 * Escape special characters in the given string of html.
 *
 * @param  {String} html
 * @return {String}
 * @api private
 */

exports.htmlEscape = function(html) {
    return String(html)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

/**
 * Parse "Range" header `str`.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

exports.parseRange = function(str){
    return str.replace('bytes=', '').split(',').map(function(range){
        range = range.split('-');
        return { start: range[0], end: range[1] };
    });
};