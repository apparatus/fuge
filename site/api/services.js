'use strict';

var seneca = require('seneca')();

seneca.client({host: process.env.PROXY_HOST, port: process.env.service1_PORT, pin: {role: 'service1'}});
seneca.client({host: process.env.PROXY_HOST, port: process.env.service2_PORT, pin: {role: 'service2'}});

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/service1/action1',
    handler: function(request, reply) {
      seneca.act({role: 'service1', cmd: 'action1'}, function(err, res) {
        reply({result: err ? 'error' : res, err: err});
      });
    }
  });
  server.route({
    method: 'GET',
    path: '/service1/action2',
    handler: function(request, reply) {
      seneca.act({role: 'service1', cmd: 'action2'}, function(err, res) {
        reply({result: err ? 'error' : res, err: err});
      });
    }
  });
  server.route({
    method: 'GET',
    path: '/service2/action1',
    handler: function(request, reply) {
      seneca.act({role: 'service2', cmd: 'action1'}, function(err, res) {
        reply({result: err ? 'error' : res, err: err});
      });
    }
  });
  server.route({
    method: 'GET',
    path: '/service2/action2',
    handler: function(request, reply) {
      seneca.act({role: 'service2', cmd: 'action2'}, function(err, res) {
        reply({result: err ? 'error' : res, err: err});
      });
    }
  });
};

