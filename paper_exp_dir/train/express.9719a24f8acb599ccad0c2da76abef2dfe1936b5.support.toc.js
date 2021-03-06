#!/usr/bin/env node

var fs = require('fs'),
file = process.argv[2];

if (file) {
var js = fs.readFileSync(file, 'utf8'),
headers = js.match(/<h3 id="(.*?)">(.*?)<\/h3>/g),
toc = ['<ul id="toc">'],
sections = {};
if (js.indexOf('id="toc"') < 0) {
headers.forEach(function(header){
var captures = header.match(/id="(.*?)">(.*?)</),
id = captures[1],
title = captures[2].replace(/\(.*?\)/, '()')
if (~title.indexOf('.')) {
var parts = title.split('.'),
recv = parts.shift(),
method = parts.shift();
if (recv == 'app') recv = 'Server';
if (recv == 'req') recv = 'Request';
if (recv == 'res') recv = 'Response';
sections[recv] = sections[recv] || [];
sections[recv].push('<li><a href="#' + id + '">' + method + '</a></li>');
} else {
toc.push('<li><a href="#' + id + '">' + title + '</a></li>');
}
});
toc.push(renderSections());
