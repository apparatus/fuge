/* eslint indent: ["error", 2, {"ObjectExpression": "first"}] */
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
  help: {cmds: ['help'], expect: [/turn on watching for a process/g]},
  tail: {cmds: ['unwatch all', 'untail all', 'tail all', 'untail runmetoo', 'tail runme', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*no/g]},
  startOne: {cmds: ['tail all', 'start runme', 'ps', 'stop runme'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]},

  watch: {cmds: ['unwatch all', 'watch all', 'unwatch runmetoo', 'watch runme', 'ps', 'unwatch all'], expect: [/runme.*node.*stopped.*yes.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]},
//  startOne: {cmds: ['start runme', 'ps', 'stop all'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
//  stopOne: {cmds: ['stop runme', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
//  startAll: {cmds: ['start all', 'ps'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*running.*no.*yes/g]},
//  stopAll: {cmds: ['stop all', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
}

runner.start('system.yml', function () {

  async.eachSeries(Object.keys(scenarios), function (key, next) {
    runner.run(scenarios[key], function (result, output) {
      assert(result, 'check ' + key + ' results as expected')
      next()
    })
  }, function () {
    console.error('CALLING END')
    runner.end()
  })

    /*
  runner.run(ps, function (result, output) {
    assert(result, 'check ps results as expected')
  })

  runner.run(help, function (result, output) {
    assert(result, 'check help results as expected')
  })

  runner.run(watch, function (result, output) {
    assert(result, 'check watch results as expected')
  })

  runner.run(tail, function (result, output) {
    assert(result, 'check tail results as expected')
  })

  runner.run(startOne, function (result, output) {
    assert(result, 'check start single process')
  })

  runner.run(stopOne, function (result, output) {
    assert(result, 'check stop single process')
  })

  runner.run(startAll, function (result, output) {
    assert(result, 'check start all')
  })

  runner.run(stopAll, function (result, output) {
    assert(result, 'check stop all')
    runner.end()
  })
    */
})

