
'use strict';

var Q = require('q'),
  _ = require('lodash');

var FirebaseAccount = require('../../account.js'),
  account,
  instance,
  authToken;


describe('FirebaseInstance', function() {

  before(function() {

    account = new FirebaseAccount(process.env.FIREBASE_ADMIN_TOKEN);

    return account.createDatabase(Math.random().toString(36).slice(2))
    .then(function(newInstance) {
      instance = newInstance;
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

  describe('authentication', function() {

    describe('with a pristine Firebase', function() {

      describe('#getAuthConfig', function() {

        it('gets the default (null) authConfig object', function() {

          return expect(instance.getAuthConfig())
          .to.eventually.equal(null);

        });

      });

      describe('#setAuthConfig', function() {

        it('sets the authConfig to the supplied configuration object', function() {

          var config = _.cloneDeep(FirebaseAccount.defaultAuthConfig);
          config.password.enabled = true;
          return instance.setAuthConfig(config)
          .then(function() {
            return Q.delay(1000);
          });

        });

      });

    });


    describe('with a configured Firebase', function() {

      describe('#getAuthConfig', function() {

        it('actually returns the current configuration', function() {

          return expect(instance.getAuthConfig())
          .to.eventually.include.keys([
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

    });

  });

  describe('#createUser', function() {

    it('creates a new user with the specified username and password', function() {

      return expect(instance.createUser('foobar@foobar.com', 'blarg'))
      .to.eventually.be.fulfilled;

    });

  });


  describe('#listUsers', function() {

    it('lists all users on the Firebase', function() {

      return expect(instance.listUsers())
      .to.eventually.have.length.above(0);

    });

  });

  describe('#sendResetEmail', function() {

    it('sends a reset email to the specified user', function() {

      return expect(instance.sendResetEmail('foobar@foobar.com'))
      .to.eventually.be.fulfilled;

    });

  });

  describe('#changeUserPassword', function() {

    it('changes the password of the specified user', function() {

      return expect(instance.changeUserPassword('foobar@foobar.com'))
      .to.eventually.be.fulfilled;

    });

  });

  describe('#removeUser', function() {

    it('removes the specified user', function() {

      return instance.removeUser('foobar@foobar.com')
      .then(function() {

        return expect(instance.listUsers())
        .to.eventually.have.length.below(1);

      });

    });

  });

});
