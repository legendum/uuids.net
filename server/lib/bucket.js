#!/usr/bin/env node

/**
 * Bucket - manage files in a bucket, and sharing of the files and the bucket
 */

var when = require('when')
  , Info = require('./info')
  , File = require('./file')
  , utils = require('./utils')
  , errors = require('./errors')
  , shares = require('./shares')
  , PROPERTIES = ['created', 'name', 'files', 'shares', 'usage'];

function Bucket(uuid, next) {
  var bucket = this;
  if (!uuid) throw errors.UUID_MISSING;
  this.createFromArchive(uuid, function(err) {
    next(err, bucket);
  });
}
Bucket.prototype.__proto__ = Info.prototype;
Info.properties(Bucket, PROPERTIES);
module.exports = Bucket;

Bucket.method('details', function(next) {
  var files = this.files() || {}
    , shared = this.shares() || {}
    , created = this.created();
  next(null, {files: files, shares: shared, created: created});
});

Bucket.method('createFile', function(filename, next) {
  var my = this
    , uuid = this.objectUuid(filename)
  if (uuid) return next(errors.FILE_EXISTS);
  new File(null, function(err, file) {
    var files
      , now;
    if (err) return next(err);
    now = utils.time();
    files = my.files() || {};
    files[filename] = {
      size: 0
    , reads: 0
    , writes: 0
    , created: now
    , updated: now
    };
    my.files(files);
    my.objectUuid(filename, file.uuid);
    file.meta({
      name: filename
    , size: 0
    , type: null
    , usage: my.usage()
    , secret: utils.uuid()
    , created: now
    , updated: now
    });
    file.usageObject().storeBytes(file.infoSize());
    next(null, file);
  });
});

Bucket.method('getFile', function(filename, next) {
  var my = this
    , uuid = this.objectUuid(filename);
  if (!uuid) return next(errors.FILE_MISSING);
  new File(uuid, function(err, file) {
    if (err) return next(err);
    my.measureFileAction(file, filename, 'read', next);
  });
});

Bucket.method('updateFileData', function(filename, data, next) {
  var my = this;
  this.getFile(filename, function(err, file) {
    if (err) return next(err);
    for (var key in data) {
      file.write(key, data[key]);
    }
    my.measureFileAction(file, filename, 'write', next);
  });
});

Bucket.method('measureFileAction', function(file, filename, action, next) {
  var files = this.files() || {};
  if (!files[filename]) return next(errors.FILE_MISSING);
  switch (action) {
    case 'read':
      files[filename].reads += 1;
      break;
    case 'write':
      files[filename].writes += 1;
      files[filename].updated = file.updated(utils.time());
      break;
    default:
      return next(errors.BAD_PARAMETERS);
  } 
  this.files(files);
  next(null, file);
});

Bucket.method('renameFile', function(filename, newFilename, next) {
  var my = this
    , uuid = this.objectUuid(filename);
  if (!uuid) return next(errors.FILE_MISSING);
  new File(uuid, function(err, file) {
    var files;
    if (err) return next(err);
    file.name(newFilename);
    my.objectUuid(filename, false);
    my.objectUuid(newFilename, file.uuid);
    files = my.files();
    files[newFilename] = files[filename];
    delete(files[filename]);
    my.files(files);
    next(null, file);
  });
});

Bucket.method('deleteFile', function(filename, next) {
  var my = this
    , uuid = this.objectUuid(filename);
  if (!uuid) return next(errors.FILE_MISSING);
  new File(uuid, function(err, file) {
    if (err) return next(err);
    file.destroy(function (err) {
      if (err) return next(err);
      var files = my.files() || {};
      delete files[filename];
      my.files(files);
      my.objectUuid(filename, false);
      my.deleteShares(filename);
      next(null, file);
    });
  });
});

Bucket.method('share', function(next) {
  var sharePartUuid = shares.create(this.uuid)
    , shared = this.shares() || {};
  shared[sharePartUuid] = {type: 'bucket', active: true, created: utils.time()};
  this.shares(shared);
  next(null, sharePartUuid);
});

Bucket.method('shareFile', function(filename, next) {
  var my = this;
  this.getFile(filename, function(err, file) {
    if (err) return next(err);
    var sharePartUuid = shares.create(file.uuid)
      , shared = my.shares() || {};
    shared[sharePartUuid] = {type: 'file', name: filename, active: true, created: utils.time()};
    my.shares(shared);
    next(null, sharePartUuid);
  });
});

Bucket.method('toggleShare', function(sharePartUuid, next) {
  var shared = this.shares() || {};
  shared[sharePartUuid].active = !shared[sharePartUuid].active;
  shares.toggle(sharePartUuid);
  this.shares(shared);
  if (next) next(null, shared); // optional async
});

Bucket.method('deleteShare', function(sharePartUuid, next) {
  var shared = this.shares() || {};
  delete shared[sharePartUuid];
  shares.delete(sharePartUuid);
  this.shares(shared);
  if (next) next(null, shared); // optional async
});

Bucket.method('deleteShares', function(filename, next) {
  var shared = this.shares() || {};
  for (var sharePartUuid in shared) {
    if (shared[sharePartUuid].name == filename) {
      delete shared[sharePartUuid];
      shares.delete(sharePartUuid);
    }
  }
  this.shares(shared);
  if (next) next(); // optional async
});

Bucket.method('destroy', function(next) {
  var my = this
      deferreds = [];
      files = this.files() || {};

  function destroyFile(uuid) {
    var deferred = when.defer();
    new File(uuid, function(err, file) {
      if (err) return deferred.reject(err);
      file.destroy(function(err) {
        if (err) return deferred.reject(err);
        deferred.resolve(true);
      });
    });
    return deferred.promise;
  }

  for (var filename in files) {
    var uuid = this.objectUuid(filename)
    if (!uuid) return next(errors.FILE_MISSING);
    this.deleteShares(filename);
    deferreds.push(destroyFile(uuid));
  }
  when.all(deferreds).then(function() {
    my.destroyInfo(next);
  });
});
