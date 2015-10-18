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

var fs = require('fs');
var program = require('commist')();
var xeno = require('xenotype')();
var runner = require('fuge-runner')();
var gen = require('./fuge-generator')();



var generateSystem = function(args) {
  gen.init(function() {
    gen.generateSystem(args, function() {
    });
  });
};



var generateService = function(args) {
  gen.init(function() {
    gen.generateService(args, true, function() {
    });
  });
};



var runSystem = function(args) {
  var yamlPath = args[0] || process.cwd() + '/docker-compose.yml';

  if (!fs.existsSync(yamlPath)) {
    return console.log('path not found: ' + yamlPath);
  }

  xeno.compile(yamlPath, function(err, system) {
    if (err) { return console.log(err); }
      runner.start(system, function(err) {
        if (err) { return console.log(err); }
    });
  });
};



program.register('generate system', generateSystem);
program.register('generate service', generateService);
program.register('run', runSystem);



function start(argv) {
  var remaining = program.parse(argv);
  if (remaining) {
    console.log('No matching command.');
  }
}



module.exports = start;
if (require.main === module) {
  start(process.argv.slice(2));
}

