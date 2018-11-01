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

var fs = require('fs')
var path = require('path')
var fcfg = require('fuge-config')()
var yaml = require('js-yaml')
var _ = require('lodash')

module.exports = function () {

  var compile = function (args, cb) {
    var yamlPath = path.resolve(args[0] || path.join(process.cwd(), 'fuge.yml'))
    var logPath

    if (args[0]) {
      logPath = path.resolve(path.join(path.dirname(args[0]), 'log'))
    } else {
      logPath = path.resolve(path.join(process.cwd(), 'log'))
    }

    if (!fs.existsSync(yamlPath)) {
      return console.log('path not found: ' + yamlPath)
    }

    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath)
    }

    fcfg.load(yamlPath, function (err, system) {
      if (err) { return cb(err) }
      system.global.log_path = logPath
      cb(err, system)
    })


  }



 // array of container names that have been changed in yml file
  var findChanged = function (changedProcesses, currentYmlConfig, newYmlConfig, cb) {
    changedProcesses = []
    var isGlobal = false
    try {
      newYmlConfig = yaml.safeLoad(fs.readFileSync(process.env.yamlPath, 'utf8'))
    } catch (err) {
      console.log(err)
    }
    _.each(Object.keys(currentYmlConfig), function (name) {
      if (JSON.stringify(Object.values(currentYmlConfig[name])) !== JSON.stringify(Object.values(newYmlConfig[name]))) {
      // if(err){cb(err)}
        changedProcesses.push(name)
        if (name === 'fuge_global') { isGlobal = true }
      }
    })

    if (changedProcesses.length > 0) {
      if (isGlobal === true) { console.log('You have changed a global variable so all processes will need to be restarted.') }
      console.log('There are changed values in:  ' + changedProcesses)
      console.log('Do you want to apply these changes? (y/n)')
      return changedProcesses
    } else {
      console.log('No changes in yml file')
    }
    currentYmlConfig = newYmlConfig
  }



  function isDisabled (system) {
    _.each(system.topology.containers, function (container) {
      if (container.path === null) {
        container.status = 'disabled'
      } else { container.status === 'enabled' }
    })
  }



  return {
    compile: compile,
    findChanged: findChanged,
    isDisabled: isDisabled
  }
}
