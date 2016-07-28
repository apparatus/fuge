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

'use strict'

var Fs = require('fs')
var Path = require('path')
var _ = require('lodash')
var xeno = require('xenotype')()


module.exports = function () {
  var applyOverrides = function (system, config) {
    _.each(_.keys(system.topology.containers), function (key) {
      var container = system.topology.containers[key]
      if (config && config.overrides && config.overrides[container.name]) {
        if (config.overrides[container.name].run) {
          console.log('overriding run command for: ' + container.name + ' to: ' + config.overrides[container.name].run)
          container.specific.execute.exec = config.overrides[container.name].run
        }

        if (config.overrides[container.name].build) {
          console.log('overriding build command for: ' + container.name + ' to: ' + config.overrides[container.name].build)
          container.specific.buildScript = config.overrides[container.name].build
        }

        if (config.overrides[container.name].delay) {
          console.log('adding delay of ' + config.overrides[container.name].delay + 'ms for: ' + container.name)
          container.specific.execute.delay = config.overrides[container.name].delay
        }
      }

      if (config && config.tail) {
        container.tail = true
      }

      if (config && config.monitor) {
        container.monitor = true
      }
    })
  }

  var compile = function (args, cb) {
    var yamlPath = args[0] || process.cwd() + '/docker-compose.yml'
    var configPath = (Path.dirname(args[0]) || process.cwd()) + '/fuge-config.js'
    var config = {}

    if (Fs.existsSync(configPath)) {
      config = require(process.cwd() + '/' + configPath)
    }

    if (!Fs.existsSync(yamlPath)) {
      return console.log('path not found: ' + yamlPath)
    }

    config.logPath = (Path.dirname(args[0]) || process.cwd()) + '/log'
    if (!Fs.existsSync(config.logPath)) {
      Fs.mkdirSync(config.logPath)
    }

    xeno.compile(yamlPath, function (err, system) {
      if (err) { return cb(err) }
      applyOverrides(system, config)
      cb(err, system, config)
    })
  }

  return {
    compile: compile
  }
}
