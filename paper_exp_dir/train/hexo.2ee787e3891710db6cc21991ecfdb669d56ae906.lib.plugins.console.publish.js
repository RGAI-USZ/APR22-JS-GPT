'use strict';

const tildify = require('tildify');
const chalk = require('chalk');

function publishConsole(args) {

if (!args._.length) {
return this.call('help', {_: ['publish']});
}

const self = this;

return this.post.publish({
slug: args._.pop(),
layout: args._.length ? args._[0] : this.config.default_layout
}, args.r || args.replace).then(post => {
self.log.info('Published: %s', chalk.magenta(tildify(post.path)));
});
}

module.exports = publishConsole;
