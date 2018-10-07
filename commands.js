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
require('colors')


//mine

var fs = require('fs')
var yaml = require('js-yaml')
var path = require('path')
var fcfg = require('fuge-config/index')()
var processrunner = require('fuge-runner/lib/support/processRunner')()



module.exports = function () {
  var _runner = null
  var _dns = null

  var tableChars = { 'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '', 'middle': '' }
  var tableStyle = { 'padding-left': 0, 'padding-right': 0 }

  var defaultGroupArray=[]
  var namedGroupArray=[]

  var psList = function (args, system, cb) {
    if (args.length > 0) {
      return shellExecute('ps ' + args.join(' '), system, cb)
    }

    var table = new CliTable({chars: tableChars, style: tableStyle, head: ['name'.white, 'type'.white, 'group'.white, 'status'.white, 'watch'.white, 'tail'.white], colWidths: [30, 15, 15, 15, 15, 15]})

    _.each(system.topology.containers, function (container) {
     if(!container.group){container.group="default"}
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
        if (container.path===null){
          table.push([container.name.gray,
          container.type.gray,
          container.group.gray,
          'disabled'.gray,
          container.monitor ? 'yes'.gray : 'no'.gray,
          container.tail ? 'yes'.gray : 'no'.gray])
        } else
        {
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


  function groups (system){
     _.each(system.topology.containers, function (container) {
      if(!container.group){
         container.group='default'
      }
     })
  }


  function isGroup(args, system){
    var isgroup = false
    _.each(system.topology.containers, function (container) {
      if(args[0]===container.group){
        isgroup=true
      }
    })
    if (isgroup === true){
        return true}
  }


  //separate isGroup function for grep, as it takes the second argument as the group
  function isGrepGroup(args, system){
    var isgroup = false
    _.each(system.topology.containers, function (container) {
      if(args[1]===container.group){
        isgroup=true
      }
    })
    if (isgroup === true){
        return true}
  }


  var startProcess = function (args, system, cb) {
    console.log('\n\n SYS_TOP.. in start process ' + system.topology.containers['auditservice'].environment.SERVICE_PORT)
    console.log('START PROC  PROCESS>ENV PORT: '+ process.env.AUDITSERVICE_SERVICE_PORT)
    if (args.length === 1) {
      if (args[0] === 'all') { _runner.startAll(system, cb) } else
      if (isGroup(args, system))     { startGroup(args, system, cb) } else
      { _runner.start(system, args[0], cb) }
    } else {
      cb('usage: start <process> | <group> | all')}
  }


  var stopProcess = function (args, system, cb) {
    if (args.length === 1) {
      if (args[0] === 'all') { _runner.stopAll(system, cb) } else
      if (isGroup(args, system))     { stopGroup(args, system, cb) } else
      { _runner.stop(system, args[0], cb)}
    } else {
      cb('usage: stop <process> | <group> | all')}
  }



  var restartProcess = function (args, system, cb) {
       if (args.length === 1) {
        if (isGroup(args, system)){
          restartGroup(args, system, cb)
        }
        else if (_runner.isProcessRunning(system, args[0])) {
          _runner.stop(system, args[0], function () {
            _runner.start(system, args[0], cb)
          })
        } else {cb('process not running!')
          }
     } else {
      cb('usage: restart <process>')
    }
  }


  function restartGroup(args, system, cb){
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
        if (_runner.isProcessRunning(system, container.name)) {
          _runner.stop(system, container.name, function () {
            _runner.start(system, container.name, cb)
            })
        } else {cb('process not running!') }
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
      if (isGroup(args, system)) { watchGroup(args, system, cb) }
      else
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
      if (isGroup(args, system)) { unwatchGroup(args, system, cb) }
      else
      if (args[0] === 'all') {
        _runner.unwatchAll(system, cb)
      } else {
        _runner.unwatch(system, args[0], cb)
      }
    } else {
      cb('usage: unwatch <process> | all')
    }
  }


  function watchGroup(args, system, cb){
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.watch(system, container.name, cb)
      }
    })
  }


  function unwatchGroup(args, system, cb){
     _.each(system.topology.containers, function(container){
        if (container.group===args[0]){
           _runner.unwatch(system, container.name, cb)
        }
      })
    }


  var tailProcess = function (args, system, cb) {
    if (args.length === 1) {
      if(isGroup(args, system)){tailGroup(args, system, cb)}
      else
      if (args[0] === 'all') {
        _runner.tailAll(system, cb) }
      else {
        _runner.tail(system, args[0], cb)
      }
    } else cb('usage: tail <process> | <group> | all')
  }


  var untailProcess = function (args, system, cb) {
    if (args.length === 1) {
      if(isGroup(args, system)){untailGroup(args, system, cb)}
      if (args[0] === 'all') {
        _runner.untailAll(system, cb)
      } else {
        _runner.untail(system, args[0], cb)
      }
    } else {
      cb('usage: untail <process> | <group> | all')
    }
  }


  function tailGroup(args, system, cb){
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.tail(system, container.name, cb)
      }
    })
  }


  function untailGroup(args, system, cb){
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.untail(system, container.name, cb)
      }
    })
  }


  var grepLogs = function (args, system, cb) {
    if (args.length === 1) {
      _runner.grepAll(system, args[0], cb)
    } else if (args.length === 2) {
      if(isGrepGroup(args, system)){
        grepGroup(args, system, cb)}
      else
      if (args[1] === 'all') {
        _runner.grepAll(system, args[0], cb)
      } else {
        _runner.grep(system, args[1], args[0], cb)
      }
    } else {
      cb('usage: grep <string> [<process> | <group> | all]')
    }
  }


  function grepGroup(args, system, cb){
    _.each(system.topology.containers, function(container){
      if (container.group===args[1]){
         _runner.grep(system, container.name, args[0], cb)
      }
    })
  }


  var pullRepositories = function (args, system, cb) {
    if (args.length === 1) {
      if(isGroup(args, system)){pullGroupRepositories(args, system, cb)
      }else
      if (args[0] === 'all') {
        _runner.pullAll(system, cb)
      } else {
        _runner.pull(system, args[0], cb)
      }
    } else {
      cb('usage: pull <process> | <group> | all')
    }
  }


  function pullGroupRepositories(args, system, cb) {
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.pull(system, container.name, cb)
      }
    })
  }


  var testRepositories = function (args, system, cb) {
    if (args.length === 1) {
      if(isGroup(args, system)){testGroupRepositories(args, system, cb)
      }else{
      if (args[0] === 'all') {
        _runner.testAll(system, cb)
      } else {
        _runner.test(system, args[0], cb)
      }
      }
    }else  cb('usage: test <process> | <group> | all')
  }


  function testGroupRepositories(args, system, cb) {
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.test(system, container.name, cb)
      }
    })
  }


  var statRepositories = function (args, system, cb) {
    if (args.length === 1) {
      if(isGroup(args, system)){statGroupRepositories(args, system, cb)
      }else{
        if (args[0] === 'all') {
          _runner.statAll(system, cb)
        } else {
          _runner.stat(system, args[0], cb)
        }
      }
    }else   cb('usage: stat <process> | <group> | all')
  }


  function statGroupRepositories(args, system, cb) {
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
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
          table.push(['A'.white, entry.domain.white, entry.record.target.white, '-'.white])
        }
        if (entry.record._type === 'SRV') {
          table.push(['SRV'.white, entry.domain.white, entry.record.target.white, entry.record.port.white])
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
        _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.start(system, container.name, cb)
      }
    })
  }


  var stopGroup = function (args, system, cb) {
    _.each(system.topology.containers, function(container){
      if (container.group===args[0]){
         _runner.stop(system, container.name, cb)
      }
    })
  }



  function showGroups(){
    console.log('')
    console.log('Critical Group: ')
    console.log('--------------')
    console.log(''+namedGroupArray.join("\n"))
    console.log('----------')
    console.log('')

    console.log('Default Group :')
    console.log('--------------')
    console.log(''+defaultGroupArray.join("\n"))
    console.log('----------')
    console.log('')
 }

  var _commands = {
    ps: {action: psList, description: 'list managed processes and containers, usage: ps'},
    info: {action: showInfo, sub: [], description: 'show process and container environment information, usage: info <process> [full]'},
    start: {action: startProcess, sub: [], description: 'start processes or group, usage: start <process> | <group> | all'},
    stop: {action: stopProcess, sub: [], description: 'stop process or group, usage: stop <process> | <group> | all'},
    show: {action: showGroups, sub:[], description: 'Show groups. usage: show'},
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
    rel: {action: findChangedProcesses, sub: [], description: 'reload process envs after config change'},
    s: {action: setEnvVariable, sub: [], description: 'Change a config value in memory. usage setval <process> <variable> <value> '},
    y: {action: reload, sub: [], description: 'accept' },
    n: {action: noReload, sub: [], description: 'cancel reload'  },



    help: {action: showHelp, description: 'show help on commands'}
  }


















  var currentYmlConfig
  var newYmlConfig
  var yamlPath = path.resolve(path.join(process.cwd(), 'fuge\\fuge.yml'))
  var changedProcesses = []




  function noReload () {
    console.log('no action taken')
  }



  // save the initial yml config to compare to a changed yml
  function initConfig () {
    try {
      currentYmlConfig = yaml.safeLoad(fs.readFileSync(yamlPath, 'utf8'))
    } catch (ex) {
      console.log(ex)
    }
  }



  // array of container names that have been changed in yml file
  function findChangedProcesses () {
    changedProcesses = []
    try {
      newYmlConfig = yaml.safeLoad(fs.readFileSync(yamlPath, 'utf8'))
    } catch (ex) {
      console.log(ex)
    // return cb(ex.message)
    }
    _.each(Object.keys(currentYmlConfig), function (name) {
      if (JSON.stringify(Object.values(currentYmlConfig[name])) !== JSON.stringify(Object.values(newYmlConfig[name]))) {
        changedProcesses.push(name)
      }
    })

    if (changedProcesses.length > 0) {
      console.log('Changed values in:  ' + changedProcesses)
      console.log('Do you want to save changes and reload these services? (y/n)')
    } else {
      console.log('No changes in yml file')
    }
  }






  function exitCb (cb) {
    return function (err, container, child, code) {
      if (err) {
        console.log(container.name + ' error: ' + err)
      }
      cb(err || null)
    }
  }



  function reload (args, system, cb) {
     console.log('\n\n SYS_TOP.. in LOAD ' + system.topology.containers['auditservice'].environment.SERVICE_PORT)
      var path = []
      path[0] = 'fuge\\fuge.yml'
      var logPath
      fcfg.load2(yamlPath, system, function (err, system) {
      if (err) { return cb(err) }
      system.global.log_path = logPath
      cb(err, system)
      console.log('\n\n SYS_TOP.. in LOAD ' + system.topology.containers['auditservice'].environment.SERVICE_PORT)
      // debugger

      // pRun(system, changedProcesses, cb)
      console.log('\n\n SYS_TOP.. in LOAD SERVICE_PORT 1 ' + system.topology.containers['auditservice'].environment.SERVICE_PORT)
      // shellExecute.run(system)
      // var command=''
      // shellExecute(command, system, cb)
      // cb('done', system)
    })

    //  console.log('\n\n SYS_TOP.. AFTER LOAD SERVICE_PORT 2 ' + system.topology.containers['auditservice'].environment.SERVICE_PORT)
    // console.log('\n\n SYS_TOP.. AFTER LOAD SERVICE_PORT 3 (after DONE) ' + system.topology.containers['auditservice'].environment.SERVICE_PORT)
    console.log('\n\nrocess.env after LOAD IN commands: ' + process.env.SERVICE_PORT)
    // shell.run(system)

    currentYmlConfig = newYmlConfig
  }



