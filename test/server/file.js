#!/usr/bin/env node

var assert = require('chai').assert
  , env = require('../../server/lib/env')('test')
  , utils = require('../../server/lib/utils')
  , File = require('../../server/lib/file')

var $file, $share;

describe('File', function() {
  var filename = 'gherkins';

  describe('new', function() {
    it('should create a file', function(done) {
      new File(null, function(err, file) {
        assert.isNull(err);
        $file = file;
        assert.isTrue(utils.isUuid($file.uuid));
        done();
      });
    });
  });

  describe('meta', function() {
    it('should set the file meta data', function() {
      var data = $file.meta({foo: 'bar'});
      assert.equal(data.foo, 'bar');
    });

    it('should get the file meta data', function() {
      var data = $file.meta();
      assert.equal(data.foo, 'bar');
      assert.notOk(data.unused);
    });
  });

  describe('properties', function() {
    it('should not get an undefined file name', function() {
      var name = $file.name();
      assert.equal(name, undefined);
    });

    it('should set the file name', function() {
      var name = $file.name('gherkins');
      assert.equal(name, 'gherkins');
    });

    it('should get the file name', function() {
      var name = $file.name();
      assert.equal(name, 'gherkins');
    });
  });

  describe('read, write and delete', function() {
    it('should not read a missing key/value', function() {
      var value = $file.read('missing');
      assert.notOk(value);
    });

    it('should read a written key/value pair', function() {
      $file.write('key', 'value');
      var value = $file.read('key');
      assert.equal(value, 'value');
      $file.erase('key');
      assert.notOk($file.read('key'));
    });
  });

  describe('destroy', function() {
    it('should destroy the file we created', function() {
      $file.destroy();
      assert.notOk($file.store.path());
    });
  });

});
