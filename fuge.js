#!/usr/bin/env node
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

var program = require('commist')()
var shell = require('./shell')(true)
var util = require('./util')()
var webSocketServer = require('./server/webSocketServer')
var commands

function showVersion (args, system, cb) {
  console.log('')
  console.log('fuge: ' + require('./package.json').version)
  console.log('fuge-runner: ' + require('fuge-runner/package.json').version)
  console.log('fuge-config: ' + require('fuge-config/package.json').version)
  console.log('fuge-dns: ' + require('fuge-dns/package.json').version)
}


var showHelp = function () {
  console.log('')
  console.log('usage: fuge <command> <options>')
  console.log('fuge shell <fuge-file>       start the fuge shell')
  console.log('fuge pull <fuge-file>        update a system by running a pull against each service repository')
  console.log('fuge status <fuge-file>      determine git branch and status against each service repository')
  console.log('fuge test <fuge-file>        execute test scripts for all services')
  console.log('fuge version                 display fuge version information')
  console.log('fuge help                    show this help')
}


var runCommand = function (command) {
  return function (args) {
    console.log('compiling...')
    util.compile(args, function (err, system) {
      if (err) { return console.error(err) }
      shell.runSingleCommand(system, command)
    })
  }
}


var runShell = function (args) {
  console.log('compiling...')
  util.compile(args, function (err, system) {
    if (err) { return console.error(err) }
    commands = shell.run(system)
    webSocketServer.init(system, commands)
  })
}


program.register('version', showVersion)
program.register('--version', showVersion)
program.register('help', showHelp)
program.register('--help', showHelp)
program.register('pull', runCommand('pull'))
program.register('status', runCommand('status'))
program.register('test', runCommand('test'))
program.register('shell', runShell)


function start (argv) {
  var remaining = program.parse(argv)
  if (remaining) { console.error('No matching command.') }
}


module.exports = start
if (require.main === module) {
  start(process.argv.slice(2))
}

