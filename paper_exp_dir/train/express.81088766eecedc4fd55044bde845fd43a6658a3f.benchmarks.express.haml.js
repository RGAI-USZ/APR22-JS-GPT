
require.paths.unshift('lib')
require('express')
require('express/plugins')

configure(function(){

set('root', __dirname)
set('views', __dirname + '/../shared')
})

get('/', function(){
this.render('page.html.haml')
})

run()
