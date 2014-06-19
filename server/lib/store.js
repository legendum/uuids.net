#!/usr/bin/env node

/**
 * Store - provide a common interface to various key/value store implementations
 *         including "file" and "dbm". The store types provide these methods:
 *
 * exists() - Check whether a store already exists
 * path(path) - Get or set the file system path used by the store
 * read(key) - Read the value for a key
 * write(key, value) - Write a value for a key
 * delete(key) - Delete a key/value pair
 * type() - Return the type of the store (e.g. "json" or "dbm")
 * destroy() - Remove the store from the file system (this is not undoable!!!)
 *
 * readWrapped(key, cryptor) - Read encrypted data (cryptor is optional)
 * writeWrapped(key, value, cryptor) - Write encrypted data (cryptor optional)
 * deleteWrapped(key) - Delete encrypted data
 *
 * For the final three methods, the "wrapping" is achieved by:
 * 1) getting the digest for the key
 * 2) encrypting the value with the key
 * 3) storing the key digest paired with the encrypted value
 *
 * This *requires* one to know the key in order to read the key/value pair.
 * The system generally chooses keys that include randomly generated UUIDs. :-)
 */

var errors = require('./errors')
  , utils = require('./utils')
  , path = require('path')
  , env = process.env

  , STORE_METHODS = ['exists', 'path', 'read', 'write', 'delete', 'type', 'destroy']
  , DEFAULT_TYPE = 'dbm'; // See the "stores" folder for all store types

function Store(name, type) {
  if (!name) throw errors.STORE_HAS_NO_NAME;
  type = type || Store.defaultType;
  var Subclass = require('./stores/' + type);
  this.store = new Subclass();

  // Delegate methods to the subclass
  for (var i in STORE_METHODS) {
    var method = STORE_METHODS[i];
    this[method] = this.store[method];
  }
  this.path(path.join(env.UUIDS_STORE_PATH, name));
};
Store.defaultType = env.UUIDS_STORE_TYPE || DEFAULT_TYPE;

module.exports = Store;

Store.method('writeWrapped', function(key, value, cryptor) {
  var keyDigest = utils.digest(key)
    , cryptor = cryptor || key
    , wrappedData = utils.wrap(value, cryptor + env.UUIDS_SECRET_KEY);
  utils.lock(this.path());
  this.write(keyDigest, wrappedData);
  utils.unlock(this.path());
});

Store.method('readWrapped', function(key, cryptor) {
  var keyDigest = utils.digest(key)
    , cryptor = cryptor || key
    , data;
  utils.waitWhileLocked(this.path());
  data = this.read(keyDigest);
  return data ? utils.unwrap(data, cryptor + env.UUIDS_SECRET_KEY) : null;
});

Store.method('deleteWrapped', function(key) {
  var keyDigest = utils.digest(key);
  this.delete(keyDigest);
});
