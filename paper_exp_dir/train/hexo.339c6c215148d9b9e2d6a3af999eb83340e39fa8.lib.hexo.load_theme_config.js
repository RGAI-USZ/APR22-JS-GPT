'use strict';

const { join, parse } = require('path');
const tildify = require('tildify');
const { exists, readdir } = require('hexo-fs');
const { magenta } = require('chalk');
const { deepMerge } = require('hexo-util');

module.exports = ctx => {
if (!ctx.env.init) return;
if (!ctx.config.theme) return;

let configPath = join(ctx.base_dir, `_config.${String(ctx.config.theme)}.yml`);

return exists(configPath).then(exist => {
return exist ? configPath : findConfigPath(configPath);
}).then(path => {
if (!path) return;

configPath = path;
return ctx.render.render({ path });
}).then(config => {
if (!config || typeof config !== 'object') return;

ctx.log.debug('Second Theme Config loaded: %s', magenta(tildify(configPath)));




ctx.config.theme_config = ctx.config.theme_config
? deepMerge(config, ctx.config.theme_config) : config;
});
};

function findConfigPath(path) {
const { dir, name } = parse(path);

return readdir(dir).then(files => {
const item = files.find(item => item.startsWith(name));
if (item != null) return join(dir, item);
});
}
