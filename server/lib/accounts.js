#!/usr/bin/env node

/**
 * Accounts - manage account lifecycle (create, signin, access, logout, delete)
 */

var Account = require('./account')
  , sessions = require('./sessions')
  , secrets = require('./secrets')
  , errors = require('./errors')
  , utils = require('./utils');

function Accounts() {}
module.exports = new Accounts();

Accounts.method('create', function(nameDigest, passwordDigest, next) {
  secrets.create(nameDigest, passwordDigest, function(err, secretKey) {
    if (err) return next(err);
    new Account(secretKey, function(err, account) {
      if (err) return next(err);
      var sessionPartKey = sessions.create(secretKey);
      next(null, sessionPartKey); 
    });
  });
});

Accounts.method('delete', function(nameDigest, passwordDigest, next) {
  secrets.access(nameDigest, passwordDigest, function(err, secretKey) {
    if (err || !secretKey) return next(errors.ACCOUNT_MISMATCH);
    secrets.delete(nameDigest, passwordDigest, function(err) {
      if (err) return next(errors.ACCOUNT_MISMATCH);
      new Account(secretKey, function(err, account) {
        if (err) return next(err);
        account.destroy(function(err) {
          next(err, true);
        });
      });
    });
  });
});

Accounts.method('signin', function(nameDigest, passwordDigest, next) {
  secrets.access(nameDigest, passwordDigest, function(err, secretKey) {
    if (err) next(err);
    var sessionPartKey = sessions.create(secretKey);
    next(null, sessionPartKey); 
  });
});

Accounts.method('access', function(nameDigest, sessionPartKey, next) {
  var account
    , secretKey = sessions.access(sessionPartKey);
  if (!secretKey) return next(errors.SESSION_EXPIRED);
  new Account(secretKey, function(err, account) {
    if (err) return next(err);
    account.checkUsage(next);
  });
});

Accounts.method('changePassword', function(nameDigest, passwordDigest, newPasswordDigest, next) {
  secrets.changePassword(nameDigest, passwordDigest, newPasswordDigest, function(err, secretKey) {
    if (err) return next(err);
    var sessionPartKey = sessions.create(secretKey);
    next(null, sessionPartKey); 
  });
});

Accounts.method('logout', function(nameDigest, sessionPartKey, next) {
  sessions.delete(sessionPartKey);
  if (next) next(null, true);
});
