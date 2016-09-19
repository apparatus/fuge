'use strict'

var Hapi = require('hapi')

var server = new Hapi.Server()
server.connection({port: 5000})

server.route({
  method: 'GET',
  path: '/info',
  handler: (request, reply) => {
    return reply({
      service: 'writer',
      version: '1.0.0'
    })
  }
})

server.start(() => {
  console.log('writer started on: ' + server.info.uri)
})
