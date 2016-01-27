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

'use strict';

var _ = require('lodash');
var cleanupHandler = require('death');
var Vorpal = require('vorpal');
var CliTable = require('cli-table');
require('colors');



/**
* fuge run -> executes through here - runs all and starts a log tail
* hitting any key will stop the tail
* need a command history
*/
module.exports = function() {
  var _config;
  var _runner;
  var _proxy;
  var vorpal =  new Vorpal();
  var tableChars = { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
  'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
  'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
  'right': '' , 'right-mid': '' , 'middle': ' ' };
  var tableStyle = { 'padding-left': 0, 'padding-right': 0 };



  var stopSystem = function(system) {
    _runner.stopAll(system, function() {
      process.exit(0);
    });
  };



  var psList = function(args, system, cb) {
    var table = new CliTable({chars: tableChars, style: tableStyle,
      head: ['name'.white, 'type'.white, 'status'.white, 'watch'.white, 'tail'.white, 'count'.white], colWidths: [30, 15, 15, 15, 15, 5]});
      var procs = _runner.processes();
      var counts = _.countBy(_.keys(procs), function(key) { return procs[key].identifier; });

      _.each(system.topology.containers, function(container) {
        if (!(container.name === '__proxy' || container.type === 'blank-container')) {
          if (container.type === 'docker' && _config.runDocker === false) {
            table.push([container.name.gray, container.type.gray, 'not managed'.gray, '', '']);
          }
          else {
            var procKey = _.find(_.keys(procs), function(key) { return procs[key].identifier === container.name; });
            if (procKey) {
              var proc = procs[procKey];
              table.push([container.name.green,
                container.type.green,
                'running'.green,
                proc.monitor ? 'yes'.green : 'no'.red,
                proc.tail ? 'yes'.green : 'no'.red,
                counts[container.name] ? ('' + counts[container.name]).green : '0'.red]);
              }
              else {
                table.push([container.name.red,
                  container.type.red,
                  'stopped'.red,
                  container.monitor ? 'yes'.green : 'no'.red,
                  container.tail ? 'yes'.green : 'no'.red,
                  '0'.red]);
                }
              }
            }
          });
          console.log(table.toString());
          cb();
        };



        var proxy = function(args, system, cb) {
          _proxy.previewAll(system, function(err) {
            cb(err);
          });
        };



        var showInfo = function(args, system, cb) {
          if (args.length === 2) {
            _runner.preview(system, args[1], function(err, command) {
              if (command && command.detail) {
                var env = '';
                console.log('command: ' + command.detail.cmd);
                console.log('directory: ' + command.detail.cwd);
                _.each(_.keys(command.detail.environment), function(key) {
                  env += '  ' + key + '=' + command.detail.environment[key] + '\n';
                });
                console.log('environment:\n' + env);
              }
              else {
                console.log('not managed or unknown process');
              }
              cb();
            });
          }
          else {
            cb('process not specified');
          }
        };



        var stopProcess = function(args, system, cb) {
          if (args.length === 1 || args[1] === 'all') {
            _runner.stopAll(system, function(err) {
              cb(err);
            });
          }
          else {
            _runner.stop(system, args[1], args[2] || 1, function(err) {
              cb(err);
            });
          }
        };



        var startProcess = function(args, system, cb) {
          if (args.length === 1 || args[1] === 'all') {
            _runner.startAll(system, args[2] || 1, function(err) {
              cb(err);
            });
          }
          else {
            _runner.start(system, args[1], args[2] || 1, function(err) {
              cb(err);
            });
          }
        };



        var debugProcess = function(args, system, cb) {
          if (args.length === 2) {
            if (!_runner.isProcessRunning(args[1])) {
              _runner.debug(system, args[1], function(err) {
                cb(err);
              });
            }
            else {
              console.log('process already running - terminate to debug');
              cb();
            }
          }
          else {
            cb();
          }
        };



        var watchProcess = function(args, system, cb) {
          var err = null;
          if (args.length === 1 || args[1] === 'all') {
            _runner.watchAll(system);
          }
          else if (args.length >= 2) {
            err = _runner.watch(system, args[1]);
          }
          cb(err);
        };



        var unwatchProcess = function(args, system, cb) {
          var err = null;
          if (args.length === 1 || args[1] === 'all') {
            _runner.unwatchAll(system);
          }
          else if (args.length >= 2) {
            err = _runner.unwatch(system, args[1]);
          }
          cb(err);
        };



        var tailProcess = function(args, system, cb) {
          var err = null;
          if (args.length === 1 || args[1] === 'all') {
            _runner.tailAll(system);
          }
          else if (args.length >= 2) {
            err = _runner.tail(system, args[1], args[2] || 0);
          }
          cb(err);
        };



        var untailProcess = function(args, system, cb) {
          var err = null;
          if (args.length === 1 || args[1] === 'all') {
            _runner.untailAll(system);
          }
          else if (args.length >= 2) {
            err = _runner.untail(system, args[1]);
          }
          cb(err);
        };



        var grepLogs = function(args, system, cb) {
          if (args.length === 2 || args[2] === 'all') {
            _runner.grepAll(system, _config, args[1], cb);
          }
          else if (args.length >= 2) {
            _runner.grep(args[2], _config, args[1], cb);
          }
        };



        var sendMessage = function(args, system, cb) {
          console.log('not implemented');
          cb();
        };



        var shutdown = function(args, system, cb) {
          stopSystem(system, cb);
        };


        var commands = [{
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
          command: 'debug <process>',
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
          command: 'untail <process>',
          action: untailProcess,
          description: 'tail output for a specific processes'
        },
        {
          command: 'grep [processname]',
          action: grepLogs,
          description: 'searches logs for specific process or all logs'
        },
        {
          command: 'send <process> <message>',
          action: sendMessage,
          description: 'sends a message to a specific process'
        },
        {
          command: 'quit',
          action: shutdown,
          description: 'termiate all managed process and exit'
        }
      ];




      var repl = function(system) {
        vorpal.delimiter('?'.green.inverse +' fuge>').show();
        commands.forEach(function (com) {
          vorpal
          .command(com.command + '[command...]')
          .description(com.description)
          .action(function (args, cb) {
            var opt = args.command;
            var arr = [com.command];
            if (opt !== undefined){
              for (var i=0; i<opt.length; i++){
                arr.push(opt[i]);
              }
            }
            com.action(arr, system, cb);
          });
        });
      };



      var run = function(system, config) {
        _config = config;
        _runner = require('fuge-runner')(_config);
        _proxy = require('fuge-proxy')(_config);

        cleanupHandler(function() {
          stopSystem(system);
        });

        console.log('starting proxy...');
        _proxy.startAll(system, function(err) {
          if (err) { console.log(err); process.exit(0); }
          console.log('starting shell..');
          repl(system, config);
        });

      };



      var runSingleCommand = function(system, config, command) {
        _config = config;
        _runner = require('fuge-runner')(_config);
        _proxy = require('fuge-proxy')(_config);

        cleanupHandler(function() {
          stopSystem(system);
        });

        console.log('starting proxy...');
        _proxy.startAll(system, function(err) {
          if (err) { console.log(err); process.exit(0); }

          var s = command.split(' ');
          commands[s[0]](s, system, function(err){
            if (err) { console.log(err); }
          });
        });
      };



      return {
        run: run,
        runSingleCommand: runSingleCommand
      };
    };
