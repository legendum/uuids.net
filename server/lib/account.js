#!/usr/bin/env node

/**
 * Account - manage the buckets in an account, and the quota for account usage
 */

var when = require('when')
  , Info = require('./info')
  , Usage = require('./usage')
  , Bucket = require('./bucket')
  , errors = require('./errors')
  , utils = require('./utils')
  , DEFAULT_QUOTA = 20971520 // 20 MiB
  , PROPERTIES = ['buckets', 'usage'];

function Account(uuid, next) {
  var account = this;
  if (!uuid) throw errors.UUID_MISSING;
  this.createFromArchive(uuid, function(err) {
    if (err) return next(err);
    new Usage(utils.digest(uuid + 'usage'), function(err, usageObject) {
      if (err) return next(err);
      account.usageObject = usageObject;
      if (!account.usageObject.quota()) {
        account.usageObject.quota(DEFAULT_QUOTA);
      }
      account.usageObject.storeBytes(account.infoSize());
      account.usage(account.usageObject.uuid);
      next(null, account);
    });
  });
}
Account.prototype.__proto__ = Info.prototype;
Account.DEFAULT_QUOTA = DEFAULT_QUOTA;
Info.properties(Account, PROPERTIES);
module.exports = Account;

Account.method('checkUsage', function(next) {
  var error = this.usageObject.error();
  if (error) return next(error);
  next(null, this);
});

Account.method('bucketUuid', function(bucketName, uuid) {
  if (uuid || uuid === false) {
    this.set(this.uuid + bucketName, uuid);
  } else {
    uuid = this.get(this.uuid + bucketName);
  }
  return uuid;
})

Account.method('createBucket', function(bucketName, next) {
  var my = this;
  if (this.bucketUuid(bucketName)) return next(errors.BUCKET_EXISTS);
  new Bucket(utils.uuid(), function(err, bucket) {
    var buckets
      , now = utils.time();
    if (err) return next(err);
    bucket.created(now);
    bucket.name(bucketName);
    bucket.usage(my.usage());
    my.bucketUuid(bucketName, bucket.uuid);
    buckets = my.buckets() || {};
    buckets[bucketName] = {created: now};
    my.buckets(buckets);
    my.usageObject.storeBytes(bucket.infoSize());
    next(null, bucket);
  });
});

Account.method('getBuckets', function(next) {
  next(null, this.buckets() || {});
});

Account.method('getBucket', function(bucketName, next) {
  var bucketUuid = this.bucketUuid(bucketName);
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, next);
});

Account.method('deleteBucket', function(bucketName, next) {
  var my = this
    , bucketUuid = this.bucketUuid(bucketName)
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, function(err, bucket) {
    var buckets;
    if (err) return next(err);
    bucket.destroy(function(err) {
      if (err) return next(err);
      buckets = my.buckets();
      delete buckets[bucketName];
      my.buckets(buckets);
      my.bucketUuid(bucketName, false);
      next(null, bucket);
    });
  });
});

Account.method('destroy', function(next) {
  var my = this
      deferreds = [];

  function destroyBucket(bucketUuid) {
    var deferred = when.defer();
    new Bucket(bucketUuid, function(err, bucket) {
      if (err) return deferred.reject(err);
      bucket.destroy(function(err) {
        if (err) return deferred.reject(err);
        deferred.resolve(true);
      });
    });
    return deferred.promise;
  }

  this.getBuckets(function(err, buckets) {
    for(bucketName in buckets) {
      var bucketUuid = my.bucketUuid(bucketName);
      if (!bucketUuid) return next(errors.BUCKET_MISSING);
      deferreds.push(destroyBucket(bucketUuid));
    }
    when.all(deferreds).then(function() {
      my.usageObject.destroy();
      my.destroyInfo(next);
    });
  });
});
