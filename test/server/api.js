#!/usr/bin/env node

var assert = require('chai').assert
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , invites = require('../../server/lib/invites')
  , quotas = require('../../server/lib/quotas')
  , api = require('../../server/lib/api')
  , Account = require('../../server/lib/account')
  , Usage = require('../../server/lib/usage')
  , TINY_STORAGE_CHARGE = 100; // bytes

var $bucketName, $filename, $newBucketName, $newFilename, $partKey, $share
  , $nameDigest = utils.digest('kevin')
  , $passwordDigest = utils.digest('mysecret')
  , $invitation = invites.create(utils.uuid())
  , $nameAndPassword = {nameDigest: $nameDigest, passwordDigest: $passwordDigest, invitation: $invitation}
  , $nameAndSessionPartKey = {nameDigest: $nameDigest, sessionPartKey: $partKey}
  , $uuidSharedPart;

describe('api', function() {

  describe('signup', function() {
    it('should create a new account', function(done) {
      api.signup($nameAndPassword, function(err, uuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        $nameAndSessionPartKey.sessionPartKey = $partKey = uuid;
        done();
      });
    });

    it('should not use an invitation twice', function(done) {
      api.signup($nameAndPassword, function(err, uuid) {
        assert.equal(err.message, errors.INVITATION_NEEDED.message);
        done();
      });
    });

    it('should not create a new account that exists already', function(done) {
      $nameAndPassword.invitation = invites.create(utils.uuid());
      api.signup($nameAndPassword, function(err, uuid) {
        assert.equal(err.message, errors.ACCOUNT_EXISTS.message);
        assert.notOk(uuid);
        done();
      });
    });
  });

  describe('changePassword', function() {
    it('should change the account password', function(done) {
      $passwordDigest = utils.digest('my NEW secret');
      $nameAndPassword.newPasswordDigest = $passwordDigest;
      api.changePassword($nameAndPassword, function(err, uuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        $nameAndPassword.passwordDigest = $passwordDigest;
        $nameAndSessionPartKey.sessionPartKey = $partKey = uuid;
        done();
      });
    });
  });

  describe('createBucket', function() {
    it('should create a bucket', function(done) {
      $bucketName = 'bucket1';
      api.createBucket({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
        assert.equal(result.bucket.name, $bucketName);
        done();
      });
    });

    it('should not create a bucket with the samae name', function(done) {
      $bucketName = 'bucket1';
      api.createBucket({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName}, function(err, result) {
        assert.equal(err.message, errors.BUCKET_EXISTS.message);
        done();
      });
    });

    it('should create another bucket', function(done) {
      $bucketName = 'bucket2';
      api.createBucket({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
        assert.equal(result.bucket.name, $bucketName);
        done();
      });
    });
  });

  describe('setBucketFileData', function() {
    it('should create a new bucket file', function(done) {
      $filename = 'file1';
      api.setBucketFileData({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName, filename: $filename}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.file.uuidDigest));
        assert.equal(result.file.name, $filename);
        done();
      });
    });

    it('should update an existing bucket file', function(done) {
      api.setBucketFileData({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName, filename: $filename, data: {a:1, b:2}}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.file.uuidDigest));
        assert.equal(result.file.name, $filename);
        done();
      });
    });
  });

  describe('renameBucket', function() {
    it('should rename a bucket', function(done) {
      $newBucketName = 'bucket3';
      api.renameBucket({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName, newBucketName: $newBucketName}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
        assert.equal(result.bucket.name, $newBucketName);
        done();
      });
    });

    it('should not rename a bucket to an existing name', function(done) {
      api.renameBucket({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, newBucketName: $newBucketName}, function(err, result) {
        assert.equal(err.message, errors.BUCKET_EXISTS.message);
        done();
      });
    });
  });

  describe('getBucketFileKey', function() {
    it('should get a bucket file key', function(done) {
      api.getBucketFileKey({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, filename: $filename, key: 'a'}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.file.uuidDigest));
        assert.equal(1, result.file.data.a);
        assert.notEqual(2, result.file.data.b); // only requested "a", not "b"
        done();
      });
    });
  });

  describe('shareBucket', function() {
    it('should share a bucket', function(done) {
      api.shareBucket({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName}, function(err, result) {
        $uuidSharedPart = result.bucket.share.uuid;
        assert.isTrue(utils.isUuid($uuidSharedPart));
        assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
        assert.equal(result.bucket.name, $newBucketName);
        assert.equal(result.bucket.share.name, $newBucketName);
        assert.equal(result.bucket.share.type, 'bucket');
        done();
      });
    });
  });

  describe('getSharedBucket', function() {
    it('should get a shared bucket', function(done) {
      api.getSharedBucket({uuidSharedPart: $uuidSharedPart}, function(err, result) {
        assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
        assert.equal(result.bucket.name, $newBucketName);
        done();
      });
    });
  });

  describe('shareBucketFile', function() {
    it('should share a bucket file', function(done) {
      api.shareBucketFile({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, filename: $filename}, function(err, result) {
        $uuidSharedPart = result.bucket.share.uuid;
        assert.isTrue(utils.isUuid($uuidSharedPart));
        assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
        assert.equal(result.bucket.name, $newBucketName);
        assert.equal(result.bucket.share.name, $filename);
        assert.equal(result.bucket.share.type, 'file');
        done();
      });
    });
  });

  describe('getSharedFileKey', function() {
    it('should get a shared file key', function(done) {
      api.getSharedFileKey({uuidSharedPart: $uuidSharedPart, key: 'a'}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.file.uuidDigest));
        assert.equal(result.file.name, $filename);
        assert.equal(result.file.data.a, 1);
        done();
      });
    });
  });

  describe('moveBucketFile', function() {
    it('should move a bucket file', function(done) {
      $bucketName = $newBucketName;
      $newBucketName = 'bucket1';
      api.moveBucketFile({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $bucketName, filename: $filename, newBucketName: $newBucketName}, function(err, result) {
        assert.isNull(err);
        assert.isNumber(result.files[$filename].created);
        assert.isNumber(result.files[$filename].updated);
        done();
      });
    });

    it('should not move a bucket file to the same bucket', function(done) {
      api.moveBucketFile({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, filename: $filename, newBucketName: $newBucketName}, function(err, result) {
        assert.equal(err.message, errors.FILE_EXISTS.message);
        done();
      });
    });
  });

  describe('renameBucketFile', function() {
    it('should rename a bucket file', function(done) {
      $newFilename = 'file2';
      api.renameBucketFile({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, filename: $filename, newFilename: $newFilename}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.file.uuidDigest));
        assert.equal(result.file.name, $newFilename);
        done();
      });
    });

    it('should not rename a bucket file to an existing name', function(done) {
      api.renameBucketFile({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, filename: $newFilename, newFilename: $newFilename}, function(err, result) {
        assert.equal(err.message, errors.FILE_EXISTS.message);
        done();
      });
    });
  });

  describe('deleteBucketFile', function() {
    it('should delete a bucket file', function(done) {
      api.deleteBucketFile({nameDigest: $nameDigest, sessionPartKey: $partKey, bucketName: $newBucketName, filename: $newFilename}, function(err, result) {
        assert.isNull(err);
        assert.isTrue(utils.isDigest(result.file.uuidDigest));
        done();
      });
    });
  });

  describe('usage', function() {
    it('should return the account usage', function(done) {
      api.usage({nameDigest: $nameDigest, sessionPartKey: $partKey}, function(err, usage) {
        assert.isNull(err);
        assert.isTrue(usage.stored > 1000);
        assert.isTrue(usage.quota > Account.DEFAULT_QUOTA - TINY_STORAGE_CHARGE);
        done();
      });
    });
  });

  describe('quota', function() {
    it('should set the account quota', function(done) {
      var bytes = 1234567
        , uuid = quotas.create('' + bytes);
      api.quota({nameDigest: $nameDigest, sessionPartKey: $partKey, quotaUuid: uuid}, function(err, usage) {
        assert.isNull(err);
        assert.isTrue(usage.quota > Account.DEFAULT_QUOTA + bytes - TINY_STORAGE_CHARGE);
        done();
      });
    });
  });

  describe('deleteAccount', function() {
    it('should not delete a missing account', function(done) {
      api.deleteAccount({nameDigest: 'wrongname', passwordDigest: $passwordDigest}, function(err) {
        assert.equal(err.message, errors.ACCOUNT_MISMATCH.message);
        done();
      });
    });

    it('should not delete an account without the password', function(done) {
      api.deleteAccount({nameDigest: $nameDigest, passwordDigest: 'wrong'}, function(err) {
        assert.equal(err.message, errors.ACCOUNT_MISMATCH.message);
        done();
      });
    });

    it('should delete an account', function(done) {
      api.deleteAccount($nameAndPassword, function(err) {
        assert.notOk(err);
        done();
      });
    });
  });

  describe('version', function() {
    it('should return the current API version', function(done) {
      api.version({}, function(err, version) {
        assert.isNull(err);
        assert.equal(version, api.VERSION);
        done();
      });
    });
  });

});
