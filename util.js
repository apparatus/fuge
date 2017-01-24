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

var fs = require('fs')
var path = require('path')
var fcfg = require('fuge-config')()

module.exports = function () {

  var compile = function (args, cb) {
    var yamlPath = path.resolve(args[0] || path.join(process.cwd(), 'fuge.yml'))
    var logPath

    if (args[0]) {
      logPath = path.resolve(path.join(path.dirname(args[0]), 'log'))
    } else {
      logPath = path.resolve(path.join(process.cwd(), 'log'))
    }

    if (!fs.existsSync(yamlPath)) {
      return console.log('path not found: ' + yamlPath)
    }

    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath)
    }

    fcfg.load(yamlPath, function (err, system) {
      if (err) { return cb(err) }
      system.global.log_path = logPath
      cb(err, system)
    })
  }

  return {
    compile: compile
  }
}

