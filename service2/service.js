'use strict';

var seneca = require('seneca')();
seneca.use('env-plugins');

seneca.add({role: 'service2', cmd: 'action1'}, function(args, callback) {
  callback(null, {data: 'data'});
});

seneca.add({role: 'service2', cmd: 'action2'}, function(args, callback) {
  callback(null, {data: 'data'});
});


seneca.listen({host: process.env.SERVICE_HOST, port: process.env.SERVICE_PORT});
module.exports.seneca = seneca;
