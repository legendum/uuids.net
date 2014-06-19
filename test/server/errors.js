#!/usr/bin/env node

var assert = require('chai').assert
  , argv = {ip: '1.2.3.4', port: '1234'}
  , errors = require('../../server/lib/errors');

describe('errors', function() {

  it('should have an "account exists" error', function() {
    assert.ok(errors.ACCOUNT_EXISTS.message);
  });

  it('should have an "bucket exists" error', function() {
    assert.ok(errors.BUCKET_EXISTS.message);
  });

  it('should have an "file exists" error', function() {
    assert.ok(errors.FILE_EXISTS.message);
  });

  // No point checking all the others exist
});
