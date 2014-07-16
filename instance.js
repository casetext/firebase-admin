
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

  if (!this.authTokens || this.authTokens.indexOf(token) === -1) {
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

module.exports = FirebaseInstance;
