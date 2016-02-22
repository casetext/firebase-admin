
/**
* A promise object provided by the q promise library.
* @external Promise
* @see {@link https://github.com/kriskowal/q/wiki/API-Reference}
*/

'use strict';

var url = require('url'),
  request = require('request'),
  Firebase = require('firebase'),
  Q = require('q');

/**
 * Creates a new reference to a Firebase instance.
 * NOTE: don't use the constructor yourself, use a {@link FirebaseAccount}
 * instance instead.
 * @see {FirebaseAccount#createDatabase}
 * @see {FirebaseAccount#getDatabase}
 * @protected
 * @constructor
 * @param {String} name The name of the Firebase.
 * @param {String} adminToken The administrative token to use
 */
function FirebaseInstance(name, adminToken) {

  var deferred = Q.defer();

  this.name = name;
  this.adminToken = adminToken;

  request.get({
    url: 'https://admin.firebase.com/firebase/' + name + '/token',
    qs: {
      token: adminToken,
      namespace: name
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
    } else if (!body.personalToken) {
      deferred.reject(new Error('personalToken was not present.'));
    } else if (!body.firebaseToken) {
      deferred.reject(new Error('firebaseToken was not present.'));
    } else {
      this.personalToken = body.personalToken;
      this.firebaseToken = body.firebaseToken;
      deferred.resolve(this);
    }
  }.bind(this));

  this.ready = deferred.promise;
}

/**
 * Gets the URL to the instance, for use with the Firebase API.
 * @returns {String} The full URL to the instance.
 * @example
 * var fb = new Firebase(instance.toString());
 */
FirebaseInstance.prototype.toString = function() {
  return 'https://' + this.name + '.firebaseio.com';
};


/**
 * Promises to get all the auth tokens associated with the instance.
 * @returns {external:Promise} A promise that resolves with an Array of the
 * instance's currently-valid auth tokens and rejects with an Error
 * if there's an error.
 * @example
 * instance.getAuthTokens().then(function(tokens) {
 *   fb.auth(tokens[0], function(err) {
 *     // err should be null
 *   });
 * });
 */
FirebaseInstance.prototype.getAuthTokens = function() {

  if (this.deleted) {
    return Q.reject(
      new Error('Cannot getAuthTokens from deleted database ' + this.toString())
    );
  }

  if (this.authTokens) {
    /* jshint newcap:false */
    return Q(this.authTokens);
  }

  var deferred = Q.defer();

  request.get({
    url: 'https://' + this.name + '.firebaseio.com//.settings/secrets.json',
    qs: {
      auth: this.personalToken
    },
    json: true
  }, function(err, response, body) {
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode !== 200) {
      deferred.reject(new Error(response.statusCode));
    } else if (body.error) {
      deferred.reject(new Error(body.error));
    } else {
      this.authTokens = body;
      deferred.resolve(body);
    }
  }.bind(this));

  return deferred.promise;

};

/**
 * Promises to create and return a new auth token.
 * @returns {external:Promise} A promise that resolves with a new auth token
 * (String) that is guaranteed to be valid and rejects with an Error if
 * there's an error.
 * @example
 * instance.addAuthToken().then(function(token) {
 *   fb.auth(token, function(err) {
 *     // err should be null
 *   });
 * });
 */
FirebaseInstance.prototype.addAuthToken = function() {

  if (this.deleted) {
    return Q.reject(
      new Error('Cannot addAuthToken to deleted database ' + this.toString())
    );
  }

  var deferred = Q.defer();

  request.post({
    url: 'https://' + this.name + '.firebaseio.com/.settings/secrets.json',
    qs: {
      auth: this.personalToken
    },
    json: true
  }, function(err, response, body) {
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode !== 200) {
      deferred.reject(new Error(response.statusCode));
    } else if (body.error) {
      deferred.reject(new Error(body.error));
    } else {
      if (!this.authTokens) {
        this.authTokens = [];
      }
      this.authTokens.push(body);
      deferred.resolve(body);
    }
  }.bind(this));

  return deferred.promise;

};


/**
 * Promises to remove an existing auth token.
 * @param {String} token The token to be removed.
 * @returns {external:Promise} A promise that resolves if token has been
 * removed successfully and rejects with an Error if token isn't valid
 * or if there's an error.
 * @example
 * instance.removeAuthToken(token).then(function() {
 *   fb.auth(token, function(err) {
 *     // should get an error indicating invalid credentials here
 *   });
 * });
 */
