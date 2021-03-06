'use strict';

const { parse, resolve } = require('url');
const { isMoment, isDate } = require('moment');
const { encodeURL, prettyUrls, htmlTag, stripHTML, escapeHTML, Cache } = require('hexo-util');

const localeMap = {
'en': 'en_US',
'de': 'de_DE',
'es': 'es_ES',
'fr': 'fr_FR',
'hu': 'hu_HU',
'id': 'id_ID',
'it': 'it_IT',
'ja': 'ja_JP',
'ko': 'ko_KR',
'nl': 'nl_NL',
'ru': 'ru_RU',
'th': 'th_TH',
'tr': 'tr_TR',
'vi': 'vi_VN'
};
const localeCache = new Cache();
const localeToTerritory = str => localeCache.apply(str, () => {
if (str.length === 2 && localeMap[str]) return localeMap[str];

if (str.length === 5) {
let territory = [];
if (str.includes('-')) {
territory = str.split('-');
} else {
