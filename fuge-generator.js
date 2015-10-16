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
var yeoman = require('yeoman-environment');
 

module.exports = function() {
  var env;

  var init = function(cb) {
    env = yeoman.createEnv();
    env.lookup(function() {
      cb();
    });
  };



  var generateService = function(args, cb) {
    var cwd = process.cwd();
    fs.mkdirSync(cwd + '/' + args[0]); 
    process.chdir(cwd + '/' + args[0]);
    env.run('seneca-http', function() {
      cb();
    });
  };



  var generateSystem = function(args, cb) {
    var cwd = process.cwd();
    fs.mkdirSync(cwd + '/control'); 
    process.chdir(cwd + '/control');
    env.run('microbial', function() {
      fs.mkdirSync(cwd + '/service1'); 
      process.chdir(cwd + '/service1');
      env.run('seneca-http', function() {
        fs.mkdirSync(cwd + '/service2'); 
        process.chdir(cwd + '/service2');
        env.run('seneca-http', function() {
          fs.mkdirSync(cwd + '/site'); 
          process.chdir(cwd + '/site');
          env.run('hapi-seneca', function() {
            cb();
          });
        });
      });
    });
  };



  return {
    init: init,
    generateSystem: generateSystem,
    generateService: generateService
  };
};

