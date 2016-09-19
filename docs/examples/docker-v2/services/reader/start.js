'use strict'

var Hapi = require('hapi')

var server = new Hapi.Server()
server.connection({port: 4000})

server.route({
  method: 'GET',
  path: '/info',
  handler: (request, reply) => {
    return reply({
      service: 'reader',
      version: '1.0.0'
    })
  }
})

server.start(() => {
  console.log('reader started on: ' + server.info.uri)
})
