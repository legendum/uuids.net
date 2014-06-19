#!/usr/bin/env node

var assert = require('chai').assert
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , secrets = require('../../server/lib/secrets');

describe('secrets', function() {

  describe('create', function() {
    it('should create a new account secret', function(done) {
      secrets.create('kevin', utils.digest('TopSecret'), function(err, uuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        done();
      });
    });

    it('should not create a new account secret if it exists', function(done) {
      secrets.create('kevin', utils.digest('TopSecret'), function(err, uuid) {
        assert.equal(err.message, errors.ACCOUNT_EXISTS.message);
        assert.equal(uuid, null);
        done();
      });
    });
  });

  describe('access', function() {
    it('should access an existing account secret', function(done) {
      secrets.access('kevin', utils.digest('TopSecret'), function(err, uuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        done();
      });
    });

    it('should not access a secret using the wrong password', function(done) {
      secrets.access('kevin', utils.digest('WRONG!'), function(err, uuid) {
        assert.equal(err.message, errors.ACCOUNT_MISMATCH.message);
        assert.equal(uuid, null);
        done();
      });
    });
  });

  describe('changePassword', function() {
    it('should change the password for an account secret', function(done) {
      secrets.changePassword('kevin', utils.digest('TopSecret'), utils.digest('UberSecret'), function(err, uuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        done();
      });
    });
  });

  describe('access (with new password)', function() {
    it('should access an account secret using a new password', function(done) {
      secrets.access('kevin', utils.digest('UberSecret'), function(err, uuid) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(uuid));
        done();
      });
    });

    it('should not access a missing account secret', function(done) {
      secrets.access('other', utils.digest('TopSecret'), function(err, uuid) {
        assert.equal(err.message, errors.ACCOUNT_MISMATCH.message);
        assert.equal(uuid, null);
        done();
      });
    });
  });
});
