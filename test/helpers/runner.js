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

var path = require('path')
var shell = require('../../shell')(false)
var util = require('../../util')()
var async = require('async')


module.exports = function () {
  var rl
  var sys

  function start (configFile, cb) {
    var args = [path.join(__dirname, '..', 'fixtures', 'system', 'fuge', configFile)]
    util.compile(args, function (err, system) {
      sys = system
      if (err) { console.error(err); return cb(err) }
      shell.run(system, function (readl) {
        rl = readl
        setTimeout(cb, 500)
      })
    })
  }


  function end () {
    rl.write('exit\n')
  }


  function run (command, cb) {
    var _log = console.log
    var captured = ''

    console.log = function (text) {
      captured += text
    }

    async.eachSeries(command.cmds, function (cmd, next) {
      rl.write(cmd + '\n')
      if (command.delay) {
        setTimeout(next, command.delay)
      } else {
        setTimeout(next, 100)
      }
    }, function () {
      var result = false
      var count = 0

      captured.split('\n').forEach(function (line) {
        command.expect.forEach(function (re) {
          if (re.test(line)) {
            count++
          }
        })
        result = count === command.expect.length
      })
      console.log = _log
      cb(result, captured)
    })
  }


  function runSingle (cmd, cb) {
    shell.runSingleCommand(sys, cmd)
    setTimeout(cb, 500)
  }


  return {
    start: start,
    run: run,
    runSingle: runSingle,
    end: end
  }
}

