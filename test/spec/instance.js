
'use strict';

var Q = require('q');

var fbUser = process.env.FIREBASE_USER,
  fbPass = process.env.FIREBASE_PASS,
  account,
  instance,
  authToken;


describe('FirebaseInstance', function() {

  before(function() {

    account = new FirebaseAccount(fbUser, fbPass);

    return account.ready
    .then(function() {

      return account.createDatabase(Math.random().toString(36).slice(2))
      .then(function(newInstance) {
        instance = newInstance;
      });

    });
  });

  beforeEach(function() {

    return Q.delay(500);

  });

  after(function() {

    return account.deleteDatabase(instance);

  });

  describe('#getAuthTokens', function() {

    it('promises to get all the valid auth tokens for the instance', function() {

      return instance.getAuthTokens()
      .then(function(tokens) {
        expect(tokens).to.be.an.instanceof(Array);
        expect(tokens).to.have.length(1);
      });
    });

  });

  describe('#addAuthToken', function() {

    it('promises to create and return a new auth token', function() {

      return instance.addAuthToken().then(function(token) {
        authToken = token;
        expect(authToken).to.be.a('string');
      });

    });

  });

  describe('#removeAuthToken', function() {

    it('promises to remove an existing auth token', function() {

      return expect(instance.removeAuthToken(authToken))
      .to.be.fulfilled;

    });

    it('rejects if the supplied token does not exist', function() {

      return expect(instance.removeAuthToken(authToken))
      .to.be.rejected;

    });

  });

  describe('#getRules', function() {

    it('obtains the current security rules as a POJO', function() {

      return expect(instance.getRules())
      .to.become({
        '.read': true,
        '.write': true
      });

    });

  });

  describe('#setRules', function() {

    describe('given a valid set of security rules as a POJO', function() {

      var goodNewRules = {
        '.read': true,
        '.write': false,
        foo: {
          '.write': true
        }
      };

      it('promises to set the security rules on the database', function() {

        return instance.setRules(goodNewRules)
        .then(function() {
          return expect(instance.getRules())
          .to.become(goodNewRules);
        });

      });

    });

    describe('given an invalid set of security rules as a POJO', function() {

      var badNewRules = {
        '.read': 'newData <'
      };

      it('rejects with a syntax error', function() {

        return expect(instance.setRules(badNewRules))
        .to.be.rejected;

      });

    });

  });

});
