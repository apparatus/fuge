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

'use strict';

var program = require('commist')();
var runner = require('./runner')();
var gen = require('./generator');
var shell = require('./shell')();
var util = require('./util')();
var minimist = require('minimist')

var generateSystem = function(args) {
  args = argify(args)
  gen(args.c).generateSystem(args, function() {});
};

var generateService = function(args) {
  args = argify(args)
  gen(args.c).generateService(args, true, function() {
  });
};

var generateDashboard = function(args) {
  args = argify(args)
  gen(args.c).generateDashboard(args, function() {
    if (err) {
      return console.error(err);
    }
    console.log('Dashboard generated')
  });
};


var buildSystem = function(args) {
  console.log('building...');
  util.compile(args, function(err, system, config) {
    runner.buildSystem(system, config, function(err) {
      if (err) { return console.log(err); }
    });
  });
};

var pullSystem = function(args) {
  console.log('pulling...');
  util.compile(args, function(err, system, config) {
    runner.pullSystem(system, config, function(err) {
      if (err) { return console.log(err); }
    });
  });
};



var runSystem = function(args) {
  console.log('compiling...');
  util.compile(args, function(err, system, config) {
    if (err) { return console.log(err); }
    shell.runSingleCommand(system, config, 'start all');
  });
};

var runShell = function(args) {
  console.log('compiling...');
  util.compile(args, function(err, system, config) {
    if (err) { return console.log(err); }
    shell.run(system, config);
  });
};

var previewSystem = function(args) {
  console.log('compiling...');
  util.compile(args, function(err, system, config) {
    if (err) { return console.log(err); }
    runner.previewSystem(system, config);
  });
};

program.register('generate system', generateSystem);
program.register('generate service', generateService);
program.register('generate dashboard', generateDashboard);
program.register('build', buildSystem);
program.register('pull', pullSystem);
program.register('run', runSystem);
program.register('preview', previewSystem);
program.register('shell', runShell);

function argify(args) {
  return minimist(args, {
    alias: {
      c: ['compose-file', 'composefile', 'compose'],
      i: ['interactive', 'interactivity']
    },
    defaults: {
      i: 1
    }
  });
}

function start(argv) {
  var remaining = program.parse(argv);
  if (remaining) { console.log('No matching command.'); }
}

module.exports = start;
if (require.main === module) {
  start(process.argv.slice(2));
}


