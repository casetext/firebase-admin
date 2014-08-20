
'use strict';

var Q = require('q');

var fbUser = process.env.FIREBASE_USER,
  fbPass = process.env.FIREBASE_PASS,
  account;


describe('FirebaseAccount', function() {

  var newDb;

  before(function() {

    account = new FirebaseAccount(fbUser, fbPass);
    return account.ready;

  });

  beforeEach(function() {

    return Q.delay(500);

  });


  describe('constructor', function() {

    describe('given valid credentials', function() {

      it('has a "ready" promise that resolves when authenticated', function() {

        return expect((new FirebaseAccount(fbUser, fbPass)).ready)
        .to.be.fulfilled;

      });

    });

    describe('given invalid credentials', function() {

      it('has a "ready" promise that rejects with an error', function() {

        return expect(
          (new FirebaseAccount('wrong@wrongville.com', 'wrongpass')).ready
        ).to.be.rejectedWith(Error);

      });

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
      instancePromise = FirebaseAccount.bootstrapInstance(fbUser, fbPass);
    });

    it('promises to create a new database with a random name immediately', function() {

      return expect(instancePromise).to.be.fulfilled;

    });

    it('has a tearDown property that can be used to delete the database', function() {

      return expect(instancePromise.then(function(instance) {
        expect(instance.tearDown).to.be.a('function');
        return expect(instance.tearDown()).to.be.fulfilled;
      })).to.be.fulfilled;

    });

  });

});

