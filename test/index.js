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

var test = require('tape')
var path = require('path')
var fs = require('fs')
var del = require('del')
var fuge = require('../fuge.js')

var before = test
var fixtures = path.join(__dirname, 'fixtures')

before('set up', function (t) {
  if (fs.existsSync(fixtures)) { del.sync(fixtures, {force: true}) }
  fs.mkdirSync(fixtures)
  process.chdir(fixtures)
  t.end()
})


test.skip('fuge generate system -i none', function (t) {
  t.plan(1)
  t.doesNotThrow(fuge.bind(fuge, ['generate', 'system', '-i', 'none']))
  setImmediate(process.exit)
})
