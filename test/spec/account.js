
'use strict';

var Q = require('q');

var FirebaseAccount = require('../../account.js'),
  account;

describe('FirebaseAccount', function() {

  var newDb, token;

  before(function() {
    token = process.env.FIREBASE_ADMIN_TOKEN;
  });

  beforeEach(function() {
    return Q.delay(500);
  });

  describe('defaultAuthConfig', function() {

    it('has a sane default auth configuration cribbed from Firebase', function() {

      expect(FirebaseAccount.defaultAuthConfig)
      .to.include.keys([
        'domains',
        'sessionLengthSeconds',
        'anonymous',
        'facebook',
        'twitter',
        'github',
        'google',
        'password'
      ]);

    });

  });

  describe('constructor', function() {

    it('takes a Firebase admin token', function() {
      account = new FirebaseAccount(token);
    });

  });

  describe('#createDatabase', function() {

    it('promises to create a new Firebase with the specified name', function() {

      var promise = account.createDatabase(Math.random().toString(36).slice(2));
      promise.then(function(db) {
        newDb = db;
      });

      return expect(promise).to.be.fulfilled;

    });

    it('rejects creating a new Firebase if the name is taken', function() {

      return expect(account.createDatabase(newDb.name)).to.be.rejected;

    });

  });

  describe('#getDatabase', function() {

    it('promises to retrieve a Firebase with the specified name', function() {

      return expect(account.getDatabase(newDb.name)).to.be.fulfilled;

    });

    it('rejects if no such Firebase exists', function() {

      return expect(account.getDatabase('nonexistent')).to.be.rejected;

    });

  });

  describe('#deleteDatabase', function() {

    it('promises to delete an existing database', function() {

      return (expect(account.deleteDatabase(newDb))).to.be.fulfilled;

    });

    it('rejects if you try to delete an already-deleted database', function() {

      return (expect(account.deleteDatabase(newDb))).to.be.rejected;

    });
  });

  describe('bootstrapInstance', function() {

    var instancePromise;

    before(function() {
      instancePromise = FirebaseAccount.bootstrapInstance(token);
    });

    it('promises to create a new database with a random name immediately', function() {
      return expect(instancePromise).to.be.fulfilled;
    });

    it('has a tearDown property that can be used to delete the database', function() {

      return instancePromise.then(function(instance) {
        expect(instance.tearDown).to.be.a('function');
        return expect(instance.tearDown()).to.be.fulfilled;
      });

    });

  });

});

