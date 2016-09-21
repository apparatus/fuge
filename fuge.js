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
var runner = require('./runner')()
var shell = require('./shell')()
var util = require('./util')()
var Pkg = require('./package.json')


var showVersion = function () {
  console.log('v' + Pkg.version)
}


var buildSystem = function (args) {
  console.log('building...')

  util.compile(args, function (err, system, config) {
    if (err) { return console.error(err) }

    runner.buildSystem(system, config, function (err) {
      if (err) { return console.error(err) }
    })
  })
}


var pullSystem = function (args) {
  console.log('pulling...')

  util.compile(args, function (err, system, config) {
    if (err) { return console.error(err) }

    runner.pullSystem(system, config, function (err) {
      if (err) { return console.error(err) }
    })
  })
}


var cloneRepo = function (args) {
  console.log('pulling...')

  if (args && args.length > 0) {
    return runner.cloneRepo(args[0], function (err) {
      if (err) { return console.error(err) }
    })
  }
}


var runSystem = function (args) {
  console.log('compiling...')
  util.compile(args, function (err, system, config) {
    if (err) { return console.error(err) }
    shell.runSingleCommand(system, config, 'start all')
  })
}


var runShell = function (args) {
  console.log('compiling...')
  util.compile(args, function (err, system, config) {
    if (err) { return console.error(err) }
    shell.run(system, config)
  })
}


var previewSystem = function (args) {
  console.log('compiling...')
  util.compile(args, function (err, system, config) {
    if (err) { return console.error(err) }
    runner.previewSystem(system, config)
  })
}


var showHelp = function () {
  console.log('usage: fuge <command> <options>')
  console.log('')
  console.log('fuge build                      build a system by executing the RUN commands in each services Dockerfile')
  console.log('fuge pull <compose-file>        update a system by attempting a git pull against each service')
  console.log('fuge clone <Github repo>        clone a Github repo, supports all valid repo name formats')
  console.log('fuge run <compose-file>         run a system')
  console.log('fuge preview <compose-file>     preview a run command for a system')
  console.log('fuge shell <compose-file>       start an interactive shell for a system')
  console.log('fuge version                    version of fuge')
  console.log('fuge help                       show this help')
}


program.register('build', buildSystem)
program.register('pull', pullSystem)
program.register('clone', cloneRepo)
program.register('generate', cloneRepo)
program.register('run', runSystem)
program.register('preview', previewSystem)
program.register('shell', runShell)
program.register('version', showVersion)
program.register('--version', showVersion)
program.register('help', showHelp)
program.register('--help', showHelp)


function start (argv) {
  var remaining = program.parse(argv)
  if (remaining) { console.error('No matching command.') }
}


module.exports = start
if (require.main === module) {
  start(process.argv.slice(2))
}
