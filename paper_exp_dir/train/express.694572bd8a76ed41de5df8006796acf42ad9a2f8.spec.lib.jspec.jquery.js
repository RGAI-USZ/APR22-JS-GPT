


JSpec
.requires('jQuery', 'when using jspec.jquery.js')
.include({
name: 'jQuery',



init : function() {
jQuery.ajaxSetup({ async: false })
},



utilities : {
element:  jQuery,
elements: jQuery,
sandbox : function() {
return jQuery('<div class="sandbox"></div>')
}
},



matchers : {
have_tag      : "jQuery(expected, actual).length == 1",
have_one      : "alias have_tag",
have_tags     : "jQuery(expected, actual).length > 1",
have_many     : "alias have_tags",
have_child    : "jQuery(actual).children(expected).length == 1",
have_children : "jQuery(actual).children(expected).length > 1",
have_text     : "jQuery(actual).text() == expected",
have_value    : "jQuery(actual).val() == expected",
be_enabled    : "!jQuery(actual).attr('disabled')",
have_class    : "jQuery(actual).hasClass(expected)",

be_visible : function(actual) {
return jQuery(actual).css('display') != 'none' &&
jQuery(actual).css('visibility') != 'hidden' &&
jQuery(actual).attr('type') != 'hidden'
},

be_hidden : function(actual) {
return !JSpec.does(actual, 'be_visible')
},

have_classes : function(actual) {
return !JSpec.any(JSpec.toArray(arguments, 1), function(arg){
return !JSpec.does(actual, 'have_class', arg)
})
},

have_attr : function(actual, attr, value) {
return value ? jQuery(actual).attr(attr) == value:
jQuery(actual).attr(attr)
},

'be disabled selected checked' : function(attr) {
return 'jQuery(actual).attr("' + attr + '")'
},

'have type id title alt href src sel rev name target' : function(attr) {
return function(actual, value) {
return JSpec.does(actual, 'have_attr', attr, value)
}
}
}
})