//   about:inspect
//   node --inspect ../../fuge/fuge.js shell fuge/fuge.yml







  function pRun (system, changedProcesses, cb) {
    _.each(system.topology.containers, function (container) {
      if (_.includes(changedProcesses, container.name)) {

        // process.env = Object.assign(process.env, container.environment)
        // processrunner.run( 'update', container, exitCb, function(){
        console.log('\nRELOAD after compile IMP_S_P 7 ' + container.name + ' = ' + process.env.auditservice_SERVICE_PORT)
        // })

      }

    })

  }



   // args[0]     args[1]      args[2]       args[3]
   // command: <process name>  <variable>  <new value>
  function setEnvVariable (args, system, cb, command) {
    var value
     // show all env-vars for process
    if (args.length === 1) {
      _.each(system.topology.containers, function (container) {
        if (container.name === args[0]) {
          console.log('\nvariables in ' + container.name.yellow)

          _.each(Object.keys(container), function (val) {
            value = container[val]
            if (typeof value === 'object' && value !== null) {
              console.log(' ' + val + ' = ' + Object.entries(value))
            } else {
              console.log(' ' + val + ' = ' + value)
            }
          })
        }
      })


      // show env-var and value for process <var>
    } else if (args.length === 2) {
      _.each(system.topology.containers, function (container) {
        if (container.name === args[0]) {
          _.each(Object.keys(container), function (envar) {
            if (envar === args[1]) {
              console.log(envar + ' = ' + container[envar])
            }
          })
        }
      })


      // change envar to new value
    } else if (args.length === 3) {
      _.each(system.topology.containers, function (container) {
        if (container.name === args[0]) {
          console.log('\nvariables in ' + container.name.yellow)

          _.each(Object.keys(container), function (envar) {
            if (envar === args[1]) {
              var oldValueType = typeof container[envar]
              var oldValue = container[envar]
              var newValue = args[2]
              var newValueType = typeof oldValue

              if (newValueType === oldValueType) { newValue = container[envar] = args[2] }
              console.log('Old value type == ' + oldValueType)
              console.log('new value type = ' + newValueType)
              console.log('Old value = ' + oldValue)
              console.log('New value = ' + newValue)
              console.log('args[1] = ' + args[1] + ' | ' + container[envar] + ' = ' + newValue)


              if (_runner.isProcessRunning(system, args[0])) {
                _runner.stop(system, args[0], function () {
                  _runner.start(system, args[0], cb)
                })
              } else {
                cb('process not running!')
              }
            }
          })
        }
      })
    } // args 3


  }














  function isDisabled (system){
    _.each(system.topology.containers, function (container) {
      if(container.path===null){
        container.status='disabled'
      }
    })
  }

  function init (system, runner, dns) {
    initConfig()
    _runner = runner
    _dns = dns
    isDisabled(system)
    groups(system)
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

