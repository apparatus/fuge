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
var _ = require('lodash');
var xeno = require('xenotype')();



module.exports = function() {

  var applyOverrides = function(system, config) {
    _.each(_.keys(system.topology.containers), function(key) {
      var container = system.topology.containers[key];
      if (config && config.overrides && config.overrides[container.name]) {
        if (config.overrides[container.name].run) {
          console.log('overriding run command for: ' + container.name + ' to: ' + config.overrides[container.name].run);
          container.specific.execute.exec = config.overrides[container.name].run;
        }
      
        if (config.overrides[container.name].build) {
          console.log('overriding build command for: ' + container.name + ' to: ' + config.overrides[container.name].build);
          container.specific.buildScript = config.overrides[container.name].build;
        }
      }

      if (config && config.tail) {
        container.tail = true;
      }

      if (config && config.monitor) {
        container.monitor = true;
      }
    });
  };



  var compile = function(args, cb) {
    var yamlPath = args[0] || process.cwd() + '/docker-compose.yml';
    var configPath = (path.dirname(args[0]) || process.cwd()) + '/fuge-config.js';
    var config = {};

    if (fs.existsSync(configPath)) {
      config = require(process.cwd() + '/' + configPath);
    }

    if (!fs.existsSync(yamlPath)) {
      return console.log('path not found: ' + yamlPath);
    }

    config.logPath = (path.dirname(args[0]) || process.cwd()) + '/log';
    if (!fs.existsSync(config.logPath)) {
      fs.mkdirSync(config.logPath);
    }

    xeno.compile(yamlPath, function(err, system) {
      if (err) { return cb(err); }
      applyOverrides(system, config);
      cb(err, system, config);
    });
  };




  return {
    compile: compile,
  };
};

