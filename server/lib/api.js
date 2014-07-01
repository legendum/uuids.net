#!/usr/bin/env node

/**
 * API - a clean and simple REST API to the UUIDs server
 */

var restify = require('restify')
  , HttpStatus = require('http-status-codes')

  , Bucket = require('./bucket')
  , File = require('./file')
  , accounts = require('./accounts')
  , invites = require('./invites')
  , quotas = require('./quotas')
  , content = require('./content')
  , cookie = require('./cookie')
  , errors = require('./errors')
  , shares = require('./shares')
  , utils = require('./utils')

  , VERSION = '1.0.0'
  , BASIC_AUTH = 1 // to require the nameDigest and session over Basic Auth
  , NO_AUTH = 0

  , ROUTES = {
      // HTTP method, the path, the parameter list when using POST and JSON root
      signup: ['POST', '/signup', ['nameDigest', 'passwordDigest', 'invitation'], 'session']
    , login: ['POST', '/login', ['nameDigest', 'passwordDigest'], 'session']
    , changePassword: ['POST', '/password',  ['nameDigest', 'passwordDigest', 'newPasswordDigest'], 'session']
    , logout: ['POST', '/logout', BASIC_AUTH, 'ok']
    , quota: ['POST', '/quota/:quotaUuid', BASIC_AUTH, 'usage']
    , usage: ['GET', '/usage', BASIC_AUTH, 'usage']
    , deleteAccount: ['POST', '/leave', ['nameDigest', 'passwordDigest'], 'ok']
    , createBucket: ['POST', '/bucket/:bucketName', BASIC_AUTH]
    , getBuckets: ['GET', '/buckets', BASIC_AUTH, 'buckets']
    , getBucket: ['GET', '/bucket/:bucketName', BASIC_AUTH]
    , renameBucket: ['POST', '/bucket/:bucketName/rename/:newBucketName', BASIC_AUTH]
    , deleteBucket: ['POST', '/bucket/:bucketName/delete', BASIC_AUTH]
    , getBucketFile: ['GET', '/bucket/:bucketName/file/:filename', BASIC_AUTH]
    , getBucketFileKey: ['GET', '/bucket/:bucketName/file/:filename/:key', BASIC_AUTH]
    , setBucketFileData: ['POST', '/bucket/:bucketName/file/:filename/data', BASIC_AUTH]
    , uploadBucketFiles: ['POST', '/bucket/:bucketName/upload', BASIC_AUTH]
    , uploadBucketFile: ['POST', '/bucket/:bucketName/file/:filename', BASIC_AUTH]
    , renameBucketFile: ['POST', '/bucket/:bucketName/file/:filename/rename/:newFilename', BASIC_AUTH]
    , moveBucketFile: ['POST', '/bucket/:bucketName/file/:filename/move/:newBucketName', BASIC_AUTH]
    , deleteBucketFile: ['POST', '/bucket/:bucketName/file/:filename/delete', BASIC_AUTH]
    , shareBucket: ['POST', '/bucket/:bucketName/share', BASIC_AUTH]
    , shareBucketFile: ['POST', '/bucket/:bucketName/file/:filename/share', BASIC_AUTH]
    , unshareBucketFile: ['POST', '/bucket/:bucketName/file/:filename/unshare', BASIC_AUTH]
    , shareBucketFileOnce: ['POST', '/bucket/:bucketName/file/:filename/share/once', BASIC_AUTH]
    , toggleShare: ['POST', '/bucket/:bucketName/share/:uuidSharedPart/toggle', BASIC_AUTH]
    , deleteShare: ['POST', '/bucket/:bucketName/share/:uuidSharedPart/delete', BASIC_AUTH]
    , getSharedBucketFileKey: ['GET', '/shared/bucket/:uuidSharedPart/file/:filename/:key']
    , getSharedBucketFile: ['GET', '/shared/bucket/:uuidSharedPart/file/:filename']
    , getSharedBucket: ['GET', '/shared/bucket/:uuidSharedPart']
    , getSharedFileKey: ['GET', '/shared/file/:uuidSharedPart/:key']
    , getSharedFile: ['GET', '/shared/file/:uuidSharedPart']
    , version: ['GET', '/version', null, 'version']
    };

