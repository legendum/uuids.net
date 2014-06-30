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
  , DEFAULT_QUOTA = 2000000000 // 2 GB
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

Account.method('createBucket', function(bucketName, next) {
  var my = this;
  if (this.objectUuid(bucketName)) return next(errors.BUCKET_EXISTS);
  new Bucket(utils.uuid(), function(err, bucket) {
    var buckets
      , now = utils.time();
    if (err) return next(err);
    bucket.created(now);
    bucket.name(bucketName);
    bucket.usage(my.usage());
    my.objectUuid(bucketName, bucket.uuid);
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
  var bucketUuid = this.objectUuid(bucketName);
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, next);
});

Account.method('renameBucket', function(bucketName, newBucketName, next) {
  var my = this
    , uuid = this.objectUuid(bucketName);
  if (!uuid) return next(errors.BUCKET_MISSING);
  new Bucket(uuid, function(err, bucket) {
    var buckets;
    if (err) return next(err);
    bucket.name(newBucketName);
    my.objectUuid(bucketName, false);
    my.objectUuid(newBucketName, bucket.uuid);
    buckets = my.buckets();
    buckets[newBucketName] = buckets[bucketName];
    delete(buckets[bucketName]);
    my.buckets(buckets);
    next(null, bucket);
  });
});

Account.method('deleteBucket', function(bucketName, next) {
  var my = this
    , bucketUuid = this.objectUuid(bucketName)
  if (!bucketUuid) return next(errors.BUCKET_MISSING);
  new Bucket(bucketUuid, function(err, bucket) {
    var buckets;
    if (err) return next(err);
    bucket.destroy(function(err) {
      if (err) return next(err);
      buckets = my.buckets();
      delete buckets[bucketName];
      my.buckets(buckets);
      my.objectUuid(bucketName, false);
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
      var bucketUuid = my.objectUuid(bucketName);
      if (!bucketUuid) return next(errors.BUCKET_MISSING);
      deferreds.push(destroyBucket(bucketUuid));
    }
    when.all(deferreds).then(function() {
      my.usageObject.destroy();
      my.destroyInfo(next);
    });
  });
});
