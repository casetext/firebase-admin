
'use strict';

// chai setup.

global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.expect = global.chai.expect;

global.params = {};

if (process.env.FIREBASE_USER && process.env.FIREBASE_PASS) {
  global.params.firebaseUser = process.env.FIREBASE_USER;
  global.params.firebasePassword = process.env.FIREBASE_PASS;
} else {
  console.error(
    'You must set process.env.FIREBASE_USER and process.env.FIREBASE_PASS\n' +
    'before running these tests.'
  );
}
