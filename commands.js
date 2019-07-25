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
var CliTable = require('cli-table')
var util = require('./util')()
require('colors')


module.exports = function () {
  var _runner = null
  var _dns = null

  var tableChars = { 'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '', 'middle': '' }
  var tableStyle = { 'padding-left': 0, 'padding-right': 0 }

  var psList = function (args, system, cb) {
    if (args.length > 0) {
      return shellExecute('ps ' + args.join(' '), system, cb)
    }

    var table = new CliTable({chars: tableChars, style: tableStyle, head: ['name'.white, 'type'.white, 'group'.white, 'status'.white, 'watch'.white, 'tail'.white], colWidths: [30, 15, 15, 15, 15, 15]})

    _.each(system.topology.containers, function (container) {
      if (!container.group) { container.group = 'default' }
      if (container.type === 'container' && system.global.run_containers === false) {
        table.push([container.name.gray, container.type.gray, container.group.gray, 'not managed'.gray, '', ''])
      } else {
        if (container.process && container.process.flags.running) {
          table.push([container.name.green,
            container.type.green,
            container.group.green,
            'running'.green,
            container.monitor ? 'yes'.green : 'no'.red,
            container.tail ? 'yes'.green : 'no'.red])
        } else
        if (container.path === null || container.status === 'disabled') {
          table.push([container.name.gray,
            container.type.gray,
            container.group.gray,
            'disabled'.gray,
            container.monitor ? 'yes'.gray : 'no'.gray,
            container.tail ? 'yes'.gray : 'no'.gray])
        } else {
          table.push([container.name.red,
            container.type.red,
            container.group.red,
            'stopped'.red,
            container.monitor ? 'yes'.green : 'no'.red,
            container.tail ? 'yes'.green : 'no'.red])
        }
      }

    })
    if (_dns) {
      table.push(['dns'.green,
        'internal'.green,
        'other'.green,
        'running'.green,
        'no'.red,
        'no'.red])
    }
    console.log(table.toString())
    cb()

  }


  var showInfo = function (args, system, cb) {
    if (args.length > 0) {
      if (args.length === 1) {
        _runner.preview(system, args[0], 'short', cb)
      } else if (args.length === 2 && args[1] === 'full') {
        _runner.preview(system, args[0], 'full', cb)
      } else {
        cb('usage: info <process> [full]')
      }
    } else {
      cb('usage: info <process> [full]')
    }
  }



  function isGroup (args, system) {
    var isgroup = false
    _.each(system.topology.containers, function (container) {
      if (args[0] === container.group) {
        isgroup = true
      }
    })
    if (isgroup === true) {
      return true
    }
  }


  // separate isGroup function for grep, as it takes the second argument as the group
  function isGrepGroup (args, system) {
    var isgroup = false
    _.each(system.topology.containers, function (container) {
      if (args[1] === container.group) {
        isgroup = true
      }
    })
    if (isgroup === true) {
      return true
    }
  }


  var startProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (args[0] === 'all') { _runner.startAll(system, cb) } else
      if (isGroup(args, system)) { startGroup(args, system, cb) } else { _runner.start(system, args[0], cb) }
    } else {
      cb('usage: start <process> | <group> | all')
    }
  }


  var stopProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (args[0] === 'all') { _runner.stopAll(system, cb) } else
      if (isGroup(args, system)) { stopGroup(args, system, cb) } else { _runner.stop(system, args[0], cb) }
    } else {
      cb('usage: stop <process> | <group> | all')
    }
  }



  var restartProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) {
        restartGroup(args, system, cb)
      } else if (_runner.isProcessRunning(system, args[0])) {
        _runner.stop(system, args[0], function () {
          _runner.start(system, args[0], cb)
        })
      } else {
        cb('process not running!')
      }
    } else {
      cb('usage: restart <process>')
    }
  }


  function restartGroup (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        if (_runner.isProcessRunning(system, container.name)) {
          _runner.stop(system, container.name, function () {
            _runner.start(system, container.name, cb)
          })
        } else { cb('process not running!') }
      }
    })
  }


  var debugProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (!_runner.isProcessRunning(system, args[0])) {
        _runner.debug(system, args[0], cb)
      } else {
        cb('process already running - terminate to debug')
      }
    } else {
      cb('usage: debug <process>')
    }
  }


  var watchProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) { watchGroup(args, system, cb) } else
      if (args[0] === 'all') {
        _runner.watchAll(system, cb)
      } else {
        _runner.watch(system, args[0], cb)
      }
    } else {
      cb('usage: watch <process> | all')
    }
  }


  var unwatchProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) { unwatchGroup(args, system, cb) } else
      if (args[0] === 'all') {
        _runner.unwatchAll(system, cb)
      } else {
        _runner.unwatch(system, args[0], cb)
      }
    } else {
      cb('usage: unwatch <process> | all')
    }
  }


  function watchGroup (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.watch(system, container.name, cb)
      }
    })
  }


  function unwatchGroup (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.unwatch(system, container.name, cb)
      }
    })
  }


  var tailProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) { tailGroup(args, system, cb) } else
      if (args[0] === 'all') {
        _runner.tailAll(system, cb)
      } else {
        _runner.tail(system, args[0], cb)
      }
    } else cb('usage: tail <process> | <group> | all')
  }


  var untailProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) { untailGroup(args, system, cb) }
      if (args[0] === 'all') {
        _runner.untailAll(system, cb)
      } else {
        _runner.untail(system, args[0], cb)
      }
    } else {
      cb('usage: untail <process> | <group> | all')
    }
  }


  function tailGroup (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.tail(system, container.name, cb)
      }
    })
  }


  function untailGroup (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.untail(system, container.name, cb)
      }
    })
  }


  var grepLogs = function (args, system, cb) {
    if (args.length === 1) {
      _runner.grepAll(system, args[0], cb)
    } else if (args.length === 2) {
      if (isGrepGroup(args, system)) {
        grepGroup(args, system, cb)
      } else
      if (args[1] === 'all') {
        _runner.grepAll(system, args[0], cb)
      } else {
        _runner.grep(system, args[1], args[0], cb)
      }
    } else {
      cb('usage: grep <string> [<process> | <group> | all]')
    }
  }


  function grepGroup (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[1]) {
        _runner.grep(system, container.name, args[0], cb)
      }
    })
  }


  var pullRepositories = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) {
        pullGroupRepositories(args, system, cb)
      } else
      if (args[0] === 'all') {
        _runner.pullAll(system, cb)
      } else {
        _runner.pull(system, args[0], cb)
      }
    } else {
      cb('usage: pull <process> | <group> | all')
    }
  }


  function pullGroupRepositories (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.pull(system, container.name, cb)
      }
    })
  }


  var testRepositories = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) {
        testGroupRepositories(args, system, cb)
      } else {
        if (args[0] === 'all') {
          _runner.testAll(system, cb)
        } else {
          _runner.test(system, args[0], cb)
        }
      }
    } else cb('usage: test <process> | <group> | all')
  }


  function testGroupRepositories (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.test(system, container.name, cb)
      }
    })
  }


  var statRepositories = function (args, system, cb) {
    if (args.length === 1) {
      if (isGroup(args, system)) {
        statGroupRepositories(args, system, cb)
      } else {
        if (args[0] === 'all') {
          _runner.statAll(system, cb)
        } else {
          _runner.stat(system, args[0], cb)
        }
      }
    } else cb('usage: stat <process> | <group> | all')
  }


  function statGroupRepositories (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.stat(system, container.name, cb)
      }
    })
  }


  var printZone = function (args, system, cb) {
    var table = new CliTable({chars: tableChars, style: tableStyle, head: ['type'.white, 'domain'.white, 'address'.white, 'port'.white], colWidths: [10, 60, 60, 10]})

    if (_dns) {
      var list = _dns.listRecords()
      _.each(list, function (entry) {
        if (entry.record._type === 'A') {
          table.push(['A'.white, entry.domain.substring(0, 59).white, entry.record.target.substring(0, 59).white, '-'.white])
        }
        if (entry.record._type === 'SRV') {
          table.push(['SRV'.white, entry.domain.substring(0, 59).white, entry.record.target.substring(0, 59).white, entry.record.port.white])
        }
      })
      console.log(table.toString())
      cb()
    } else {
      cb('dns is not running, to enable add the dns_enabled setting to the config file')
    }
  }


  var shellExecute = function (command, system, cb) {
    _runner.shell(system, command, cb)
  }


  var applyCommand = function (args, system, cb) {
    _runner.apply(system, args.join(' '), cb)
  }


  var showHelp = function (args, system, cb) {
    var table = new CliTable({chars: tableChars, style: tableStyle, colWidths: [10, 100]})
    console.log('available commands:')
    Object.keys(_commands).forEach(function (key) {
      table.push([key, _commands[key].description])
    })
    table.push(['...', 'unmatched commands will be passed to the underlying shell for execution'])
    console.log(table.toString())
    cb()
  }


  var startGroup = function (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.start(system, container.name, cb)
      }
    })
  }


  var stopGroup = function (args, system, cb) {
    _.each(system.topology.containers, function (container) {
      if (container.group === args[0]) {
        _runner.stop(system, container.name, cb)
      }
    })
  }


  var _commands = {
    ps: {action: psList, description: 'list managed processes and containers, usage: ps'},
    info: {action: showInfo, sub: [], description: 'show process and container environment information, usage: info <process> [full]'},
    start: {action: startProcess, sub: [], description: 'start processes or group, usage: start <process> | <group> | all'},
    stop: {action: stopProcess, sub: [], description: 'stop process or group, usage: stop <process> | <group> | all'},
    restart: {action: restartProcess, sub: [], description: 'restart a process or group, usage: restart <process> | <group>'},
    debug: {action: debugProcess, sub: [], description: 'start a process in debug mode, usage: debug <process>'},
    watch: {action: watchProcess, sub: [], description: 'turn on watching for a process or group, usage: watch <process> | <group> | all'},
    unwatch: {action: unwatchProcess, sub: [], description: 'turn off watching for a process or group, usage: unwatch <process> | <group>  | all'},
    tail: {action: tailProcess, sub: [], description: 'tail output for processes or group, usage: tail <process> | <group> | all'},
    untail: {action: untailProcess, sub: [], description: 'stop tailing output for a specific processes or group, usage: untail <process> | <group> | all'},
    grep: {action: grepLogs, sub: [], description: 'searches logs for specific process or all logs, usage: grep <string> [<process> | <group> | all]'},
    zone: {action: printZone, description: 'displays dns zone information if enabled'},
    pull: {action: pullRepositories, sub: [], description: 'performs a git pull command for all artifacts with a defined repository_url setting,\n usage: pull <process> | <group> | all'},
    test: {action: testRepositories, sub: [], description: 'performs a test command for all artifacts with a defined test setting,\n usage: test <process> | <group> | all'},
    status: {action: statRepositories, sub: [], description: 'performs a git status and git branch command for all artifacts with a\n defined repository_url setting, usage: status <process> | <group> | all'},
    apply: {action: applyCommand, sub: [], description: 'apply a shell command to all processes'},
    help: {action: showHelp, description: 'show help on commands'}
  }


  function init (system, runner, dns) {
    _runner = runner
    _dns = dns
    util.isDisabled(system)

    var sub = Object.keys(system.topology.containers)
    Object.keys(_commands).forEach(function (key) {
      if (_commands[key].sub) {
        _commands[key].sub = sub
      }
    })
    return _commands
  }


  return {
    init: init,
    shell: shellExecute
  }
}