function API() { this.VERSION = VERSION }
module.exports = new API();

// This is a little factory to return a bucket or file name and its UUID
function fnReturnDetails(next, hash) {
  var type, name, data = {}, result = {};
  for (var key in hash) {
    if (key == 'file' || key == 'bucket') {
      type = key;
      name = hash[key];
    } else {
      data[key] = hash[key];
    }
  }
  return function(err, object) {
    if (err) return next(err);
    result[type] = {
      name: name
    , uuidDigest: utils.digest(object.uuid)
    };
    for (var key in data) {
      result[type][key] = data[key];
    }
    next(null, result);
  }
}

API.method('paramMissing', function(params, paramsNeeded) {
  try {
    for (var i in paramsNeeded) {
      var param = paramsNeeded[i];
      if (typeof params[param] === 'undefined') {
        throw new Error('param "' + param + '" is missing');
      }
    }
    return false;
  } catch (e) {
    return e;
  }
});

API.method('createResponse', function(action, auth, jsonRoot) {
  var err, my = this;

  function sendError(res, err, next) {
    res.setHeader('Content-Type', 'application/json');
    res.send(err.code || HttpStatus.BAD_REQUEST, {error: err.message});
    return next(false);
  }

  return function(req, res, next) {
    var cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    if (typeof auth === 'object') { // alternative use as a params list
      if (err = my.paramMissing(req.params, auth)) {
        return sendError(res, err, next);
      }
      auth = NO_AUTH;
    } else if (auth === BASIC_AUTH) {
      if (req.username && req.username != 'anonymous') {
        req.params.nameDigest = req.username;
        req.params.sessionPartKey = req.authorization.basic.password;
      } else if (cookies.nameDigest && cookies.session) { // hack for downloads!
        req.params.nameDigest = cookies.nameDigest;
        req.params.sessionPartKey = cookies.session;
      } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="UUIDs"');
        return next(new restify.UnauthorizedError());
      }
    }
    try {
      my[action](req.params, function(err, data) {

        // Error, so send it as JSON
        if (err) return sendError(res, err, next);

        // If "data" is a function we call it with the response object.
        // This is a way to provide extra capabilities to some methods.
        if (typeof data === 'function') {
          return data(req, res, function(err) {
            if (err) return sendError(res, err, next);
            next(false);
          });
        }

        // If we have a JSON root, then wrap the data with it
        if (jsonRoot) {
          var response = {};
          response[jsonRoot] = data;
          data = response;
        }

        // Send the data as JSON (the most usual flow)
        res.setHeader('Content-Type', 'application/json');
        res.send(HttpStatus.OK, data);
        return next(false);
      });
    } catch (err) {
      sendError(res, err, next);
    }
  };
});

API.method('setupRoutes', function(server, next) {
  for (var action in ROUTES) {
    var spec = ROUTES[action]
      , method = spec[0].toLowerCase()
      , path = spec[1]
      , auth = spec[2]
      , jsonRoot = spec[3];
    server[method](path, this.createResponse(action, auth, jsonRoot));
  }
  if (next) next();
});

API.method('signup', function(params, next) {
  if (invites.access(params.invitation)) {
    accounts.create(params.nameDigest, params.passwordDigest, function(err, sessionPartKey) {
      if (err) return next(err);
      invites.delete(params.invitation); // successful, so delete the invitation
      next(null, sessionPartKey);
    });
  } else {
    next(errors.INVITATION_NEEDED);
  }
});

API.method('login', function(params, next) {
  accounts.login(params.nameDigest, params.passwordDigest, next);
});

API.method('changePassword', function(params, next) {
  accounts.changePassword(params.nameDigest, params.passwordDigest, params.newPasswordDigest, next);
});

API.method('logout', function(params, next) {
  accounts.logout(params.nameDigest, params.sessionPartKey, next);
});

API.method('quota', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    var quotaToAdd, usage;
    if (err) return next(err);
    quotaToAdd = parseInt(quotas.access(params.quotaUuid));
    if (!quotaToAdd) return next(errors.QUOTA_MISSING);
    quotas.delete(params.quotaUuid); // so we can't use the quota twice
    account.usageObject.quota(account.usageObject.quota() + quotaToAdd);
    usage = account.usageObject.meta();
    next(null, usage);
  });
});

