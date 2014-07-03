#!/usr/bin/env node

var assert = require('chai').assert
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , Usage = require('../../server/lib/usage')
  , Bucket = require('../../server/lib/bucket')
  , shares = require('../../server/lib/shares');

var $bucket, $filename, $share, $usageObject;

describe('Bucket', function() {
  $filename = 'gherkins';

  describe('createFile', function() {
    it('should create a file in a bucket', function(done) {
      $usageObject = new Usage(utils.uuid());
      $usageObject.quota(1000000);
      new Bucket(utils.uuid(), function(err, bucket) {
        bucket.usage($usageObject.uuid);
        assert.isNull(err);
        $bucket = bucket;
        $bucket.createFile($filename, function(err, file) {
          assert.isNull(err);
          assert.isTrue(utils.isUuid(file.uuid));
          assert.isNull(err);
          assert.equal(file.name(), $filename);
          assert.equal(file.usage(), $bucket.usage());
          done();
        });
      });
    });

    it('should not create an unnamed file in a bucket', function(done) {
      $bucket.createFile('', function(err, file) {
        assert.equal(err.message, errors.FILE_MISSING.message);
        done();
      });
    });
  });

  describe('getFile', function() {
    it('should get a file from a bucket', function(done) {
      $bucket.getFile($filename, function(err, file) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(file.uuid));
        assert.equal('gherkins', file.name());
        var files = $bucket.files();
        assert.isNull(err);
        assert.equal(files.gherkins.created, file.created());
        assert.equal(files.gherkins.updated, file.updated());
        done();
      });
    });
  });

  describe('updateFileData', function() {
    it('should update a file in a bucket', function(done) {
      $bucket.updateFileData($filename, {a:1, b:2}, function(err, file) {
        var usage = file.usageObject();
        assert.isNull(err);
        assert.isTrue(utils.isUuid(file.uuid));
        assert.equal(file.read('a'), 1);
        assert.equal(file.read('b'), 2);
        assert.equal(usage.input(),  2);
        assert.equal(usage.output(), 2);
        assert.isTrue(usage.stored() > 100);
        done();
      });
    });
  });

  describe('details', function() {
    it('should get details about a bucket', function(done) {
      $bucket.details(function(err, details) {
        assert.isNull(err);
        assert.isTrue(details.files.gherkins.updated > details.files.gherkins.created);
        assert.equal(details.files.gherkins.reads, 2);
        assert.equal(details.files.gherkins.writes, 1);
        done();
      });
    });
  });

  describe('share', function() {
    it('should share a bucket', function(done) {
      $bucket.share(function(err, sharePartUuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(sharePartUuid));
        $share = sharePartUuid;
        $bucket.details(function(err, details) {
          assert.isNumber(details.shares[$share].created);
          assert.equal(details.shares[$share].type, 'bucket');
          done();
        });
      });
    });
  });

  describe('toggleShare', function() {
    it('should toggle a share to enable/disable it', function(done) {
      $bucket.toggleShare($share, function(err, shared) {
        assert.isNull(err);
        assert.isNull(shares.access($share));
        $bucket.toggleShare($share, function(err, shared) {
          assert.isNull(err);
          assert.isTrue(utils.isUuid(shares.access($share).uuid));
          done();
        });
      });
    });
  });

  describe('deleteShare', function() {
    it('should delete a share', function(done) {
      $bucket.deleteShare($share, function(err) {
        assert.notOk(err);
        done();
      }); 
    });
  });

  describe('shareFile', function() {
    it('should share a file', function(done) {
      $bucket.shareFile($filename, {once: true}, function(err, sharePartUuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(sharePartUuid));
        $share = sharePartUuid;
        $bucket.details(function(err, details) {
          assert.equal(details.shares[$share].type, 'file');
          assert.equal(details.shares[$share].name, $filename);
          done();
        });
      });
    });
  });

  describe('deleteFile', function() {
    it('should delete a file in a bucket', function(done) {
      $bucket.deleteFile($filename, function(err, file) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(file.uuid));
        $bucket.details(function(err, details) {
          assert.isNull(err);
          assert.deepEqual(details.files, {});
          assert.notOk(details.shares[$share]);
          done();
        })
      });
    });
  });

  describe('destroy', function() {
    it('should destroy a bucket', function(done) {
      $bucket.destroy(function(err) {
        assert.notOk(err);
        $usageObject.destroy();
        done();
      });
    });
  });

});
