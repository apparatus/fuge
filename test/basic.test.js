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
  // startOne: {cmds: ['tail all', 'start runme', 'ps', 'stop runme', 'ps', 'tail all'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]},
  startOne: {cmds: ['tail all', 'start runme', 'ps', 'tail all'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]},
  startAll: {cmds: ['start all', 'ps', 'stop all'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*running.*no.*yes/g]},
  grep: {cmds: ['start all', 'grep runme Server', 'grep Server', 'stop all'], expect: [/Server running at http/g]},

  watch: {cmds: ['unwatch all', 'watch all', 'unwatch runmetoo', 'watch runme', 'ps'], expect: [/runme.*node.*stopped.*yes.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
}

// breaks when running dns ????
//
// major issue here
// appears to just bomb out whenever a stop command is executed ????
//
// this appears to be an issue with vorpal
// interference between vorpal tap and fuge runner appears to be the issue - does vorpal fuck with child process or is it a node compat issue
//
// vopal was introduced to help with command history
//
// rip the fuckker out and use readline
//
// A+++ get rid of vorpal
//
// look at commit logs and pull down the old readline code
// then plug that back into shell -> 1 day but worth it 
// also have conrtol over prompt etc...
//
// should be able to do full tap testing then
//

runner.start('system.yml', function () {

//  setTimeout(function () {
  async.eachSeries(Object.keys(scenarios), function (key, next) {
    runner.run(scenarios[key], function (result, output) {
      assert(result, 'check ' + key + ' results as expected')
      next()
    })
  }, function () {
    runner.end()
  })
//  }, 1000)
})


/********
 *


    {
      command: 'grep',
      action: grepLogs,
      description: 'searches logs for specific process or all logs'
    },

    {
      command: 'zone',
      action: printZone,
      description: 'displays dns zone information if enabled'
    },

    {
      command: 'pull',
      action: pullRepositories,
      description: 'performs a git pull command for all artifacts with a defined repository_url setting'
    },
    {
      command: 'test',
      action: testRepositories,
      description: 'performs a test command for all artifacts with a defined test setting'
    },
    {
      command: 'status',
      action: statRepositories,
      description: 'performs a git status and git branch command for all artifacts with a defined repository_url setting'
    },

  ]
*/
