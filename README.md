firebase-admin
==============

Programmatically instantiate and modify Firebase instances.

## Why?

For automated testing, mostly.

## Install

```npm install --save firebase-admin```

## Use

```javascript
var FirebaseAccount = require('firebase-admin');
var Firebase = require('firebase');
var account = new FirebaseAccount('me@example.com', 'password');
account.ready.then(function() {
  account.createDatabase('new-instance-name')
  .then(function(instance) {
    var fb = new Firebase(instance.toString());
  })
  .catch(function(err) {
    console.error('Oops, error creating instance:', err);
  });
});
```

## Documentation

There's JSDoc-generated [API documentation](https://casetext.github.io/firebase-admin).

## Develop

```bash
git clone https://github.com/casetext/firebase-admin
cd firebase-admin
npm test
```

Please ```jshint```. That is all.

## Caveats

- This package uses Firebase's own APIs. You can't do anything with it you can't
already do in the admin tools and Forge.
- Do not abuse the Firebase service. It's amazing and the people who work there
are amazing.

## I :heartbeat: Firebase

Big whoop, wanna fight about it?
