files = [
  QUNIT,
  QUNIT_ADAPTER,
  '*.js'
];

exclude = [
  'testacular.conf.js'
];

autoWatch = true;

browsers = ['Chrome']

plugins = [
  'testacular-chrome-launcher',
  'testacular-firefox-launcher'
];
