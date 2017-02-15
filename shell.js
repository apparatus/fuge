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
var Vorpal = require('vorpal')
var CliTable = require('cli-table')
var procList = []
var FugeDns = require('fuge-dns')
require('colors')


/**
 * fuge run -> executes through here - runs all and starts a log tail
 * hitting any key will stop the tail
 * need a command history
 */
module.exports = function () {
  var _runner
  var _dns = null
  var vorpal = new Vorpal()

  var tableChars = {
    'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
    'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
    'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
    'right': '', 'right-mid': '', 'middle': ''
  }

  var tableStyle = {
    'padding-left': 0,
    'padding-right': 0
  }



  var stopSystem = function (system) {
    _runner.stopAll(system, function () {
      if (_dns) { _dns.stop() }
      console.error('TIMEOUT')
      setTimeout(function () {
        console.error('DONE')
        process.exit(0)
      }, 2000)
    })
  }


  var autoComp = function (system) {
    _.each(system.topology.containers, function (container) {
      procList.push(container.name)
    })
  }


  var psList = function (args, system, cb) {
    var table = new CliTable({chars: tableChars, style: tableStyle, head: ['name'.white, 'type'.white, 'status'.white, 'watch'.white, 'tail'.white], colWidths: [30, 15, 15, 15, 15]})

    _.each(system.topology.containers, function (container) {
      if (container.type === 'container' && system.global.run_containers === false) {
        table.push([container.name.gray, container.type.gray, 'not managed'.gray, '', ''])
      } else {
        if (container.process && container.process.flags.running) {
          table.push([container.name.green,
            container.type.green,
            'running'.green,
            container.monitor ? 'yes'.green : 'no'.red,
            container.tail ? 'yes'.green : 'no'.red])
        } else {
          table.push([container.name.red,
            container.type.red,
            'stopped'.red,
            container.monitor ? 'yes'.green : 'no'.red,
            container.tail ? 'yes'.green : 'no'.red])
        }
      }
    })
    if (_dns) {
      table.push(['dns'.green,
        'internal'.green,
        'running'.green,
        'no'.red,
        'no'.red])
    }
    console.log(table.toString())
    cb()
  }



  var showInfo = function (args, system, cb) {
    if (args[1]) {
      if (args[1].length === 1) {
        _runner.preview(system, args[1][0], 'short', cb)
      } else if (args[1].length === 2 && args[1][1] === 'full') {
        _runner.preview(system, args[1][0], 'full', cb)
      }
    } else {
      cb()
    }
  }


  var stopProcess = function (args, system, cb) {
    if (args.length === 1 && args[0] === 'exit') {
      stopSystem(system)
    } else if (args.length === 1 || args[1][0] === 'all') {
      _runner.stopAll(system, cb)
    } else {
      _runner.stop(system, args[1][0], cb)
    }
  }


  var startProcess = function (args, system, cb) {
    if (args.length === 1 || args[1][0] === 'all') {
      _runner.startAll(system, cb)
    } else {
      _runner.start(system, args[1][0], cb)
    }
  }


  var debugProcess = function (args, system, cb) {
    if (args.length === 2) {
      if (!_runner.isProcessRunning(args[1])) {
        _runner.debug(system, args[1], cb)
      } else {
        console.log('process already running - terminate to debug')
        cb()
      }
    } else {
      cb()
    }
  }


  var watchProcess = function (args, system, cb) {
    if (args.length === 1 || args[1] === 'all') {
      _runner.watchAll(system, cb)
    } else if (args.length >= 2) {
      _runner.watch(system, args[1], cb)
    } else {
      cb(null)
    }
  }


  var unwatchProcess = function (args, system, cb) {
    if (args.length === 1 || args[1] === 'all') {
      _runner.unwatchAll(system, cb)
    } else if (args.length >= 2) {
      _runner.unwatch(system, args[1], cb)
    } else {
      cb(null)
    }
  }


  var tailProcess = function (args, system, cb) {
    if (args.length === 1 || args[1] === 'all') {
      _runner.tailAll(system)
    } else if (args.length >= 2) {
      _runner.tail(system, args[1])
    }
    cb(null)
  }


  var untailProcess = function (args, system, cb) {
    if (args.length === 1 || args[1] === 'all') {
      _runner.untailAll(system)
    } else if (args.length >= 2) {
      _runner.untail(system, args[1])
    }
    cb(null)
  }


  var grepLogs = function (args, system, cb) {
    if (args[1]) {
      if (args[1].length === 1) {
        _runner.grepAll(system, args[1][0], cb)
      } else {
        if (args[1].length === 2) {
          if (args[1][0] === 'all') {
            _runner.grepAll(system, args[1][1], cb)
          } else {
            _runner.grep(system, args[1][0], args[1][1], cb)
          }
        }
      }
    } else {
      cb()
    }
  }


  var pullRepositories = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.pullAll(system, cb)
    } else if (args.length >= 2) {
      err = _runner.pull(system, args[1], cb)
    }
    cb(err)
  }


  var testRepositories = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.testAll(system, cb)
    } else if (args.length >= 2) {
      err = _runner.test(system, args[1], cb)
    }
    cb(err)
  }


  var statRepositories = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.statAll(system, cb)
    } else if (args.length >= 2) {
      err = _runner.stat(system, args[1], cb)
    }
    cb(err)
  }


  var printZone = function (args, system, cb) {
    var table = new CliTable({chars: tableChars, style: tableStyle,
                              head: ['type'.white, 'domain'.white, 'address'.white, 'port'.white], colWidths: [10, 60, 60, 10]})

    var list = _dns.listRecords()
    _.each(list, function (entry) {
      if (entry.record._type === 'A') {
        table.push(['A'.white,
                    entry.domain.white,
                    entry.record.target.white,
                    '-'.white])
      }
      if (entry.record._type === 'SRV') {
        table.push(['SRV'.white,
                    entry.domain.white,
                    entry.record.target.white,
                    entry.record.port.white])
      }
    })
    console.log(table.toString())
    cb()

  }



  var commands = [
    {
      command: 'ps',
      action: psList,
      description: 'list managed processes and containers'
    },
    {
      command: 'info',
      action: showInfo,
      description: 'list environment block injected into each process'
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
    {
      command: 'exit',
      action: stopProcess,
      description: 'exit system or a single process'
    }
  ]


  var inputStructure = function (command, type, description, action, system) {
    // structures the commands and creates the vorpal instances
    var cmd
    if (type !== null && command !== 'exit') {
      cmd = vorpal
        .command(command + type)
        .autocomplete(procList)
        .description(description)
        .action(function (args, cb) {
          var opt = args.process // optional argument
          var arr = [command]

          if (command === 'send') {
            if (opt !== undefined) {
              for (var i = 0; i < opt.length; i++) {
                arr.push(opt[i])
              }
            }

            action(arr, system, cb)
          } else {
            if (opt !== undefined) {
              arr.push(opt)
            }

            action(arr, system, cb)
          }
        })

    } else if (command === 'exit') {
      vorpal
        .command(command + type)
        .alias('quit')
        .autocomplete(procList)
        .description(description)
        .action(function (args, cb) {
          var opt = args.process // optional argument
          var arr = [command]

          if (opt !== undefined) {
            arr.push(opt)
          }

          action(arr, system, cb)
        })
    } else {
      cmd = vorpal
        .command(command)
        .description(description)
        .action(function (args, cb) {
          var arr = [command]
          action(arr, system, cb)
        })
    }
  }


  var repl = function (system) {
    vorpal.delimiter(' fuge>'.bold).show()

    var exit = vorpal.find('exit')
    if (exit) {
      exit.remove()
    }

    autoComp(system)

    vorpal.sigint(function () {
      stopSystem(system)
    })

    require('death')({uncaughtException: true})(function (signal, err) {
      console.log('ERROR: ')
      console.log(signal)
      console.log(err)
      console.log('cleanup:')
      stopSystem(system)
    })

    commands.forEach(function (com) {
      if (com.command === 'watch' || com.command === 'unwatch' || com.command === 'tail' || com.command === 'untail' || com.command === 'pull' || com.command === 'test' || com.command === 'status') {
        inputStructure(com.command, '[process]', com.description, com.action, system)
      } else if (com.command === 'debug') {
        inputStructure(com.command, '<process>', com.description, com.action, system)
      } else if (com.command === 'start' || com.command === 'stop' || com.command === 'exit' || com.command === 'grep' || com.command === 'info') {
        inputStructure(com.command, '[process...]', com.description, com.action, system)
      }  else if (com.command === 'send') {
        inputStructure(com.command, '<process> <message>', com.description, com.action, system)
      } else {
        inputStructure(com.command, null, com.description, com.action, system)
      }
    })
  }


  var run = function (system) {
    _runner = require('fuge-runner')()

    if (system.global.dns_enabled) {
      console.log('starting fuge dns [' + system.global.dns_host + ':' + system.global.dns_port + ']..')
      _dns = FugeDns({host: system.global.dns_host, port: system.global.dns_port})
      _dns.addZone(system.global.dns)
      _dns.start(function () {
        console.log('ok')
        console.log('starting shell..')
        repl(system)
      })
    } else {
      console.log('starting shell..')
      repl(system)
    }
    return vorpal
  }


  var runSingleCommand = function (system, command) {
    _runner = require('fuge-runner')()

    require('death')({uncaughtException: true})(function () {
      stopSystem(system)
    })

    var commandName = command.split(' ')[0]
    var commandArgs = command.split(' ').slice(1)
    var cmd = _.find(commands, { command: commandName })

    if (!cmd) {
      console.error('Unknown command:', cmd)
      process.exit(0)
    }

    commandArgs.unshift(commandName)
    cmd.action(commandArgs, system, function (err) {
      if (err) { console.error(err) }
    })
  }



  return {
    run: run,
    runSingleCommand: runSingleCommand
  }
}

