#!/usr/bin/env node

var assert = require('chai').assert
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , accounts = require('../../server/lib/accounts')
  , sessions = require('../../server/lib/sessions');

var $session, $account;

describe('accounts', function() {

  describe('create', function() {
    it('should create an account', function(done) {
      accounts.create(utils.digest('kevin'), utils.digest('TopSecret'), function(err, uuid) {
        $session = uuid;
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        done();
      });
    });
  });

  describe('access', function() {
    it('should access an account', function(done) {
      accounts.access('kevin', $session, function(err, account) {
        assert.isNull(err);
        assert.ok(account);
        $account = account; // for the test cases below
        done();
      });
    });
  });

  describe('checkUsage', function() {
    it('should check the account quota', function(done) {
      $account.usageObject.quota(-1); // negative quota to check we exceed it
      $account.checkUsage(function(err, account) {
        assert.equal(err.error, errors.QUOTA_EXCEEDED.error);
        assert.equal(account, null);
        $account.usageObject.quota(1000000); // positive quota to check we don't
        $account.checkUsage(function(err, account) {
          assert.isNull(err);
          assert.isTrue(utils.isUuid(account.uuid));
          done();
        });
      });
    });
  });

  describe('createBucket', function() {
    it('should create a bucket in an account', function(done) {
      $account.createBucket('test', function(err, bucket) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(bucket.uuid));
        assert.equal('test', bucket.name());
        assert.equal($account.usage(), bucket.usage());
        done();
      });
    });

    it('should not create a duplicate bucket in an account', function(done) {
      $account.createBucket('test', function(err, bucket) {
        assert.equal(err.message, errors.BUCKET_EXISTS.message);
        assert.notOk(bucket);
        done();
      });
    });
  });

  describe('getBuckets', function() {
    it('should get all buckets in an account', function(done) {
      $account.getBuckets(function(err, buckets) {
        assert.isNull(err);
        assert.ok(buckets.test.created);
        done();
      });
    });
  });

  describe('getBucket', function() {
    it('should get a bucket in an account', function(done) {
      $account.getBucket('test', function(err, bucket) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(bucket.uuid));
        done();
      });
    });

    it('should not get a missing bucket in an account', function(done) {
      $account.getBucket('missing', function(err, bucket) {
        assert.equal(err.message, errors.BUCKET_MISSING.message);
        assert.notOk(bucket);
        done();
      });
    });
  });

  describe('deleteBuckets', function() {
    it('should delete a bucket in an account', function(done) {
      $account.deleteBucket('test', function(err, bucket) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(bucket.uuid));
        done();
      });
    });
  });

  describe('delete', function() {
    it('should delete an account', function(done) {
      accounts.delete(utils.digest('kevin'), utils.digest('TopSecret'), function(err, result) {
        assert.notOk(err);
        assert.isTrue(result);
        done();
      });
    });
  });

});