FirebaseInstance.prototype.removeAuthToken = function(token) {

  if (this.deleted) {
    return Q.reject(
      new Error('Cannot removeAuthToken from deleted database ' + this.toString())
    );
  }

  return this.getAuthTokens()
  .then(function(tokens) {

    if (!Array.isArray(tokens) || tokens.indexOf(token) === -1) {
      return Q.reject(
        new Error('No such token exists on firebase ' + this.toString())
      );
    }

    var deferred = Q.defer();

    request.del({
      url: 'https://' + this.name + '.firebaseio.com/.settings/secrets/' + token + '.json',
      qs: {
        auth: this.personalToken,
      },
      json: true
    }, function(err, response, body) {
      if (err) {
        deferred.reject(err);
      } else if (response.statusCode > 299) {
        deferred.reject(new Error(response.statusCode));
      } else if (body && body.error) {
        deferred.reject(new Error(body.error));
      } else {
        this.authTokens.splice(this.authTokens.indexOf(token), 1);
        deferred.resolve(this);
      }
    }.bind(this));

    return deferred.promise;

  }.bind(this));

};


/**
 * Promises to get a Javascript object containing the current security rules.
 * NOTE: the top-level "rules" part of the JSON will be stripped.
 * @returns {external:Promise} A promise that resolves with an Object
 * containing the rules if they're retrieved successfully and
 * rejects with an Error if there's an error.
 * @example
 * instance.getRules().then(function(rules) {
 *   if (rules['.read'] === 'true' && rules['.write'] === 'true') {
 *     console.log('WARNING: this Firebase has default global rules!');
 *   }
 * });
 */
FirebaseInstance.prototype.getRules = function() {

  if (this.deleted) {
    return Q.reject(
      new Error('Cannot getRules from deleted database ' + this.toString())
    );
  }

  var deferred = Q.defer();

  request.get({
    url: 'https://' + this.name + '.firebaseio.com/.settings/rules.json',
    qs: {
      auth: this.personalToken,
    },
    json: true
  }, function(err, response, body) {
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode > 299) {
      deferred.reject(new Error(response.statusCode));
    } else if (body && body.error) {
      deferred.reject(new Error(body.error));
    } else {
      body = body.rules;
      deferred.resolve(body);
    }
  }.bind(this));

  return deferred.promise;

};


/**
 * Promises to change current security rules.
 * @param {Object} newRules The new security rules as a Javascript object.
 * This object need not have a top-level "rules" key, although it will be
 * handled gracefully if it does.
 * @returns {external:Promise} A promise that resolves if the rules are changed
 * successfully and rejects with an Error if there's an error.
 * @example
 * instance.setRules({
 *   '.read': 'true',
 *   '.write': 'false'
 * }).then(function() {
 *   console.log('Disabled write access to this Firebase.');
 * }).catch(function() {
 *   console.log('Oops, something went wrong!');
 * });
 */
FirebaseInstance.prototype.setRules = function(newRules) {

  if (this.deleted) {
    return Q.reject(
      new Error('Cannot setRules on deleted database ' + this.toString())
    );
  }

  if (!(newRules.rules && Object.keys(newRules).length === 1)) {
    newRules = {
      rules: newRules
    };
  }

  var deferred = Q.defer();

  request.put({
    url: 'https://' + this.name + '.firebaseio.com/.settings/rules.json',
    qs: {
      auth: this.personalToken,
    },
    json: true,
    body: newRules
  }, function(err, response, body) {
    if (err) {
      deferred.reject(err);
    } else if (response.statusCode > 299) {
      deferred.reject(new Error(response.statusCode));
    } else if (body && body.error) {
      deferred.reject(new Error(body.error));
    } else if (body && body.status !== 'ok') {
      deferred.reject(new Error(body.status));
    } else {
      deferred.resolve(this);
    }
  }.bind(this));

  return deferred.promise;

};


/**
 * Promises to obtain the current authentication configuration for the instance.
 * @returns {external:Promise} A promise that resolves with the auth config
 * and rejects with an Error if there's an error.
 */
FirebaseInstance.prototype.getAuthConfig = function() {

  var deferred = Q.defer();

  request.get({
    url: 'https://' + this.name + '.firebaseio.com/.settings/.json',
    qs: {
      auth: this.personalToken,
    },
    json: true
  }, function(err, response, body) {

    if (err) {
      deferred.reject(err);
    } else if (response.statusCode > 299) {
      deferred.reject(new Error(response.statusCode));
    } else if (body && body.error) {
      deferred.reject(new Error(body.error));
    } else {

      if (typeof body.authConfig === 'string' && body.authConfig.length === 0) {
        deferred.resolve(null);
      } else {
        deferred.resolve(JSON.parse(body.authConfig));
      }

    }

  }.bind(this));

  return deferred.promise;

};

