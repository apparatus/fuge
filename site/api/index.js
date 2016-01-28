'use strict';

var Hapi = require('hapi');
var staticContent = require('./static');
var templates = require('./templates');
var services = require('./services');

var server = new Hapi.Server();

server.connection({
  port: Number(process.env.SERVICE_PORT),
  host: process.env.SERVICE_HOST
});

templates(server);
staticContent(server);
services(server);

server.register({
  register: require('good'),
  options: {opsInterval: 1000,
              reporters: [{reporter: require('good-console'), events: { log: '*', response: '*' }}]}},
  function(err) {
    if (err) { throw err; }
    server.start(function() {
      console.log('listening on port: ' + process.env.SERVICE_PORT);
    });
});

