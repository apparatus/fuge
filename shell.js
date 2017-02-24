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

var readline = require('readline')
var death = require('death')
require('colors')

var tpm = require('tpmorp')
var FugeDns = require('fuge-dns')
var FugeRunner = require('fuge-runner')

var cmds = require('./commands')()


module.exports = function (hardExit) {
  var system
  var runner
  var dns
  var morp
  var commands


  function stopSystem (args, system, cb) {
    runner.stopAll(system, function () {
      if (dns) { dns.stop() }
      if (morp) { morp.stop() }
      if (hardExit) {
        process.exit(0)
      } else {
        cb && cb()
      }
    })
  }


  function initCrashHandler (system) {
    // death({uncaughtException: true})(function (signal, err) {
    death({uncaughtException: false})(function (signal, err) {
      console.log('ERROR: '.red)
      console.log(('' + signal).red)
      if (err) { console.log(err.red) }
      console.log('cleanup...'.red)
      stopSystem(null, system, function () {})
    })
  }


  function repl () {
    initCrashHandler(system)

    morp = tpm(readline)

    var rl = morp.start('fuge> '.white, commands, function (err, command, args, line) {
      if (err) {
        if (line && line.length > 0) {
          cmds.shell(line, system, function (err) {
            if (err) { console.log(err.red) }
            morp.displayPrompt()
          })
        } else {
          morp.displayPrompt()
        }
      } else {
        command.action(args, system, function (err) {
          if (err) { console.log(err.red) }
          if (!command.isExit) {
            morp.displayPrompt()
          }
        })
      }
    })
    morp.displayPrompt()
    return rl
  }


  function initCommands (system, runner, dns) {
    commands = cmds.init(system, runner, dns)
    commands.exit = {action: stopSystem, description: 'exit fuge', isExit: true}
  }


  function run (sys, cb) {
    var rl

    system = sys
    runner = FugeRunner()

    if (system.global.dns_enabled) {
      console.log('starting fuge dns [' + system.global.dns_host + ':' + system.global.dns_port + ']..')
      dns = FugeDns({host: system.global.dns_host, port: system.global.dns_port})
      initCommands(system, runner, dns)
      dns.addZone(system.global.dns)
      dns.start(function () {
        console.log('starting shell..')
        rl = repl()
        cb && cb(rl)
      })
    } else {
      initCommands(system, runner, dns)
      console.log('starting shell..')
      rl = repl()
      cb && cb(rl)
    }
  }


  function runSingleCommand (sys, command) {
    system = sys
    runner = FugeRunner()

    initCommands(system, runner, null)

    if (['pull', 'status', 'test'].indexOf(command) !== -1) {
      commands[command].action(['all'], system, function (err) {
        if (err) { console.log(err.red) }
      })
    } else {
      console.log('unknown command'.red)
    }
  }


  return {
    run: run,
    runSingleCommand: runSingleCommand
  }
}

