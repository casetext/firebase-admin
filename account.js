
'use strict';

var url = require('url'),
  request = require('request'),
  Firebase = require('firebase'),
  Q = require('q'),
  FirebaseInstance = require('./instance');

/**
 * Creates a new reference to a Firebase account.
 * @constructor
 * @param {String} email The email address associated with the account.
 * @param {String} password The password for the account.
 * @property {external:Promise} ready A promise that will resolve when the
 * account is ready to use and reject if there's a problem logging in.
 */
function FirebaseAccount(email, password) {

  var deferred = Q.defer();

  this._dbs = {};

  request.get({
    url: 'https://admin.firebase.com/account/login',
    qs: {
      email: email,
      password: password
    },
    json: true
  }, function(err, response, body) {
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode !== 200) {
      deferred.reject(new Error(response.statusCode));
    } else if (body.error) {
      deferred.reject(new Error(body.error));
    } else if (body.success === false) {
      deferred.reject(new Error('Bad credentials or server error.'));
    } else {
      this.adminToken = body.adminToken;
      deferred.resolve(this);
    }
  }.bind(this));

  this.ready = deferred.promise;

}


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
      deferred.reject(new Error(body.error));
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
      deferred.reject(new Error(body.error));
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
 * FirebaseAccount.bootstrapInstance('me@foo.com', 'foobar')
 * .then(function(db) {
 *   // get a Firebase reference to the new instance
 *   var fb = new Firebase(db.toString());
 *   fb.child('spam/spam/spam/spam').set('wonderful');
 * }, function(err) {
 *   console.error('Error while creating new instance:', err);
 * });
 */
FirebaseAccount.bootstrapInstance = function(email, password) {

  return new FirebaseAccount(email, password).ready.then(function(acct) {

    return acct.createDatabase(Math.random().toString(36).slice(2))
    .then(function(db) {

      db.tearDown = function() {
        return acct.deleteDatabase(db);
      };
      return db;

    });

  });

};


module.exports = FirebaseAccount;
