#!/usr/bin/env node

/**
 * DbmStore wraps GDBM methods
 *
 * exists() - Check whether a store already exists
 * path(path) - Set the path for the key/value store
 * open() - Open (or create) a key/value store
 * close() - Close the key/value store
 * read(key) - Read (fetch) the value indexed by key
 * write(key, value) - Write (store) a value indexed by key
 * delete(key) - Delete a key/value pair from the store
 * type() - Return what type of store this is
 * destroy() - Destroy the key/value store by deleting it
 */

var fs = require('fs')
  , gdbm = require('gdbm')
  , utils = require('../utils')
  , errors = require('../errors');

function DbmStore() {}
module.exports = DbmStore;

// Declare "open" and "close" as a couple of private methods

var open = function(store) {
  if (!store.filepath) throw errors.STORE_HAS_NO_PATH;
  store.db = new gdbm.GDBM();
  store.db.open(store.filepath, 0, gdbm.GDBM_WRCREAT);
};

var close = function(store) {
  if (store.db) {
    store.db.sync();
    store.db.close();
  }
  store.db = null;
};

// End of private methods

DbmStore.method('exists', function() {
  return utils.exists(this.filepath);
});

DbmStore.method('path', function(path) {
  path = utils.folderize(path);
  if (path) this.filepath = path + '.db';
  return this.filepath;
});

DbmStore.method('read', function(key) {
  open(this);
  var value = this.db.fetch(key);
  close(this);
  return value;
});

DbmStore.method('write', function(key, value) {
  open(this);
  this.db.store(key, value);
  close(this);
});

DbmStore.method('delete', function(key) {
  open(this);
  this.db.delete(key);
  this.db.reorganize(); // save space
  close(this);
});

DbmStore.method('type', function() {
  return 'dbm';
});

DbmStore.method('destroy', function() {
  if (this.filepath && this.exists()) fs.unlinkSync(this.filepath);
  this.filepath = null;
});
