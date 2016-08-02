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
var CleanupHandler = require('death')
var CliTable = require('cli-table')
var procList = []
require('colors')


/**
 * fuge run -> executes through here - runs all and starts a log tail
 * hitting any key will stop the tail
 * need a command history
 */
module.exports = function () {
  var _config
  var _runner
  var _proxy
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
      process.exit(0)
    })
  }


  var autoComp = function (system) {
    _.each(system.topology.containers, function (container) {
      procList.push(container.name)
    })
  }


  var psList = function (args, system, cb) {
    var table = new CliTable({chars: tableChars, style: tableStyle,
                              head: ['name'.white, 'type'.white, 'status'.white, 'watch'.white, 'tail'.white, 'count'.white], colWidths: [30, 15, 15, 15, 15, 5]})
    var procs = _runner.processes()
    var counts = _.countBy(_.keys(procs), function (key) { return procs[key].identifier })

    _.each(system.topology.containers, function (container) {
      if (!(container.name === '__proxy' || container.type === 'blank-container')) {
        if (container.type === 'docker' && _config.runDocker === false) {
          table.push([container.name.gray, container.type.gray, 'not managed'.gray, '', ''])
        } else {
          var procKey = _.find(_.keys(procs), function (key) { return procs[key].identifier === container.name })
          if (procKey) {
            var proc = procs[procKey]
            table.push([container.name.green,
                        container.type.green,
                        container.profiling ? 'profiling'.green : 'running'.green,
                        proc.monitor ? 'yes'.green : 'no'.red,
                        proc.tail ? 'yes'.green : 'no'.red,
                        counts[container.name] ? ('' + counts[container.name]).green : '0'.red])
          } else {
            table.push([container.name.red,
                        container.type.red,
                        'stopped'.red,
                        container.monitor ? 'yes'.green : 'no'.red,
                        container.tail ? 'yes'.green : 'no'.red,
                        '0'.red])
          }
        }
      }
    })
    console.log(table.toString())
    cb()
  }


  var proxy = function (args, system, cb) {
    _proxy.previewAll(system, cb)
  }


  var showInfo = function (args, system, cb) {
    if (args.length === 2) {
      _runner.preview(system, args[1], function (err, command) {
        if (err) { cb(err) }
        if (command && command.detail) {
          var env = ''
          console.log('command: ' + command.detail.cmd)
          console.log('directory: ' + command.detail.cwd)
          _.each(_.keys(command.detail.environment), function (key) {
            env += '  ' + key + '=' + command.detail.environment[key] + '\n'
          })
          console.log('environment:\n' + env)
        } else {
          console.log('not managed or unknown process')
        }
        cb()
      })
    } else {
      cb('process not specified')
    }
  }


  var stopProcess = function (args, system, cb) {
    if (args.length === 1 && args[0] === 'exit') {
      stopSystem(system)
    } else if (args.length === 1 || args[1][0] === 'all') {
      _runner.stopAll(system, cb)
    } else {
      for (var i = 0; i < args[1].length; i++) {
        if (_.includes(procList, args[1][i])) {
          _runner.stop(system, args[1][i], 1, cb)
        }
      }
    }
  }


  var startProcess = function (args, system, cb) {
    if (args.length === 1 || args[1][0] === 'all') {
      _runner.startAll(system, args[2] || 1, cb)
    } else {
      for (var i = 0; i < args[1].length; i++) {
        _runner.start(system, args[1][i], 1, cb)
      }
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

  var profileProcess = function (args, system, cb) {
    if (!_runner.isProcessRunning(args.process)) {
      _runner.profile(system, args, cb)
    } else {
      console.log('process already running - terminate to profile')
      cb()
    }
  }

  var profileOptions = function (cmd) {
    cmd
      .option('--preview', 'Generates an SVG file, prerenders SVG inside HTML and outputs a PNG to the terminal (if possible) Depends on imagemagick (brew install imagemagick) If using iTerm 2.9+ image will be output to terminal Warning - depending on the amount of stacks this option can take tens of seconds')
      .option('--delay, -d <delay>', 'Milliseconds. Delay before tracing begins (or before stacks are processed in the Linux case), allows us to ignore initialisation stacks (e.g. module loading).')
      .option('--langs, -l', 'Color code the stacks by JS and C.')
      .option('--tiers, -t', 'Overrides langs, Color code frames by type')
      .option('--exclude, -x <list>', 'Exclude tiers or langs, comma seperated list',
        ['v8', 'regexp', 'nativeC', 'nativeJS', 'core', 'deps', 'app', 'js', 'c'])
      .option('--include <list>', 'Include tiers, Overwrites exclude. Really only useful for including the v8 tier (which is excluded by default).',
        ['v8', 'regexp', 'nativeC', 'nativeJS', 'core', 'deps', 'app', 'js', 'c'])
      .option('--theme <type>', 'Dark or Light theme, default: dark', ['dark', 'light'])
      .option('--stacks-only', 'Don\'t generate the flamegraph, only create the stacks output. If assigned to stacks output will come through stdout. Use this in combination with the -c gen argument to generate the flamegraph from raw stacks.',
        ['false', 'true', '-'])
      .option('--trace-info', 'Show output from dtrace or perf tools')
      .option('--cmd, -c', 'Run a "0x command", possible commands are help and gen.',
        ['help', 'gen'])
      .option('--timestamp-profiles', 'Adds the current timestamp to the Profile Folder\'s name minimizing collisions for in containerized environments')
  }


  var watchProcess = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.watchAll(system)
    } else if (args.length >= 2) {
      err = _runner.watch(system, args[1])
    }
    cb(err)
  }


  var unwatchProcess = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.unwatchAll(system)
    } else if (args.length >= 2) {
      err = _runner.unwatch(system, args[1])
    }
    cb(err)
  }


  var tailProcess = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.tailAll(system)
    } else if (args.length >= 2) {
      err = _runner.tail(system, args[1], args[2] || 0)
    }
    cb(err)
  }


  var untailProcess = function (args, system, cb) {
    var err = null
    if (args.length === 1 || args[1] === 'all') {
      _runner.untailAll(system)
    } else if (args.length >= 2) {
      err = _runner.untail(system, args[1])
    }
    cb(err)
  }


  var grepLogs = function (args, system, cb) {
    if (args[1]) {
      if (args[1].length === 1 || args[1][1] === 'all') {
        _runner.grepAll(system, _config, args[1], cb)
      } else if (args[1].length > 1) {
        _runner.grep(args[1][1], _config, args[1][0], cb)
      }
    } else {
      cb()
    }
  }


  var sendMessage = function (args, system, cb) {
    console.error('not implemented')
    cb()
  }


  var commands = [
    {
      command: 'ps',
      action: psList,
      description: 'list managed processes and containers'
    },
    {
      command: 'proxy',
      action: proxy,
      description: 'list proxy status and port forwarding'
    },
    {
      command: 'info',
      action: showInfo,
      description: 'list environment block injected into each process'
    },
    {
      command: 'stop',
      action: stopProcess,
      description: 'stop [count] process instances and watchers'
    },
    {
      command: 'start',
      action: startProcess,
      description: 'start [count] processes with watch'
    },
    {
      command: 'debug',
      action: debugProcess,
      description: 'start a process in debug mode'
    },
    {
      command: 'profile',
      action: profileProcess,
      description: 'start a process with the profiler (0x)'
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
      command: 'send',
      action: sendMessage,
      description: 'sends a message to a specific process'
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
          if (command === 'profile') {
            return action(args, system, cb)
          }

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

      if (command === 'profile') {
        profileOptions(cmd)
      }
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
    vorpal.delimiter('?'.green + ' fuge>'.bold).show()

    var exit = vorpal.find('exit') // override built in exit command
    if (exit) {
      exit.remove()
    }

    autoComp(system) // add all process to autocomplete

    // creates a vorpal instance for each object in commands
    commands.forEach(function (com) {
      if (com.command === 'watch' || com.command === 'unwatch' ||
        com.command === 'info' || com.command === 'tail' || com.command === 'untail') {
        inputStructure(com.command, '[process]', com.description, com.action, system)
      } else if (com.command === 'debug') {
        inputStructure(com.command, '<process>', com.description, com.action, system)
      } else if (com.command === 'start' || com.command === 'stop' || com.command === 'exit' || com.command === 'grep') {
        inputStructure(com.command, '[process...]', com.description, com.action, system)
      } else if (com.command === 'profile') {
        inputStructure(com.command, '<process>', com.description, com.action, system)
      } else if (com.command === 'send') {
        inputStructure(com.command, '<process> <message>', com.description, com.action, system)
      } else {
        inputStructure(com.command, null, com.description, com.action, system)
      }
    })
  }


  var run = function (system, config) {
    _config = config
    _runner = require('fuge-runner')(_config)
    _proxy = require('fuge-proxy')(_config)

    CleanupHandler(function () {
      stopSystem(system)
    })

    console.log('starting proxy...')
    _proxy.startAll(system, function (err) {
      if (err) { console.log(err); process.exit(0) }
      console.log('starting shell..')
      repl(system)
    })
  }


  var runSingleCommand = function (system, config, command) {
    _config = config
    _runner = require('fuge-runner')(_config)
    _proxy = require('fuge-proxy')(_config)

    CleanupHandler(function () {
      stopSystem(system)
    })

    console.log('starting proxy...')
    _proxy.startAll(system, function (err) {
      if (err) { console.error(err); process.exit(0) }

      var commandName = command.split(' ')[0]
      var commandArgs = command.split(' ').slice(1)
      var cmd = _.find(commands, { command: commandName })
      if (!cmd) { console.error('Unknown command:', cmd); process.exit(0) }
      cmd.action([commandName, commandArgs], system, function (err) {
        if (err) { console.error(err) }
      })
    })
  }


  return {
    run: run,
    runSingleCommand: runSingleCommand
  }
}
