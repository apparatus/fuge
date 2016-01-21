'use strict';

process.env.SERVICE_PORT = 3000;
process.env.SERVICE_HOST = 'localhost';

var test = require('tape');
require('../index');

test('shutdown', function(t) {
  t.plan(1);
  t.equal(1, 1);
  setTimeout(function() { process.exit(0); }, 1000);
});


