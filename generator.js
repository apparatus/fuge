/* jshint camelcase: false */
/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var yeoman = require('yeoman-environment');
var prompt = require('incite');
var ask = require('positive');
var ord = require('ordinal').english;
var util = require('./util')();
var yaml = require('yamljs');
var spawn = require('child_process').spawn;

var generators = Object.keys(require('./package.json').dependencies)
  .filter(function (dep) { return /generator-/.test(dep)})
  .map(function(gen) { return gen.replace(/generator-/, '') });

var NONE = 0;
var LOW = 1;
var MEDIUM = 2;
var HIGH = 3;
var TRANSPORTS = ['http', 'redis'];

module.exports = function(composeFile) {
  var runYo = util.runYo;
  var locateGenerator = util.locateGenerator;
  var series = util.series;
  var inq = util.inq;
  var cwd = process.cwd();
  //if a compose file was supplied, check if it exists,
  //if not, throw an error
  if (composeFile && !fs.existsSync(composeFile)) {
    throw Error('Cannot locate compose file', composeFile);
  }

  //if no compose file supplied search for compose-dev.yml
  //in ./fuge/compose-dev.yml, ./compose-dev.yml and ../fuge/compose-dev.yml paths
  if (!composeFile) {
    composeFile = path.join(cwd, 'fuge', 'compose-dev.yml');
  }

  function createEnv(args, opts) {
    if (args && Object(args) === args && !Array.isArray(args)) {
      opts = args;
      args = null;
    }
    args = args || [];
    opts = opts || {};
    var env = yeoman.createEnv(args, opts);

    generators.forEach(function (gen) {
      env.register(locateGenerator(gen), gen);
    })

    return env;
  }

  var createServiceDefinition = function (name) {
    console.log('creating service def for', name)
    return ('\n__SERVICE__:\n' + 
           '  build: ../__SERVICE__/\n' + 
           '  container_name: __SERVICE__').replace(/__SERVICE__/g, name);
  }

  var transportSelection = function transportSelection(label, opts) {
    label = label || 'System';
    opts = opts || {};
    var def = opts.def = opts.def || 'http';
    var mixed = 'mixed' in opts ? opts.mixed : true;

    var transports = TRANSPORTS.slice();
    if (mixed) transports.push('mixed');
    var transport = prompt(inq(label + ' transport', transport, transports)) || def;

    if (!~transports.indexOf(transport)) return transportSelection(label, opts);
    return transport;
  };

  var createService = function(srv, cwd, cb) {
    var name = srv.name;
    var transport = srv.transport;
    var appendToCompose = srv.appendToCompose;
    
    fs.mkdirSync(cwd); 
    process.chdir(cwd);
    var env = createEnv({cwd: cwd});

    runYo(env, 'seneca-' + transport, {name: srv.name}, function() {
      
      var definition = createServiceDefinition(name);

      if (appendToCompose && fs.existsSync(composeFile)) {
        fs.appendFileSync(composeFile, definition);
        return cb && cb();
      }

      console.log('add the following to compose-dev.yml to enable this service: ');
      console.log();
      console.log(definition);
      console.log();
      cb && cb();
    });

  };

  var generateService = function(args, interactive, cb) {
    args = args || {}
    var srv = {
      name: args.name || 'service-' + (Math.random() * 1e17).toString(32).substr(6), 
      transport: args.transport, 
      appendToCompose: true
    };

    if (interactive) srv = defineService('Service', MEDIUM, srv);
    createService(srv, path.join(process.cwd(), srv.name), cb);
  }

  var defineService = function (label, interactivity, srv) {
    return {
      name: (interactivity >= MEDIUM) && prompt(inq(label + ' name', srv.name)) || srv.name,
      transport: (srv.transport === 'mixed' || interactivity >= HIGH) ? 
        transportSelection(srv.name, {mixed: false}) : 
        srv.transport,
      appendToCompose: (interactivity >= HIGH) ?
        ask(inq('append ' + srv.name + ' to compose-dev.yml?:', ['y', 'n'])) :
        srv.appendToCompose
    };
  }

  var determineInteractivity = function (i) {
    if (typeof i === 'number') return i;
    if (i === true) return MEDIUM;
    if (/none/i.test(i)) return NONE;
    if (/low/i.test(i)) return LOW;
    if (/med|medium/i.test(i)) return MEDIUM;
    if (/high/i.test(i)) return HIGH;
    return LOW;
  };

  var generateServices = function(opts, cb) {
    var interactivity = opts.interactivity;
    var cwd = opts.cwd;
    var transport = opts.transport;

    var services = [defineService('1st service', interactivity, {
      name: 'service1', 
      transport: transport || 'http', 
      appendToCompose: true
    })];

    if (interactivity <= LOW) {
      services.push(defineService('2nd service', interactivity, {
        name: 'service2', 
        transport: transport, 
        appendToCompose: true
      }));   
    }

    if (interactivity >= MEDIUM) {
      while (ask(inq('add another service?', ['y', 'n']))) {
        services.push(defineService(ord(services.length + 1) + ' service', interactivity, {
          name: 'service' + +(services.length + 1), 
          transport: transport, 
          appendToCompose: true
        }));
      }
    }

    services = services.map(function (service) { 
      return function (cb) {
        process.chdir(cwd);
        createService(service, cwd + path.sep + service.name, cb);
      };
    });

    services.push(genSite);

    series(services, cb);

    function genSite(cb) {
      fs.mkdirSync(cwd + '/site'); 
      var hapiEnv = createEnv({cwd: cwd + '/site'});

      runYo(hapiEnv, 'hapi-seneca', {name: 'site'}, function() {
        console.log('');
        console.log('system generated !!');
        console.log('spin it up with : fuge run ./fuge/compose-dev.yml');
        console.log('');
        console.log('Have an awesome day, you\'re welcome.');
        cb();
      });
    }
  }

  var addInfluxDbDefinition = function (compose) {
    compose.influxdb = {
      image: 'tutum/influxdb:0.9',
      ports: [
        '8086:8086',
        '8083:8083'
      ],
      environment: {
        PRE_CREATE_DB: 'seneca_msgstats',
        ADMIN_USER: 'msgstats',
        INFLUXDB_INIT_PWD: 'msgstats'
      }
    }
    return compose
  };

  var addDashboardDefinition = function (compose) {
    compose.dashboard = {
      build: '../dashboard',
      container_name: 'dashboard'
    }
    return compose
  };

  var addMetricsService = function (compose, cb) {
    compose.metrics = {
      build: '../fuge-metrics',
      container_name: 'fuge-metrics'
    }
    var metrics = path.join(composeFile, '..', '..', 'fuge-metrics')
    fs.mkdirSync(metrics);
    runYo(createEnv({cwd: metrics}), 'seneca-metrics', {name: 'fuge-metrics'}, function (err) {
      cb(err, compose)
    })
  };

  var addMsgstats = function (compose) {
    var services = Object.keys(compose)
      .map(function(k) { return compose[k]; })
      .filter(function (srv) { return srv.build; })

    var added = services
      .map(function (srv) {
        var srvPath = path.join(path.dirname(composeFile), srv.build);
        if (!fs.existsSync(srvPath)) {
          console.warn('Warning: ', srv.container_name, ' build folder does not exist!');
          return;
        }
        if (!fs.existsSync(path.join(srvPath, 'package.json'))) { return; }
        var pkg = JSON.parse(fs.readFileSync(path.join(srvPath, 'package.json')));
        var deps = Object.keys(pkg.dependencies);
        var spIx;
        if (!~deps.indexOf('seneca')) { return; }
        if (!~deps.indexOf('seneca-env-plugins')) {
          console.warn('Warning: ', srv.container_name, ' service is not using seneca-env-plugins!');
          return
        }
        srv.environment = srv.environment || {}
        if (Array.isArray(srv.environment)) {
          srv.environment.some(function (env, i) {
            var match = /SENECA_PLUGINS.+=/.test(env);
            if (match) { spIx = i; }
            return match;
          })

          if (typeof spIx === 'number') { 
            srv.environment[spIx] = srv.environment[spIx]
            .split('=')[0]
              .split(',')
              .concat('msgstats')
              .join(',');
            return {srv: srv, pkg: pkg, path: srvPath}
          }
          srv.environment.push('SENECA_PLUGINS="msgstats"');
          return {srv: srv, pkg: pkg, path: srvPath}
        }
        if ('SENECA_PLUGINS' in srv.environment) {
          srv.environment.SENECA_PLUGINS = srv.environment.SENECA_PLUGINS
            .split(',')
            .concat('msgstats')
            .join(',');
          return {srv: srv, pkg: pkg, path: srvPath}
        }
        srv.environment.SENECA_PLUGINS = 'msgstats';
        return {srv: srv, pkg: pkg, path: srvPath}
      })
      .filter(Boolean)


    function installDeps(added) {
      if (!added.length) { return; }
      var cwd = added.shift().path
      spawn('npm', ['i', '--save', 'seneca-msgstats'], {
        cwd: cwd,
        stdio: 'inherit'
      })
      .on('close', function () {
        installDeps(added)
      })
    }
    installDeps(added)
    return compose;
  };

  var enableDocker = function () {
    var fugeConfig = path.resolve(composeFile, '..', 'fuge-config.js');
    var cfg = require(fugeConfig);
    cfg.runDocker = true;
    fs.writeFileSync(fugeConfig, 'module.exports = ' + JSON.stringify(cfg, 0, 2));
  };

  var generateDashboard = function (cb) {
    
    var compose = yaml.load(composeFile)
    var dashboard = path.join(composeFile, '..', '..', 'dashboard');

    compose = addMsgstats(compose);
    compose = addInfluxDbDefinition(compose);
    
    enableDocker()

    addMetricsService(compose, function(err, compose) {
      if (err) { return cb(err); }
      fs.mkdirSync(dashboard);
      runYo(createEnv({cwd: dashboard}), 'vidi-dashboard', {name: 'dashboard'}, function (err) {
        if (err) { return cb(err); }
        compose = addDashboardDefinition(compose)
        compose = yaml.dump(compose);
        fs.writeFile(composeFile, compose, cb);
      });
    });
  };

  var generateSystem = function(args, cb) {
    var cwd = process.cwd();
    var interactivity = determineInteractivity(args.i);

    var transport = (interactivity && interactivity <= MEDIUM) ? 
      transportSelection() : 
      'http';

    var fuge = path.join(cwd, 'fuge')
    fs.mkdirSync(fuge); 
    runYo(createEnv({cwd: fuge}), 'fuge', {name: 'fuge'}, function() {
      generateServices({
        cwd: cwd, 
        transport: transport,
        interactivity: interactivity
      }, cb);
    });
  };

  return {
    generateSystem: generateSystem,
    generateService: generateService,
    generateDashboard: generateDashboard
  };
};

