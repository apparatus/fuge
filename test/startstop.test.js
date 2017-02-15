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

var runner = require('./helpers/runner')()
var assert = require('assert')

var startOne = {cmds: ['start runme', 'ps'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
var stopOne = {cmds: ['stop runme', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
var startAll = {cmds: ['start all', 'ps'], expect: [/runme.*node.*running.*no.*yes/g, /runmetoo.*process.*running.*no.*yes/g]}
var stopAll = {cmds: ['stop all', 'ps'], expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}

console.log('basic test')

runner.start('system.yml', function () {

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
})

/*

    {
      command: 'stop',
      action: stopProcess,
      description: 'stop process instance and watcher'
    },
    {
      command: 'start',
      action: startProcess,
      description: 'start processe with watch'
    },
    {
      command: 'debug',
      action: debugProcess,
      description: 'start a process in debug mode'
    },

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
