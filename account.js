
'use strict';

var url = require('url'),
  request = require('request'),
  Firebase = require('firebase'),
  Q = require('q'),
  FirebaseInstance = require('./instance');


/**
 * Creates a new reference to a Firebase account.
 * @constructor
 * @param {String} adminToken The admin token for the account.
 */
function FirebaseAccount(adminToken) {

  var deferred = Q.defer();

  this._dbs = {};
  this.adminToken = adminToken;

}

FirebaseAccount.defaultAuthConfig = {
  domains: [
    'localhost',
    '127.0.0.1'
  ],
  sessionLengthSeconds: 86400,
  anonymous: {
    'enabled': false
  },
  facebook: {
    'enabled': false,
    'key': '',
    'secret': ''
  },
  github: {
    'enabled': false,
    'key': '',
    'secret': ''
  },
  google: {
    'enabled': false,
    'key': '',
    'secret': ''
  },
  password: {
    'enabled': false,
    'emails': {
      'password-reset': {
        'from': 'no-reply@example.com',
        'fromname': '',
        'replyto': '',
        'subject': '',
        'template': 'Hello!\n\n' +
          'It looks like you\'ve forgotten your password.\n\n' +
          'Use the following temporary password within the next 24 hours ' +
          'to log in and update your account: %TOKEN%\n\nThanks!\n'
      }
    }
  },
  twitter: {
    'enabled': false,
    'key': '',
    'secret': ''
  }
};

/**
 * Promises to create a new Firebase instance under the account.
 * @param {String} name The name of the new instance.
 * @returns {external:Promise} A promise that resolves with a
 * {@link FirebaseInstance} if successful and rejects with an Error if
 * there's an error.
 * @example
 * account.createDatabase('newfirebase')
 * .then(function(db) {
 *   // get a Firebase reference to the new instance
 *   var fb = new Firebase(db.toString());
 *   fb.child('spam/spam/spam/spam').set('wonderful');
 * })
 * .catch(function(err) {
 *   console.error('Error while creating new instance:', err);
 * });
 */
FirebaseAccount.prototype.createDatabase = function(name) {

  var deferred = Q.defer();

  request.post({
    url: 'https://admin.firebase.com/firebase/' + name,
    form: {
      token: this.adminToken,
      appName: name
    }
  }, function(err, response, body) {
    body = JSON.parse(body);
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode !== 200) {
      deferred.reject(new Error(response.statusCode));
    } else if (body.error) {
      deferred.reject(new Error('Firebase error: ' + body.error));
    } else if (body.success === false) {
      deferred.reject(new Error('Bad credentials or server error.'));
    } else {
      this._dbs[name] = new FirebaseInstance(name, this.adminToken);
      deferred.resolve(this._dbs[name]);
    }
  }.bind(this));

  return deferred.promise;

};


/**
 * Promises to retrieve a new Firebase instance under the account.
 * @param {String} name The name of the instance.
 * @returns {external:Promise} A promise that resolves with a
 * {@link FirebaseInstance} if successful and rejects with an Error if
 * there's an error.
 * @example
 * account.getDatabase('existingfirebase')
 * .then(function(db) {
 *   // get a Firebase reference to the instance
 *   var fb = new Firebase(db.toString());
 *   fb.child('spam/spam/spam/spam').on('value', function(snap) {
 *     console.log(snap.val(), 'spam, lovely spam');
 *   });
 * })
 * .catch(function(err) {
 *   console.error('Error retrieving instance:', err);
 * });
 */
FirebaseAccount.prototype.getDatabase = function(name) {

  if (this._dbs[name]) {
    /* jshint newcap:false */
    return Q(this._dbs[name]);
  } else {
    var newDb = new FirebaseInstance(name, this.adminToken);

    return newDb.ready
    .then(function() {
      this._dbs[name] = newDb;
      return newDb;
    }.bind(this));
  }

};


/**
 * Promises to remove a Firebase instance from the account
 * @param {FirebaseInstance} db The instance to remove.
 * @returns {external:Promise} A promise that resolves if db is deleted
 * successfully and rejects with an Error if there's an error.
 */
FirebaseAccount.prototype.deleteDatabase = function(db) {

  if (db.deleted) {
    return Q.reject(
      new Error('Cannot delete already-deleted database ' + db.toString())
    );
  }

  var deferred = Q.defer();

  request.post({
    url: 'https://admin.firebase.com/firebase/' + db.name,
    form: {
      token: this.adminToken,
      namespace: db.name,
      _method: 'DELETE'
    }
  }, function(err, response, body) {
    body = JSON.parse(body);
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode !== 200) {
      deferred.reject(new Error(response.statusCode));
    } else if (body.error) {
      deferred.reject(new Error('Firebase error: ' + body.error));
    } else if (body.success === false) {
      deferred.reject(new Error('Bad credentials or server error.'));
    } else {
      db.deleted = true;
      delete this._dbs[db.name];
      deferred.resolve();
    }

  }.bind(this));

  return deferred.promise;

};


/**
 * Promises to create a new Firebase instance under the account
 * with the specified username and password. A convenience method.
 * @param {String} email The email address associated with the account.
 * @param {String} password The password for the account.
 * @returns {external:Promise} A promise that resolves with a
 * {@link FirebaseInstance} if successful and rejects with an Error if
 * there's an error. This instance also has an extra method, tearDown, that
 * deletes the database.
 * @example
 * FirebaseAccount.bootstrapInstance('token')
 * .then(function(db) {
 *   // get a Firebase reference to the new instance
 *   var fb = new   Firebase(db.toString());
 *   fb.child('spam/spam/spam/spam').set('wonderful');
 * }, function(err) {
 *   console.error('Error while creating new instance:', err);
 * });
 */
FirebaseAccount.bootstrapInstance = function(token) {

  var account = new FirebaseAccount(token);

  return account.createDatabase(Math.random().toString(36).slice(2))
  .then(function(db) {

    db.tearDown = function() {
      return account.deleteDatabase(db);
    };
    return db;

  });

};


module.exports = FirebaseAccount;
