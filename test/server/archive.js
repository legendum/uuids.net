#!/usr/bin/env node

var assert = require('chai').assert
  , HttpStatus = require('http-status-codes')
  , path = require('path')
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , archive = require('../../server/lib/archive')
  , $filename = 'README.md'
  , $filepath = path.join(__dirname, '../..', $filename);

describe('archive', function() {

  describe('save', function() {
    it('should save a file to the archive', function(done) {
      if (env.AWS_PROFILE) {
        this.timeout(10000);
        archive.save($filepath, function(err) {
          assert.isNull(err);
          assert.isNull(archive.restored($filename));
          done();
        });
      } else {
        done();
      }
    });
  });

  describe('restore', function() {
    it('should restore a file from the archive', function(done) {
      if (env.AWS_PROFILE) {
        this.timeout(10000);
        utils.unlink($filepath);
        archive.restore($filepath, function(err, code) {
          assert.isNull(err);
          assert.equal(code, HttpStatus.OK);
          assert.isTrue(utils.exists($filepath));
          assert.isNumber(archive.restored($filename));
          done();
        });
      } else {
        done();
      }
    });
  });

  describe('delete', function() {
    it('should delete a file from the archive', function(done) {
      if (env.AWS_PROFILE) {
        this.timeout(10000);
        archive.delete($filepath, function(err) {
          assert.isNull(err);
          assert.isNull(archive.restored($filename));
          done();
        });
      } else {
        done();
      }
    });
  });

});
