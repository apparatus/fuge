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

var generators = Object.keys(require('./package.json').dependencies)
  .filter(function (dep) { return /generator-/.test(dep)})
  .map(function(gen) { return gen.replace(/generator-/, '') });

var NONE = 0;
var LOW = 1;
var MEDIUM = 2;
var HIGH = 3;

module.exports = function() {
  var runYo = util.runYo;
  var locateGenerator = util.locateGenerator;
  var series = util.series;
  var inq = util.inq;

  var composeDev = path.join(process.cwd(), 'fuge', 'compose-dev.yml');

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
    return ('__SERVICE__:\n' + 
           '  build: ../__SERVICE__/\n' + 
           '  container_name: __SERVICE__\n').replace(/__SERVICE__/g, name);
  }

  var transportSelection = function transportSelection(label, opts) {
    label = label || 'System';
    opts = opts || {};
    var def = opts.def = opts.def || 'http';
    var mixed = opts.mixed = 'mixed' in opts ? opts.mixed : true;

    var transports = ['http', 'redis'];
    if (mixed) transports.push('mixed');
    var transport = prompt(inq(label + ' transport', transport, transports)) || def;

    if (!~transports.indexOf(transport)) return transportSelection(label, def, opts);
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

      if (appendToCompose && fs.existsSync(composeDev)) {
        fs.appendFileSync(composeDev, definition);
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
    var srv = {
      name: 'service-' + (Math.random() * 1e17).toString(32).substr(6), 
      transport: 'http', 
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
      transport: transport, 
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
    generateService: generateService
  };
};

