#!/usr/bin/env node

var assert = require('chai').assert
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , Usage = require('../../server/lib/usage')
  , $usage;

describe('Usage', function() {
  describe('create', function() {
    it('should create a new usage object', function(done) {
      var uuid = utils.uuid();
      $usage = new Usage(uuid);
      assert.isTrue(utils.isUuid($usage.uuid));
      assert.equal(uuid, $usage.uuid);
      done();
    });
  });

  describe('quota', function() {
    it('should get and set a quota', function(done) {
      $usage.quota(123);
      assert.equal(123, $usage.quota());
      done();
    });
  });

  describe('writeBytes', function() {
    it('should measure written bytes (input)', function(done) {
      assert.equal(undefined, $usage.input());
      $usage.writeBytes(123);
      assert.equal(123, $usage.input());
      assert.equal(123, $usage.transmitted());
      done();
    });
  });

  describe('readBytes', function() {
    it('should measure read bytes (output)', function(done) {
      assert.equal(undefined, $usage.output());
      $usage.readBytes(123);
      assert.equal(123, $usage.output());
      assert.equal(246, $usage.transmitted());
      done();
    });
  });

  describe('error', function() {
    it('should say when the quota is exceeded', function(done) {
      $usage.quota(245);
      assert.equal($usage.error().message, errors.QUOTA_EXCEEDED.message);
      $usage.quota(246);
      assert.isNull($usage.error());
      done();
    });

    it('should say when the state is not active', function(done) {
      $usage.state('suspended');
      assert.equal($usage.error().message, errors.create('ACCOUNT_STATE', 'suspended').message);
      done();
    });
  });

  describe('storeBytes', function() {
    it('should measure size of a created file (input)', function(done) {
      $usage.storeBytes(100);
      assert.equal(123, $usage.input());
      assert.equal(123, $usage.output());
      assert.equal(100, $usage.stored());
      assert.equal(123 + 123, $usage.transmitted()); // storage is not included
      done();
    });
  });

  describe('accountForStorage', function() {
    it('should charge for a whole year of storage', function(done) {
      var now = utils.time()
        , quota = $usage.quota();
      $usage.updated(now - 86400 * 1000 * 365);
      $usage.accountForStorage();
      assert.equal($usage.quota(), quota - $usage.stored());
      done();
    });
  });

  after(function() {
    $usage.destroy();
  });
});
