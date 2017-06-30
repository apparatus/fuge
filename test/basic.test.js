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

var async = require('async')
var runner = require('./helpers/runner')()
var assert = require('assert')

var scenarios = {
  ps: {cmds: ['ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]},
  info: {cmds: ['info runme', 'info runmetoo full'], expect: [/node runme\.js/g, /RUNME_SERVICE_PORT=8000/g]},
  help: {cmds: ['help'], expect: [/turn on watching for a process/g]},
  zone: {cmds: ['zone'], expect: [/SRV.*_main\._tcp\.runme.*runme.*8000/g]},
  tail: {cmds: ['untail all', 'tail all', 'untail runmetoo', 'tail runme', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*no/g]},
  startStop: {cmds: ['start runme', 'ps', 'stop runme'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*no/g]},
  startStopAll: {cmds: ['start all', 'ps', 'stop all'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*running.*no.*no/g], delay: 1000},
  restart: {cmds: ['start runme', 'restart runme', 'ps', 'stop runme'], expect: [/runme.*node.*running.*no.*yes/g], delay: 1000},
  grep: {cmds: ['grep Server runme'], expect: [/Server running at http/g]},
  grepAll: {cmds: ['grep Server'], expect: [/Server running at http/g]},
  debug: {cmds: ['debug runme', 'ps', 'stop runme'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*no/g], delay: 1000},
  watch: {cmds: ['watch runme', 'unwatch runme', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*no/g]},
  pull: {cmds: ['pull runme', 'pull all'], expect: [/no repository url specified or duplicate url/g]},
  test: {cmds: ['test runme', 'test all'], expect: [/no test script specified/g]},
  stat: {cmds: ['status runme', 'status all'], expect: [/no repository url specified or duplicate url/g]}
}

runner.start('system.yml', function () {
  async.eachSeries(Object.keys(scenarios), function (key, next) {
    runner.run(scenarios[key], function (result, output) {
      assert(result, 'check ' + key + ' results as expected')
      next()
    })
  }, function () {
    runner.runSingle('pull', function () {
      runner.runSingle('wibble', function () {
        runner.end()
      })
    })
  })
})