API.method('usage', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    var usage;
    if (err) return next(err);
    usage = account.usageObject.meta();
    next(null, usage);
  });
});

API.method('deleteAccount', function(params, next) {
  accounts.delete(params.nameDigest, params.passwordDigest, next);
});

API.method('createBucket', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.createBucket(params.bucketName, fnReturnDetails(next, {bucket: params.bucketName}));
  });
});

API.method('getBuckets', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBuckets(next);
  });
});

API.method('getBucket', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket.details(function(err, details) {
        if (err) return next(err);
        details.bucket = params.bucketName;
        var callback = fnReturnDetails(next, details);
        callback(null, bucket);
      });
    });
  });
});

API.method('renameBucket', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    var buckets;
    if (err) return next(err);
    buckets = account.buckets() || {};
    if (buckets[params.newBucketName]) return next(errors.BUCKET_EXISTS);
    account.renameBucket(params.bucketName, params.newBucketName, fnReturnDetails(next, {bucket: params.newBucketName}));
  });
});

API.method('deleteBucket', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.deleteBucket(params.bucketName, fnReturnDetails(next, {bucket: params.bucketName}));
  });
});

API.method('getBucketFile', function(params, next) {
  next(null, function(req, res, next2) {
    content.download(req, res, next2);
  });
});

API.method('getBucketFileKey', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket.getFile(params.filename, function(err, file) {
        var callback, data = {};
        if (err) return next(err);
        data[params.key] = file.get(params.key)
        callback = fnReturnDetails(next, {
          file: params.filename
        , data: data
        });
        callback(null, file);
      });
    });
  });
});

// Note that params.data is a hash of data to update the file
// and the file is created if it doesn't exist in the bucket.
API.method('setBucketFileData', function(params, next) {
  var data = params.data || {};
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return next(errors.JSON_MALFORMED);
    }
  }
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      var files = bucket.files() || {}
        , callback = fnReturnDetails(next, {file: params.filename});
      if (err) return next(err);
      if (files[params.filename]) {
        bucket.updateFileData(params.filename, data, callback);
      } else {
        bucket.createFile(params.filename, function(err, file) {
          if (err) return next(err);
          bucket.updateFileData(params.filename, data, callback);
        });
      }
    });
  });
});

// Note the file are created if they don't exist in the bucket.
API.method('uploadBucketFiles', function(params, next) {
  next(null, function(req, res, next2) {
    content.upload(req, res, next2);
  });
});

// Note the file is created if it doesn't exist in the bucket.
API.method('uploadBucketFile', function(params, next) {
  next(null, function(req, res, next2) {
    content.upload(req, res, next2);
  });
});

API.method('renameBucketFile', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      var files;
      if (err) return next(err);
      files = bucket.files() || {};
      if (files[params.newFilename]) return next(errors.FILE_EXISTS);
      bucket.renameFile(params.filename, params.newFilename, fnReturnDetails(next, {file: params.newFilename}));
    });
  });
});

API.method('moveBucketFile', function(params, next) {
  var filename = params.filename;
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      var files, uuid;
      if (err) return next(err);
      files = bucket.files() || {};
      uuid = bucket.objectUuid(filename);
      if (!files[filename] || !uuid) return next(errors.FILE_MISSING);
      account.getBucket(params.newBucketName, function(err, newBucket) {
        var newFiles;
        if (err) return next(err);
        newFiles = newBucket.files() || {};
        if (newFiles[filename]) return next(errors.FILE_EXISTS);
        newBucket.objectUuid(filename, uuid);
        bucket.objectUuid(filename, false);
        bucket.deleteShares(filename);
        newFiles[filename] = files[filename];
        newBucket.files(newFiles);
        delete(files[filename]);
        bucket.files(files);
        newBucket.details(next);
      });
    });
  });
});

API.method('deleteBucketFile', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket.deleteFile(params.filename, fnReturnDetails(next, {file: params.filename}));
    });
  });
});

