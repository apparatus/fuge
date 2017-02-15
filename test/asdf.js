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
var test = require('tap').test

var ps = {cmd: 'ps', expect: [/runme.*node.*stopped.*no.*yes/g, /runmetoo.*process.*stopped.*no.*yes/g]}
var info = {cmd: 'info runme', expect: [/run: .*node runme.js/g]}

runner.start('system.yml', function () {

  test('ps and info test', function (t) {
    runner.run(ps, function (result) {
      t.equal(result, true, 'check ps results as expected')
      t.end()
    })
  })

  test('end', function (t) {
    runner.end(function () {
      t.pass()
      t.end()
    })
  })
})

/*
    {
      command: 'watch',
      action: watchProcess,
      description: 'turn on watching for a process'
    },
    {
      command: 'unwatch',
      action: unwatchProcess,
      description: 'turn off watching for a process'
    },
    {
      command: 'tail',
      action: tailProcess,
      description: 'tail output for all processes'
    },
    {
      command: 'untail',
      action: untailProcess,
      description: 'tail output for a specific processes'
    },


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
