'use strict';

module.exports = function(server) {
  server.register(require('vision'), function (err) {
    if (err) { throw err; }

    server.views({
      engines: {
        html: require('handlebars')
      },
      relativeTo: __dirname + '/../public/views',
      path: '.',
      helpersPath: 'helpers'
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: function (request, reply) {
        reply.redirect('/public/basic.html');
      }
    });

    server.route({
      method: 'GET',
      path: '/public/basic.html',
      handler: function (request, reply) {
        reply.view('basic');
      }
    });
  });
};