API.method('shareBucket', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket.share(function(err, uuidSharedPart) {
        var callback, share = {
          type: 'bucket'
        , name: params.bucketName
        , uuid: uuidSharedPart
        };
        if (err) return next(err);
        callback = fnReturnDetails(next, {
          bucket: params.bucketName
        , share: share
        });
        callback(null, bucket);
      });
    });
  });
});

API.method('shareBucketFile', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      var options = {once: !!params.once};
      if (err) return next(err);
      bucket.shareFile(params.filename, options, function(err, uuidSharedPart) {
        var callback, share = {
          type: 'file'
        , name: params.filename
        , uuid: uuidSharedPart
        , once: options.once
        };
        if (err) return next(err);
        callback = fnReturnDetails(next, {
          bucket: params.bucketName
        , share: share
        });
        callback(null, bucket);
      });
    });
  });
});

API.method('shareBucketFileOnce', function(params, next) {
  params.once = true;
  this.shareBucketFile(params, next);
});

API.method('unshareBucketFile', function(params, next) {
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket.deleteShares(params.filename, function(err) {
        if (err) return next(err);
        next(null, {ok: true});
      });
    });
  });
});

API.method('toggleShare', function(params, next, method) {
  method = method || 'toggleShare';
  accounts.access(params.nameDigest, params.sessionPartKey, function(err, account) {
    if (err) return next(err);
    account.getBucket(params.bucketName, function(err, bucket) {
      if (err) return next(err);
      bucket[method](params.uuidSharedPart, function(err, shared) {
        var callback;
        if (err) return next(err);
        callback = fnReturnDetails(next, {
          bucket: params.bucketName
        , shares: shared
        });
        callback(null, bucket);
      });
    });
  });
});

API.method('deleteShare', function(params, next) {
  this.toggleShare(params, next, 'deleteShare');
});

API.method('getSharedBucket', function(params, next) {
  var share = shares.access(params.uuidSharedPart)
    , bucketUuid = share ? share.uuid : null
    , bucket
    , callback;
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, function(err, bucket) {
    if (err) return next(err);
    callback = fnReturnDetails(next, {
      bucket: bucket.name()
    , files: bucket.files()
    });
    callback(null, bucket)
  });
});

API.method('getSharedBucketFile', function(params, next) {
  var share = shares.access(params.uuidSharedPart)
    , bucketUuid = share ? share.uuid : null
    , bucket
    , callback;
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, function(err, bucket) {
    if (err) return next(err);
    next(null, function(req, res, next2) {
      bucket.getFile(params.filename, function(err, file) {
        if (err) return next(err);
        content.downloadFile(file, res, next2);
      });
    });
  });
});

API.method('getSharedBucketFileKey', function(params, next) {
  var share = shares.access(params.uuidSharedPart)
    , bucketUuid = share ? share.uuid : null
    , bucket
    , callback;
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, function(err, bucket) {
    if (err) return next(err);
    bucket.getFile(params.filename, function(err, file) {
      var callback, data = {};
      if (err) return next(err);
      data[params.key] = file.get(params.key)
      callback = fnReturnDetails(next, {
        file: params.filename
      , data: data
      });
      callback(null, file);
    });
  });
});

API.method('getSharedFile', function(params, next) {
  var share = shares.access(params.uuidSharedPart)
    , uuid = share ? share.uuid : null
    , callback;
  if (!uuid) return next(errors.FILE_MISSING);
  if (share.once) shares.toggle(params.uuidSharedPart);
  new File(uuid, function(err, file) {
    if (err) return next(err);
    next(null, function(req, res, next) {
      content.downloadFile(file, res, next);
    });
  });
});

API.method('getSharedFileKey', function(params, next) {
  var share = shares.access(params.uuidSharedPart)
    , uuid = share ? share.uuid : null
    , callback;
  if (!uuid) return next(errors.FILE_MISSING);
  new File(uuid, function(err, file) {
    if (err) return next(err);
    var callback, data = {};
    data[params.key] = file.get(params.key)
    callback = fnReturnDetails(next, {
      file: file.name()
    , data: data
    });
    callback(null, file);
  });
});

API.method('version', function(params, next) {
  return next(null, VERSION);
});
