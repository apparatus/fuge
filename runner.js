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

var _ = require('lodash')
var runner


module.exports = function () {
  var previewSystem = function (system, config) {
    runner = require('fuge-runner')(config)
    runner.previewAll(system, function (err, result) {
      if (err) { return console.log(err) }
      _.each(result, function (command) {
        var env = ''
        console.log('executing: ' + command.detail.cmd)
        console.log('  in directory: ' + command.detail.cwd)
        _.each(_.keys(command.detail.environment), function (key) {
          env += '    ' + key + '=' + command.detail.environment[key] + '\n'
        })
        console.log('  with environment:\n' + env)
      })
    })
  }


  var buildSystem = function (system, config, cb) {
    runner = require('fuge-runner')(config)
    runner.buildAll(system, function (err) {
      cb(err)
    })
  }


  var pullSystem = function (system, config, cb) {
    runner = require('fuge-runner')(config)
    runner.pullAll(system, function (err) {
      cb(err)
    })
  }


  var cloneRepo = function (name, cb) {
    runner = require('fuge-runner')()
    runner.generate(name, function (err) {
      cb(err)
    })
  }


  return {
    previewSystem: previewSystem,
    buildSystem: buildSystem,
    pullSystem: pullSystem,
    cloneRepo: cloneRepo
  }
}
