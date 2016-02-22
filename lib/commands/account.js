
'use strict';

var Q = require('q');

function escape(str) {
  return (str + '').replace(/([^0-9a-z-])/gi, '\\$1');
}

module.exports = {

  bootstrap: function(account) {

    var name = Math.random().toString(36).slice(2);
    return account.createDatabase(name)
    .then(function(instance) {

      return Q.delay(1000)
      .then(function() {
        return instance.getAuthTokens();
      });

    })
    .then(function(tokens) {

      console.log('FB_NAME=' + escape(name));
      console.log('FIREBASE_URL=' + escape(name) + '.firebaseio.com');
      console.log('FIREBASE_AUTH_SECRET=' + escape(tokens[0]));

    });

  },

  create: function(account, name) {

    console.log('Creating new database' + name + '...');
    return account.createDatabase(name)
    .then(function() {
      console.log('... done!');
    });

  },

  delete: function(account, name) {

    console.log('Deleting database', name + '...');
    return account.getDatabase(name)
    .then(function(db) {
      return account.deleteDatabase(db);
    })
    .then(function() {
      console.log('... done!');
    });

  }

};
