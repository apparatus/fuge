'use strict'
console.log('fail fast starting up')
setTimeout(function () {
  process.exit(1)
}, 100)
