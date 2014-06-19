#!/usr/bin/env node

/**
 * The Secrets class manages account access permissions. Every account has a
 * secret key which is needed to perform operations (e.g. storing files). This
 * class is used to create new secret keys, check whether account secret keys
 * exist, and get the secret key for an account in order to perform operations.
 * 
 * The store holds key/value pairs where:
 *
 * key:   digest(nameDigest)
 * value: encrypt([noise, hash, noise, key, noise], nameDigest + passwordDigest)
 *
 * ...where "hash" is the scrypt password hash and "key" is the secret key for
 * the account. Accounts may retrieve their secret key by providing both the
 * nameDigest and passwordDigest. Note, if either is forgotten then the account
 * is useless. (Noise is added to make brute-force decryption extremely hard).
 *
 * Methods:
 *
 * secrets.create(nameDigest, passwordDigest, next)
 * secrets.access(nameDigest, passwordDigest, next)
 * secrets.changePassword(nameDigest, passwordDigest, newPasswordDigest, next)
 * secrets.delete(nameDigest, passwordDigest, next)
 * secrets.destroy() // deletes *all* secrets!
 */

var Store = require('./store')
  , utils = require('./utils')
  , errors = require('./errors')
  , SCRYPT_HASH = 1 // position of password scrypt hash
  , SECRET_KEY = 3; // position of account's secret key

function Secrets() {
  this.store = new Store('secrets');
}
module.exports = new Secrets();

Secrets.method('create', function(nameDigest, passwordDigest, next) {
  var data = this.store.readWrapped(nameDigest, nameDigest + passwordDigest)
    , my = this
    , key = utils.uuid()
    , noise = function() {
      return utils.uuid().substr(parseInt(Math.random() * 18), parseInt(Math.random() * 18));
    }

  if (data) return next(errors.ACCOUNT_EXISTS);

  utils.scrypt(passwordDigest, function(err, hash) {
    if (err) return next(err.scrypt_err_message);
    data = [noise(), hash, noise(), key, noise()];
    my.store.writeWrapped(nameDigest, data, nameDigest + passwordDigest);
    next(null, data[SECRET_KEY]);
  });
});

Secrets.method('access', function(nameDigest, passwordDigest, next) {
  var data = this.store.readWrapped(nameDigest, nameDigest + passwordDigest);
  if (!data) return next(errors.ACCOUNT_MISMATCH);

  utils.scryptMatch(passwordDigest, data[SCRYPT_HASH], function(err, isMatch) {
    if (err) return next(err.scrypt_err_message);
    next(null, isMatch ? data[SECRET_KEY] : null);
  });
});

Secrets.method('changePassword', function(nameDigest, passwordDigest, newPasswordDigest, next) {
  var data = this.store.readWrapped(nameDigest, nameDigest + passwordDigest)
    , my = this;
  if (!data) return next(errors.ACCOUNT_MISMATCH);

  utils.scryptMatch(passwordDigest, data[SCRYPT_HASH], function(err, isMatch) {
    if (err) return next(err.scrypt_err_message);
    if (isMatch) {
      utils.scrypt(newPasswordDigest, function(err, hash) {
        if (err) return next(err.scrypt_err_message);
        data[SCRYPT_HASH] = hash;
        my.store.writeWrapped(nameDigest, data, nameDigest + newPasswordDigest);
        next(null, data[SECRET_KEY]);
      });
    } else {
      next(errors.ACCOUNT_MISMATCH);
    }
  });
});

Secrets.method('delete', function(nameDigest, passwordDigest, next) {
  var data = this.store.readWrapped(nameDigest, nameDigest + passwordDigest)
    , my = this;

  if (!data) return next(errors.ACCOUNT_MISMATCH);

  utils.scryptMatch(passwordDigest, data[SCRYPT_HASH], function(err, isMatch) {
    my.store.deleteWrapped(nameDigest);
    next(null);
  });
});

Secrets.method('destroy', function() {
  this.store.destroy();
});
