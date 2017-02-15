'use strict'

// wibble
var http = require('http')
var resp = { resp: 'Hello World!\n' }

var server = http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'})
  response.end(resp.resp)
})
server.listen(8000)
console.log('Server running at http://127.0.0.1:8000/')
