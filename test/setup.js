
'use strict';

// chai setup.

global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.expect = global.chai.expect;

global.params = {};

if (!process.env.FIREBASE_USER || !process.env.FIREBASE_PASS) {
  console.error(
    'You must set process.env.FIREBASE_USER and process.env.FIREBASE_PASS\n' +
    'before running these tests.'
  );
  process.exit(1);
}
