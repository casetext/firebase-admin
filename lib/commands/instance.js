
'use strict';

var fs = require('fs'),
  Table = require('cli-table'),
  FirebaseAccount = require('../../account');

function escape(str) {
  return (str + '').replace(/([^0-9a-z-])/gi, '\\$1');
}

function UnknownCommandError(command, subcommand) {
  return new Error('Unknown command "' + command + ' ' + subcommand + '"');
}

function RequiredSubcommandError(command) {
  return new Error('You must supply a sub-command to ' + command);
}

module.exports = {

  'rules': function(instance, command, filename) {

    if (command === 'get') {

      return instance.getRules()
      .then(function(rulesObj) {

        var rulesJson = JSON.stringify(rulesObj, undefined, 2);

        if (filename) {

          fs.writeFileSync(filename, rulesJson);
          console.log('Wrote auth config to', filename, 'successfully.');

        } else {
          console.log(rulesJson);
        }

      });

    } else if (command === 'set') {

      if (filename) {

        return instance.setRules(JSON.parse(fs.readFileSync(filename)))
        .then(function() {
          console.log('Sent security rules from ', filename, 'successfully.');
        });

      } else {
        throw new Error('You must specify a filename for rules set');
      }

    } else if (!command) {
      throw new RequiredSubcommandError('rules');
    } else {
      throw new UnknownCommandError('rules', command);
    }

  },

  'auth-config': function(instance, command, filename) {

    if (command === 'get') {

      return instance.getAuthConfig()
      .then(function(authConfigObj) {

        if (authConfigObj === null) {
          authConfigObj = FirebaseAccount.defaultAuthConfig;
        }

        var authConfigJson = JSON.stringify(authConfigObj, undefined, 2);

        if (filename) {

          fs.writeFileSync(filename, authConfigJson);
          console.log('Wrote auth config to', filename, 'successfully.');

        } else {
          console.log(authConfigJson);
        }

      });

    } else if (command === 'set') {

      if (filename) {

        return instance.setAuthConfig(JSON.parse(fs.readFileSync(filename)))
        .then(function() {
          console.log('Sent auth config from', filename, 'successfully.');
        });

      } else {
        throw new Error('You must specify a filename for auth-config set');
      }

    } else if (!command) {
      throw new RequiredSubcommandError('auth-config');
    } else {
      throw new UnknownCommandError('auth-config', command);
    }

  },

  'token': function(instance, command, token) {

    if (command === 'list') {

    } else if (command === 'add') {

      return instance.addAuthToken()
      .then(function(token) {
        console.log('FIREBASE_AUTH_SECRET=' + escape(token));
      });

    } else if (command === 'remove') {

      return instance.removeAuthToken(token)
      .then(function() {
        console.log('Removed token', token, 'successfully.');
      });

    } else if (!command) {
      throw new RequiredSubcommandError('token');
    } else {
      throw new UnknownCommandError('token', command);
    }

  },

  'user': function(instance, command, email, password) {

    if (command === 'list') {

      return instance.listUsers()
      .then(function(users) {

        var totalCols = process.stdout.isTTY ? process.stdout.columns : 80;
        totalCols -= 6;

        var table = new Table({
          head: ['User ID', 'Email address', 'Date added'],
          colWidths: [
            Math.round(totalCols / 6),
            Math.round(totalCols / 2),
            Math.round(totalCols / 3)
          ]
        });

        users
        .sort(function(a, b) {
          return a.id - b.id;
        })
        .forEach(function(user) {

          table.push([
            'simplelogin:' + user.id,
            user.email,
            new Date(user.time_created)
          ]);

        });

        console.log('');
        console.log(table.toString());

      });

    } else if (command === 'add') {

      if (!email) {
        throw new Error('You must supply at least an email address to user add!');
      } else {

        var hadPassword = (password !== undefined);
        password = password || Math.random().toString(36).slice(2, 8);

        return instance.createUser(email, password)
        .then(function(user) {

          console.log('SIMPLELOGIN_UID=' + escape(user.uid));
          console.log('SIMPLELOGIN_EMAIL=' + escape(user.email));
          console.log('SIMPLELOGIN_AUTH_TOKEN=' + escape(user.token));

          if (!hadPassword) {
            console.log('SIMPLELOGIN_PASS=' + escape(password));
          }

        });

      }

    } else if (command === 'remove') {
      return instance.removeUser(email);
    } else if (command === 'reset') {

      if (!email) {
        throw new Error('You must supply an email address to user reset!');
      }

      return instance.sendPasswordResetEmail(email);

    } else if (!command) {
      throw new RequiredSubcommandError('user');
    } else {
      throw new UnknownCommandError('user', command);
    }

  }

};
