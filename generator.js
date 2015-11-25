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
var readline = require('readline');
 

module.exports = function() {
  var env;

  var init = function(cb) {
    env = yeoman.createEnv();
    env.lookup(function() {
      cb();
    });
  };



  var createService = function(serviceName, cb) {
    var cwd = process.cwd();

    fs.mkdirSync(cwd + '/' + serviceName); 
    process.chdir(cwd + '/' + serviceName);
    env.run('seneca-http', function() {
      cb();
    });
  };
  


  var generateService = function(name, interactive, cb) {
    var rl;
    var definition = '__SERVICE__:\n' + 
                     '  build: ../__SERVICE__/\n' + 
                     '  container_name: __SERVICE__\n';

    name = name || '';
    if (interactive) {
      rl = readline.createInterface({input: process.stdin, output: process.stdout});
      rl.question('service name [' + name + ']: ', function(serviceName) {
        serviceName = serviceName || name;
        if (!(serviceName && serviceName.length > 0)){
          console.log('name not supplied - aborting!');
          rl.close();
          cb();
        }
        else {
          createService(serviceName, function() {
            definition = definition.replace(/__SERVICE__/g, serviceName);
            rl.question('append this service to compose-dev.yml [y]: ', function(response) {
              if (response === 'y' || response === 'Y') {
                if (fs.existsSync('../fuge/compose-dev.yml')) {
                  fs.appendFileSync('../fuge/compose-dev.yml', definition);
                }
              }
              else {
                console.log('add the following to compose-dev.yml to enable this service: ');
                console.log('');
                console.log(definition);
                console.log('');
              }
              rl.close();
            });
          });
        }
      });
    }
    else {
      createService(name, cb);
    }
  };



  var generateSystem = function(args, cb) {
    var cwd = process.cwd();
    fs.mkdirSync(cwd + '/fuge'); 
    process.chdir(cwd + '/fuge');
    env.run('microbial', function() {
      process.chdir(cwd);
      generateService('service1', false, function() {
        process.chdir(cwd);
        generateService('service2', false, function() {
          process.chdir(cwd);
          fs.mkdirSync(cwd + '/site'); 
          process.chdir(cwd + '/site');
          env.run('hapi-seneca', function() {
            console.log('');
            console.log('system generated !!');
            console.log('spin it up with : fuge run ./fuge/compose-dev.yml');
            console.log('');
            console.log('Have an awesome day, you\'re welcome.');
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

