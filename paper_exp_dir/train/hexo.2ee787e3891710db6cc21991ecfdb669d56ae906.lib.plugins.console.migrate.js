'use strict';

const chalk = require('chalk');

function migrateConsole(args) {

if (!args._.length) {
return this.call('help', {_: ['migrate']});
}

const type = args._.shift();
const migrators = this.extend.migrator.list();

if (!migrators[type]) {
let help = '';

help += `${type.magenta} migrator plugin is not installed.\n\n`;
help += 'Installed migrator plugins:\n';
help += `  ${Object.keys(migrators).join(', ')}\n\n`;
help += `For more help, you can check the online docs: ${chalk.underline('http://hexo.io/')}`;

console.log(help);
return;
}

return migrators[type].call(this, args);
}

module.exports = migrateConsole;
