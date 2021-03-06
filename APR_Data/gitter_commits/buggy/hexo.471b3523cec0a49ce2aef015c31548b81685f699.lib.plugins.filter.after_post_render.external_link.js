'use strict';

const { parse } = require('url');

const isExternal = (url, config) => {
  const exclude = Array.isArray(config.external_link.exclude) ? config.external_link.exclude :
    [config.external_link.exclude];
  const data = parse(url);
  const host = data.hostname;
  const sitehost = parse(config.url).hostname || config.url;

  if (!data.protocol || !sitehost) return false;

  if (exclude && exclude.length) {
    for (const i of exclude) {
      if (host === i) return false;
    }
  }

  if (host !== sitehost) return true;

  return false;
};

function externalLinkFilter(data) {
  const { config } = this;
  if (typeof config.external_link === 'undefined') return;
  if (config.external_link === false || config.external_link.enable === false ||
    config.external_link.field !== 'post') return;

  data.content = data.content.replace(/<a.*?(href=['"](.*?)['"]).*?>/gi, (str, hrefStr, href) => {
    if (/target=/gi.test(str) || !isExternal(href, config)) return str;

    if (/rel=/gi.test(str)) {
      str = str.replace(/rel="(.*?)"/gi, (relStr, rel) => {
        if (!rel.includes('noopenner')) relStr = relStr.replace(rel, `${rel} noopener`);
        return relStr;
      });
      return str.replace(hrefStr, `${hrefStr} target="_blank"`);
    }

    return str.replace(hrefStr, `${hrefStr} target="_blank" rel="noopener"`);
  });
}

module.exports = externalLinkFilter;
