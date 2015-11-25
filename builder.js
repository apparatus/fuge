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
var runner = require('fuge-runner')();
var xeno = require('xenotype')();



module.exports = function() {

  var applyOverrides = function(system, overrides) {
    _.each(_.keys(system.topology.containers), function(key) {
      var container = system.topology.containers[key];
      if (overrides[container.name]) {
        if (overrides[container.name].build) {
          console.log('overriding build command for: ' + container.name + ' to: ' + overrides[container.name].build);
          container.specific.buildScript = overrides[container.name].build;
        }
      }
    });
  };



  var buildSystem = function(args) {
    var yamlPath = args[0] || process.cwd() + '/docker-compose.yml';
    var overridePath = (path.dirname(args[0]) || process.cwd()) + '/fuge-config.js';
    var overrides = {};

    if (fs.existsSync(overridePath)) {
      overrides = require(process.cwd() + '/' + overridePath).overrides;
    }

    if (!fs.existsSync(yamlPath)) {
      return console.log('path not found: ' + yamlPath);
    }

    xeno.compile(yamlPath, function(err, system) {
      if (err) { return console.log(err); }
      applyOverrides(system, overrides);
      runner.build(system, function(err) {
        if (err) { return console.log(err); }
      });
    });
  };



  return {
    buildSystem: buildSystem
  };
};

