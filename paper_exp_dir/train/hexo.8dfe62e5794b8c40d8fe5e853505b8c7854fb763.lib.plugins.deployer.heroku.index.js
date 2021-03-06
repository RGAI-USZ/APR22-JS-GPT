var async = require('async'),
fs = require('graceful-fs'),
path = require('path'),
colors = require('colors'),
moment = require('moment'),
spawn = require('child_process').spawn,
util = require('../../../util'),
file = util.file2;

var log = hexo.log,
baseDir = hexo.base_dir;

var run = function(command, args, callback){
var cp = spawn(command, args, {cwd: baseDir});

cp.stdout.on('data', function(data){
process.stdout.write(data);
});

cp.stderr.on('data', function(data){
process.stderr.write(data);
});

cp.on('close', callback);
};

module.exports = function(args, callback){
var config = hexo.config.deploy;

if (!config.repo && !config.repository){
var help = [
'You should configure deployment settings in _config.yml first!',
'',
'Example:',
'  deploy:',
'    type: heroku',
'    repository: <repository url>',
'',
'For more help, you can check the docs: ' + 'http://zespia.tw/hexo/docs/deployment.html'.underline
];

console.log(help.join('\n'));
return callback();
}

var url = config.repo || config.repository;

async.series([
function(next){
var files = ['app.js', 'Procfile'];

async.forEach(files, function(item, next){
var src = path.join(__dirname, item),
dest = path.join(baseDir, item);

fs.exists(dest, function(exist){
if (exist){
next();
} else {
log.d('Copying %s...', item);
file.copyFile(src, dest, next);
}
});
}, next);
},
function(next){
var packagePath = path.join(baseDir, 'package.json');

var defaultPackage = JSON.stringify({
