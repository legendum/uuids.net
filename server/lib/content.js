#!/usr/bin/env node

/**
 * Content - upload and download file content by using zipping and encryption
 */

var fs = require('fs')
  , crypto = require('crypto')
  , zlib = require('zlib')
  , path = require('path')
  , env = process.env

  , asyncblock = require('asyncblock')
  , HttpStatus = require('http-status-codes')

  , Usage = require('./usage')
  , accounts = require('./accounts')
  , archive = require('./archive')
  , errors = require('./errors')
  , utils = require('./utils');

function Content() {}
module.exports = new Content();

Content.method('download', function(req, res, next) {
  var my = this, params = req.params;
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket.getFile(params.filename, function(err, file) {
        if (err) return next(err);
        archive.restore(file.path(), function(err) {
          if (err) return next(err);
          my.downloadFile(file, res, next);
        });
      });
    });
  });
});

Content.method('downloadFile', function(file, res, next) {
  var rstream, contentPath = file.path(), secret = file.secret();
  if (!contentPath) return next(errors.FILE_NO_CONTENT);
  rstream = fs.createReadStream(contentPath);

  if (utils.isLocked(contentPath)) {
    return next(errors.FILE_BUSY);
  }
  res.writeHead(HttpStatus.OK, {'Content-Type': file.type()});
  rstream
    .pipe(crypto.createDecipher('aes-256-cbc', file.uuid + contentPath + secret + env.UUIDS_SECRET_KEY))
    .pipe(zlib.createGunzip())
    .pipe(res)
    .on('finish', function(err) {
      var usageObject;
      if (err) return next(err);
      new Usage(file.usage(), function(err, usageObject) {
        usageObject.readBytes(file.size());
        next();
      });
    });
});

Content.method('upload', function(req, res, next) {
  var my = this
    , params = req.params
    , uploaded;
  if (req.files) {
    if (req.files['files[]']) req.files.file = req.files['files[]'];
    if (req.files.file) uploaded = req.files.file;
    params.filename = params.filename || req.files.file.name;
  } else {
    return next(errors.FILE_MISSING);
  }
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      var files = bucket ? (bucket.files() || {}) : {}
        , method = files[params.filename] ? 'getFile' : 'createFile';
      if (err) return next(err);
      bucket[method](params.filename, function(err, file) {
        if (err) return next(err);
        my.processFile(file, uploaded, function(err, fileData, sizeDiff) {
          if (err) return next(err);
          res.send(HttpStatus.OK, {
            file: {
              name: fileData.name
            , size: fileData.size
            , type: fileData.type
            , uuidDigest: utils.digest(file.uuid)
            }
          });
          if (uploaded) account.usageObject.writeBytes(fileData.size);
          if (sizeDiff) account.usageObject.storeBytes(sizeDiff);
          bucket.measureFileAction(file, filename, 'write', next);
        });
      });
    });
  });
});

Content.method('processFile', function(file, uploaded, next) {
  var data
    , origSize = 0
    , rstream
    , wstream;

  data = file.meta();
  if (!uploaded) {
    return next(null, data);
  }

  if (data.path) {
    if (!utils.exists(data.path)) return next(errors.FILE_NO_CONTENT);
    origSize = utils.stat(data.path).size;
  } else {
    data.path = this.newContentPath();
  }

  if (utils.isLocked(data.path)) {
    return next(errors.FILE_BUSY);
  }
  utils.lock(data.path);
  rstream = fs.createReadStream(uploaded.path);
  wstream = fs.createWriteStream(data.path);
  rstream
    .pipe(zlib.createGzip())
    .pipe(crypto.createCipher('aes-256-cbc', file.uuid + data.path + data.secret + env.UUIDS_SECRET_KEY))
    .pipe(wstream)
    .on('finish', function(err) {
      if (err) return next(err);
      utils.unlock(data.path);
      utils.unlink(uploaded.path);
      data.updated = utils.time();
      data.size = uploaded.size;
      data.type = uploaded.type;
      file.meta(data);
      next(null, data, utils.stat(data.path).size - origSize);
    });
});

Content.method('newContentPath', function() {
  var contentPath;
  do {
    contentPath = utils.folderize(
                    path.join(env.UUIDS_BLOBS_PATH, utils.uuid())
                  ) + '.blob';
  } while (utils.exists(contentPath));
  return contentPath;
});
