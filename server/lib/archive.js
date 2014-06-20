#!/usr/bin/env node

/**
 * Archive - read files from and write files to the AWS S3 cloud storage service
 */

var fs = require('fs')
  , path = require('path')
  , AWS = require('aws-sdk')
  , HttpStatus = require('http-status-codes')
  , Store = require('./store')
  , utils = require('./utils')
  , env = process.env;

function Archive() {
  this.S3 = new AWS.S3();
  this.store = new Store('restores');
}
module.exports = new Archive();

function nextTick(next) {
  process.nextTick(function() {
    try {
      next(null);
    } catch (err) { // e.g. a locked file
      next(err);
    }
  });
}

function aws(archive, method, filepath, next) {
  var bucket = env.UUIDS_BUCKET_NAME
    , filename = path.basename(filepath)
    , params = {Bucket: bucket, Key: filename};

  if (method == 'putObject') params.Body = fs.createReadStream(filepath);

  if (env.AWS_PROFILE) {
    utils.lock(filepath);
    archive.S3[method](params, function (err) {
      if (err) return next(err);
      archive.restored(filename, 'delete');
      utils.unlock(filepath);
      next(null);
    });
  } else {
    nextTick(next);
  }
}

Archive.method('delete', function(filepath, next) {
  aws(this, 'deleteObject', filepath, next);
});

Archive.method('save', function(filepath, next) {
  aws(this, 'putObject', filepath, next);
});

Archive.method('restore', function(filepath, next) {
  var my = this
    , bucket = env.UUIDS_BUCKET_NAME
    , code
    , filename = path.basename(filepath)
    , params = {Bucket: bucket, Key: filename}
    , wstream;

  if (utils.exists(filepath) || this.restored(filename) || !env.AWS_PROFILE) {
    nextTick(next);
  } else { // no file, and no restore attempt made, and we have an AWS profile
    wstream = null;
    utils.lock(filepath);
    this.S3.getObject(params)
      .on('httpHeaders', function(statusCode) { code = statusCode })
      .on('httpData', function(chunk) {
        if (code == HttpStatus.OK) {
          wstream = wstream || fs.createWriteStream(filepath + '.restore');
          wstream.write(chunk);
        }
      }).on('httpDone', function() {
        my.restored(filename, utils.time());
        if (wstream) {
          wstream.on('finish', function() {
            fs.rename(filepath + '.restore', filepath, function(err) {
              utils.unlock(filepath);
              next(err, code);
            });
          }).on('error', function(err) {
            utils.unlock(filepath);
            next(err, code);
          });
          wstream.end(); // causes the "finish" event to be emitted
        } else {
          utils.unlock(filepath);
          next(null, code); // object wasn't found in S3 (probably)
        }
      }).send();
  }
});

// We use a "restored" key/value store to keep track of the files we've
// requested from AWS S3. This way, we don't repeatedly request the same
// files. When we want to save an updated version to AWS S3, we use the
// command "uuids archive <file>" which sends a copy of the file to S3,
// then deletes the local copy and the record in the "restored" store.
// This means that when we come to restore the file, it won't be found
// locally, nor will it have any record of being restored, and hence it
// is requested from AWS S3 and, if found, reinstated just like before.
Archive.method('restored', function(filename, time) {
  if (time) {
    if (time == 'delete') {
      return this.store.deleteWrapped(filename);
    } else {
      return this.store.writeWrapped(filename, time);
    }
  } else {
    return this.store.readWrapped(filename);
  }
});

Archive.method('active', function(filepath, next) {
  return env.AWS_PROFILE ? true : false;
});

Archive.method('destroy', function() {
  this.store.destroy();
});
