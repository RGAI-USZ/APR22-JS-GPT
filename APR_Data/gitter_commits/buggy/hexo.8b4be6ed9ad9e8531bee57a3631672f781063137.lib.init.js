var async = require('async'),
  fs = require('graceful-fs'),
  path = require('path'),
  _ = require('lodash'),
  Hexo = require('./core'),
  HexoError = require('./error'),
  util = require('./util'),
  file = util.file2;

module.exports = function(cwd, args){
  var baseDir = cwd + '/',
    hexo = global.hexo = new Hexo(baseDir, args, {}),
    log = hexo.log;

  require('./plugins/swig');
  require('./plugins/renderer');

  hexo.render.init();

  async.auto({
    // Load config
    config: function(next){
      var configPath = baseDir + '_config.yml';

      fs.exists(configPath, function(exist){
        if (!exist) return next(null, false);

        hexo.render.render({path: configPath}, function(err, result){
          if (err) return log.e(HexoError.wrap(err, 'Configuration file load failed'));

          hexo.config = _.extend(require('./default'), result);

          log.d('Configuration file load successfully');
          next(null, true);
        });
      });
    },
    // update package.json
    update: ['config', function(next, results){
      if (!results.config) return next();

      var packagePath = baseDir + 'package.json';

      async.waterfall([
        // Check package.json existance
        function(next){
          fs.exists(packagePath, function(exist){
            next(null, exist);
          });
        },
        // Update package.json version
        function(exist, next){
          if (exist){
            var obj = require(packagePath);

            if (version === obj.version) return next(null, false);

            log.d('Updating package.json version');
            obj.version = version;
          } else {
            var obj = {
              name: 'hexo',
              version: version,
              private: true,
              dependencies: {}
            };

            log.d('package.json lost. Rebuilding a new one.');
          }

          fs.writeFile(packagePath, JSON.stringify(obj, null, '  '), function(err){
            next(err, exist);
          });
        },
        // Delete old db.json
        function(old, next){
          if (!old) return next();

          var dbPath = baseDir + 'db.json';

          log.d('Hexo was just updated. Deleting old cache database.');

          fs.exists(dbPath, function(exist){
            if (!exist) return next();

            fs.unlink(dbPath, next);
          });
        }
      ], function(err){
        if (err) return log.e(HexoError.wrap(err, 'Version info check failed'));

        log.d('Version info checked successfully');
        next();
      });
    }],
    load_plugins: ['config', function(next, results){
      if (hexo.save || !results.config) return next();

      var pluginDir = hexo.plugin_dir;

      fs.exists(pluginDir, function(exist){
        if (!exist) return next();

        fs.readdir(pluginDir, function(err, files){
          if (err) return log.e(HexoError.wrap(err, 'Plugin load failed'));

          files.forEach(function(item){
            if (!/^hexo-/.test(item)) return;

            try {
              require(pluginDir + item);
              log.d('Plugin loaded successfully: ' + item);
            } catch (err){
              log.e('Plugin load failed: ' + item);
            }
          });

          next();
        });
      });
    }],
    load_scripts: ['config', function(next, results){
      if (hexo.save || !results.config) return next();

      // TODO
      var scriptDir = hexo.script_dir;

      fs.exists(scriptDir, function(exist){
        if (!exist) return next();

        file.list(scriptDir, function(err, files){
          if (err) return log.e(HexoError.wrap(err, 'Script load failed'));

          files.forEach(function(item){
            try {
              require(scriptDir + item);
              log.d('Script loaded successfully: ' + item);
            } catch (err){
              log.e('Script load failed: ' + item);
            }
          });

          next();
        });
      });
    }]
  }, function(err, results){
    if (err) return log.e(err);

    var init = results.config;

    if (init){
      hexo.init = true;

      require('./plugins/tags');
    }

    require('./plugins/console');

    var command = args._.shift();

    hexo.emit('ready');

    hexo.call(command || 'help', args, function(err){
      if (err) return log.e(err);

      process.exit(err ? 1 : 0);
    });
  });
};