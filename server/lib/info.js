#!/usr/bin/env node

/**
 * Info - wrap a key/value store with "get" and "set" methods, plus a "meta" 
 *        method that handily stores metadata about the key/value store.
 *
 * create(uuid) - Create a store, using a UUID to identify it
 * meta(data) - Get/set meta data about the store (only pass "data" to update)
 * infoPath() - Get the path to the file holding the info
 * infoSize() - Get the size of the file holding the info
 * get(key, cryptor) - Get a key (the cryptor is an optional string)
 * set(key, value, cryptor) - Set a key value (cryptor is an optional string)
 * unset(key) - Unset a key/value pair
 * destroy() - Destroy the store (this is not undoable unless you keep backups)
 * destroyInfo() - Alias to the "destroy" method so we can call from subclasses
 *
 * The "Info" class also provides a handy "Info.properties()" method to set a
 * list of properties, where each one will have its own getter/setter method.
 * These methods update the store's metadata. Examples are "name" or "created".
 */

var asyncblock = require('asyncblock')
  , Store = require('./store')
  , utils = require('./utils')
  , errors = require('./errors')
  , archive = require('./archive')

  , MAX_INFO_SIZE = 2097152 // 2 MiB
  , MAX_KEY_LENGTH = 2048
  , MAX_VALUE_LENGTH = 16384;

function Info(uuid, type) {
  this.create(uuid, type);
}
module.exports = Info;

function validateKey(key) {
  if (typeof key !== 'string') throw errors.KEY_WRONG_TYPE;
  if (key.length === 0) throw errors.KEY_MISSING;
  if (key.length > MAX_KEY_LENGTH) throw errors.KEY_TOO_LONG;
}

function validateValue(value) {
  if (JSON.stringify(value).length > MAX_VALUE_LENGTH) {
    throw errors.VALUE_TOO_LONG;
  }
}

function validateInfoSize(size) {
  if (size > MAX_INFO_SIZE) {
    throw errors.INFO_SIZE_TOO_BIG;
  }
}

// We use S3 archival for Account, Bucket, File, Usage subclasses
Info.method('createFromArchive', function(uuid, type, next) {
  var my = this, path;
  if (typeof type == 'function') { // "type" is optional
    next = type;
    type = null;
  }
  asyncblock(function(flow) {
    do {
      my.uuid = uuid || utils.uuid();
      path = utils.digest(my.uuid + 'info');
      my.store = new Store(path, type);
      archive.restore(my.store.path(), flow.add());
      flow.wait();
    } while (!uuid && my.store.exists());
    next(null);
  });
});

Info.method('create', function(uuid, type) {
  do {
    this.uuid = uuid || utils.uuid();
    this.store = new Store(utils.digest(this.uuid + 'info'), type);
  } while (!uuid && this.store.exists());
});

Info.method('meta', function(data) {
  if (data) {
    this.store.writeWrapped(this.uuid, data);
  } else {
    data = this.store.readWrapped(this.uuid) || {};
  }
  return data;
});

Info.method('infoPath', function(data) {
  return this.store ? this.store.path() : null;
});

Info.method('infoSize', function() {
  var stat = utils.stat(this.infoPath());
  return typeof stat === 'object' ? stat.size : 0;
});

Info.method('get', function(key, cryptor) {
  validateKey(key);
  return this.store.readWrapped(this.uuid + key, cryptor)
});

Info.method('set', function(key, value, cryptor) {
  validateKey(key);
  validateValue(value);
  validateInfoSize(this.infoSize());
  this.store.writeWrapped(this.uuid + key, value, cryptor);
});

Info.method('unset', function(key, cryptor) {
  validateKey(key);
  this.store.deleteWrapped(this.uuid + key, cryptor)
});

Info.method('destroy', function(next) {
  this.destroyInfo(next);
});

Info.method('destroyInfo', function(next) {
  this.store.destroy();
  if (next) next();
});

Info.properties = function(clss, properties) {
  for (var i in properties) {
    (function(property) {
      clss.method(property, function(value) {
        data = this.meta();
        if (value) {
          data[property] = value;
          this.meta(data);
        }
        return data[property];
      });
    })(properties[i]);
  }
};
