var chalk = require('chalk');

module.exports = function(args){

if (!args._.length){
return this.call('help', {_: ['migrate']});
}

var type = args._.shift();
var migrators = this.extend.migrator.list();

if (!migrators[type]){
var help = '';

help += type.magenta + ' migrator plugin is not installed.\n\n';
help += 'Installed migrator plugins:\n';
help += '  ' + Object.keys(migrators).join(', ') + '\n\n';
help += 'For more help, you can check the online docs: ' + chalk.underline('http://hexo.io/');

console.log(help);
return;
}

return migrators[type].call(this, args);
};
