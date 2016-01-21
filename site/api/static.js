'use strict';

module.exports = function(server) {
  server.register(require('inert'), function (err) {
    if (err) { throw err; }

    server.route({
      method: 'GET',
      path: '/public/css/{param}',
      handler: {
        directory: {
          path: __dirname + '/../public/css',
          listing: false
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/public/js/{param}',
      handler: {
        directory: {
          path: __dirname + '/../public/js',
          listing: false
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/public/bower_components/{param*}',
      handler: {
        directory: {
          path: __dirname + '/../public/bower_components',
          listing: false
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/public/img/{param}',
      handler: {
        directory: {
          path: __dirname + '/../public/img',
          listing: false
        }
      }
    });
  });
};