FirebaseInstance.prototype.setAuthConfig = function(config) {

    var deferred = Q.defer();

    request.post({
      url: 'https://admin.firebase.com/firebase/' + this.name + '/authConfig',
      json: true,
      body: {
        token: this.adminToken,
        authConfig: JSON.stringify(config),
        _method: 'put'
      },
    }, function(err, response, body) {
      if (err) {
        deferred.reject(err);
      } else if (response.statusCode > 299) {
        deferred.reject(new Error(response.statusCode));
      } else if (body && body.error) {
        console.log(body.error);
        deferred.reject(new Error(body.error));
      } else {
        deferred.resolve();
      }
    }.bind(this));

    return deferred.promise;

};


FirebaseInstance.prototype._authMethodCallback = function(deferred, err, resp, body) {

  if (err) {
    deferred.reject(err);
  } else if (resp.statusCode > 299) {
    deferred.reject(new Error(resp.statusCode));
  } else if (body && body.error) {

    var error = new Error(body.error.message);
    if (body.error.code) {
      error.code = body.error.code;
    }
    deferred.reject(error);

  } else if (body.status && body.status !== 'ok') {
    deferred.reject(new Error(body.status));
  } else {
    deferred.resolve(body);
  }

};


/**
 * Promises to create a Firebase Simple Login password-type user.
 * @param {String} email The email address of the new user.
 * @param {String} password The password of the new user.
 * @returns {external:Promise} A promise that resolves if the rules are changed
 * successfully and rejects with an Error if there's an error.
 */
FirebaseInstance.prototype.createUser = function(email, password) {

  var deferred = Q.defer();

  var qs = {
    email: email,
    password: password,
    firebase: this.name
  };

  request.get({
    url: 'https://auth.firebase.com/auth/firebase/create',
    qs: qs,
    json: true
  }, this._authMethodCallback.bind(this, deferred));

  return deferred.promise;

};


/**
 * Promises to remove a Simple Login user.
 * @param {String} email The email address of the user to remove.
 * @returns {external:Promise} A promise that resolves with the new user info
 * if the user is removed successfully and rejects with an Error
 * if there's an error.
 */
FirebaseInstance.prototype.removeUser = function(email) {

  var deferred = Q.defer();

  request.del({
    url: 'https://auth.firebase.com/v2/' + this.name + '/users/' + email,
    qs: {
      token: this.adminToken
    },
    json: true
  }, this._authMethodCallback.bind(this, deferred));

  return deferred.promise;

};


/**
 * Promises to change a Simple Login user's password.
 * @param {String} email The email address of the user to remove.
 * @param {String} newPassword The new password.
 * @returns {external:Promise} A promise that resolves with the new user info
 * if the user's password is changed successfully and rejects with an Error
 * if there's an error.
 */
FirebaseInstance.prototype.changeUserPassword = function(email, newPassword) {

  var deferred = Q.defer();

  request.get({
    url: 'https://auth.firebase.com/auth/firebase/reset_password',
    qs: {
      token: this.adminToken,
      firebase: this.name,
      email: email,
      newPassword: newPassword
    },
    json: true
  }, this._authMethodCallback.bind(this, deferred));

  return deferred.promise;

};


/**
 * Promises to return a list of all Simple Login password users in the Firebase.
 * @returns {external:Promise} A promise that resolves with a list of users
 * and rejects with an Error if there's an error.
 */
FirebaseInstance.prototype.listUsers = function() {

  var deferred = Q.defer();

  request.get({
    url: 'https://auth.firebase.com/v2/' + this.name + '/users',
    qs: {
      token: this.adminToken,
      firebase: this.name
    },
    json: true
  }, this._authMethodCallback.bind(this, deferred));

  return deferred.promise
  .then(function(body) {

    if (!body.users) {
      throw new Error('No user body');
    }
    return body.users;

  });

};


/**
 * Promises to send a password reset email to a Simple Login user.
 * @param {String} email The email address of the  user to send a message to.
 * @returns {external:Promise} A promise that resolves if the message is sent
 * successfully and rejects with an Error if there's an error.
 */
FirebaseInstance.prototype.sendResetEmail = function(email) {

  var deferred = Q.defer();

  request.get({
    url: 'https://auth.firebase.com/auth/firebase/reset_password',
    qs: {
      token: this.adminToken,
      firebase: this.name,
      email: email
    },
    json: true

  }, this._authMethodCallback.bind(this, deferred));

  return deferred.promise;

};

module.exports = FirebaseInstance;
