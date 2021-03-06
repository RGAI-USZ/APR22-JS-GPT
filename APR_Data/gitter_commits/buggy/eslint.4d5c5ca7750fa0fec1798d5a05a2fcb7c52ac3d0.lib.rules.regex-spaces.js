/**
 * @fileoverview Rule to count multiple spaces in regular expressions
 * @author Matt DuVall <http://www.mattduvall.com/>
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = function(context) {

    "use strict";

    return {

        "Literal": function(node) {
            var token = context.getTokens(node)[0],
                nodeType = token.type,
                nodeValue = token.value,
                multipleSpacesRegex = /( {2,})+?/,
                regexResults;

            if (nodeType === "RegularExpression") {
                regexResults = multipleSpacesRegex.exec(nodeValue);

                if (regexResults !== null) {
                    context.report(node, "Spaces are hard to count. Use {" + regexResults[0].length + "}.");
                }
            }
        }
    };

};
