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

process.env.PATH = path.join(__dirname, 'node_modules', '.bin') + ':' + process.env.PATH;

var generators = [
  'fuge:app',
  'fuge:rest',
  'fuge:static',
  'fuge:service',
  'seneca-metrics:app',
  'vidi-dashboard:app'
];

var NONE = 0;
var LOW = 1;
var MEDIUM = 2;
var HIGH = 3;
var FRAMEWORKS = ['hapi', 'express'];

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

    generators.forEach(function(gen) {
      env.register(locateGenerator(gen), gen);
    });

    return env;
  }

  var createServiceDefinition = function(name) {
    console.log('creating service def for', name);
    return ('\n__SERVICE__:\n' +
    '  build: ../__SERVICE__/\n' +
    '  container_name: __SERVICE__').replace(/__SERVICE__/g, name);
  };

  var frameworkSelection = function frameworkSelection(label, opts) {
    label = label || 'Web';
    opts = opts || {};
    var def = opts.def = opts.def || 'hapi';

    var frameworks = FRAMEWORKS.slice();
    var framework = prompt(inq(label + ' framework', framework, frameworks)) || def;

    if (frameworks.indexOf(framework) === -1) {
      return frameworkSelection(label, opts);
    }
    return framework;
  };

  var createService = function(srv, cwd, cb) {
    var name = srv.name;
    var framework = srv.framework;
    var appendToCompose = srv.appendToCompose;

    fs.mkdirSync(cwd);
    process.chdir(cwd);
    var env = createEnv({
      cwd: cwd
    });

    runYo(env, 'fuge:service', {
      name: srv.name,
      framework: framework
    }, function() {

      var definition = createServiceDefinition(name);

      if (appendToCompose && fs.existsSync(composeFile)) {
        fs.appendFileSync(composeFile, definition);
        return cb && cb();
      } else {
        console.log('add the following to compose-dev.yml to enable this service: ');
        console.log();
        console.log(definition);
        console.log();
        if (cb) { cb(); }
      }
      return framework;
    });

  };

  var defineService = function(label, interactivity, srv) {
    return {
      name: (interactivity >= MEDIUM) && prompt(inq(label + ' name', srv.name)) || srv.name,
      framework: (interactivity >= HIGH) ?
        frameworkSelection(srv.name) :
        srv.framework,
      appendToCompose: (interactivity >= HIGH) ?
        ask(inq('append ' + srv.name + ' to compose-dev.yml?:', ['y', 'n'])) :
        srv.appendToCompose
    };
  };

  var generateService = function(args, interactive, cb) {
    args = args || {};
    var srv = {
      name: args.name || 'service' + (Math.random() * 1e17).toString(32).substr(6),
      framework: args.framework || 'hapi',
      appendToCompose: true
    };

    if (interactive) {
      srv = defineService('Service', MEDIUM, srv);
    }
    createService(srv, path.join(process.cwd(), srv.name), cb);
  };

  var determineInteractivity = function(i) {
    if (typeof i === 'number') {
      return i;
    }
    if (i === true) {
      return MEDIUM;
    }
    if (/none/i.test(i)) {
      return NONE;
    }
    if (/low/i.test(i)) {
      return LOW;
    }
    if (/med|medium/i.test(i)) {
      return MEDIUM;
    }
    if (/high/i.test(i)) {
      return HIGH;
    }
    return LOW;
  };

  var generateServices = function(opts, cb) {
    var interactivity = opts.interactivity;
    var cwd = opts.cwd;
    var framework = opts.framework;

    var services = [defineService('1st service', interactivity, {
      name: 'service1',
      framework: framework || 'hapi',
      appendToCompose: true
    })];

    if (interactivity <= LOW) {
      services.push(defineService('2nd service', interactivity, {
        name: 'service2',
        framework: framework,
        appendToCompose: true
      }));
    }

    if (interactivity >= MEDIUM) {
      while (ask(inq('add another service?', ['y', 'n']))) {
        services.push(defineService(ord(services.length + 1) + ' service', interactivity, {
          name: 'service' + (services.length + 1),
          framework: framework,
          appendToCompose: true
        }));
      }
    }

    services = services.map(function(service) {
      return function(cb) {
        process.chdir(cwd);
        createService(service, cwd + path.sep + service.name, cb);
      };
    });

    services.push(genAPI);
    services.push(genSite);

    series(services, cb);

    function genAPI(cb) {
      fs.mkdirSync(cwd + '/api');
      var hapiEnv = createEnv({
        cwd: cwd + '/api'
      });

      runYo(hapiEnv, 'fuge:rest', {
        name: 'api',
        framework: framework
      }, function() {
        console.log('');
        console.log('system generated !!');
        console.log('spin it up with : fuge run ./fuge/compose-dev.yml');
        console.log('');
        console.log('Have an awesome day, you\'re welcome.');
        cb();
      });
    }

    function genSite(cb) {
      fs.mkdirSync(cwd + '/site');
      var hapiEnv = createEnv({
        cwd: cwd + '/site'
      });

      runYo(hapiEnv, 'fuge:static', {
        name: 'site',
        framework: framework
      }, function() {
        console.log('');
        console.log('system generated !!');
        console.log('spin it up with : fuge run ./fuge/compose-dev.yml');
        console.log('');
        console.log('Have an awesome day, you\'re welcome.');
        cb();
      });
    }
  };

  var generateSystem = function(args, cb) {
    var cwd = process.cwd();
    var interactivity = determineInteractivity(args.i);

    var framework = (interactivity && interactivity <= MEDIUM) ?
      frameworkSelection('Web') :
      'hapi';

    var fuge = path.join(cwd, 'fuge');
    fs.mkdirSync(fuge);
    runYo(createEnv({
      cwd: fuge
    }), 'fuge', {
      name: 'fuge'
    }, function() {
      generateServices({
        cwd: cwd,
        framework: framework,
        interactivity: interactivity
      }, cb);
    });
  };

  return {
    generateSystem: generateSystem,
    generateService: generateService
  };
};

