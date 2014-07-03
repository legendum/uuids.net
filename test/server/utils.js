#!/usr/bin/env node

var assert = require('chai').assert
  , argv = {ip: '1.2.3.4', port: '1234'}
  , path = require('path')
  , utils = require('../../server/lib/utils')

  , $filepath = path.join(__dirname, 'testfile');

describe('utils', function() {

  describe('digest', function() {
    it('should calculate the digest of "gherkins"', function() {
      assert.equal(utils.digest('gherkins', 'sha1'), '93b19ab44977ffb78d2ae8248613d11b2bce2c42');
      assert.equal(utils.digest('gherkins', 'sha256'), '9e726d86e58bc61ad1350a2a78e1d67ce22fc8f866378e8c7fb1d345b38dfcfd');
    })
  })

  describe('isDigest', function() {
    it('should confirm a UUID digest is valid', function() {
      var digest = utils.digest($filepath);
      assert.isTrue(utils.isDigest(digest));
      assert.isFalse(utils.isDigest('nope ' + digest));
    });
  });

  describe('exists', function() {
    it('should check this file exists', function() {
      assert.isTrue(utils.exists(__filename));
    });
  });

  describe('scrypt', function() {
    it('should scrypt a password then match its hash', function(done) {
      var password = '5uper$ecret';
      utils.scrypt(password, function(err, hash) {
        utils.scryptMatch(password, hash, function(err, result) {
          assert.isTrue(result);
          done();
        });
      });
    });
  });

  describe('crypto', function() {
    it('should encrypt and decrypt data', function() {
      var data = 'roses are red, violets are blue'
        , key = "gherkins";

      assert.equal(utils.encrypt(data, key), 'OwhqneG/Cu2VfDkvRzgy/Ab85tPhRGz9h20NaT7EE5s=');
      assert.equal(data, utils.decrypt(utils.encrypt(data, key), key));
    });

    it('should wrap and unwrap structured data', function() {
      var data = {roses: 'red', violets: 'blue'}
        , key = "gherkins";
      assert.equal(utils.wrap(data, key), 'fYi76o2S30iDUUtKhopNmNvJC4JYJudQyuAphv7GU4t12X0aJtI1Dr3aRn0ATMRp');
      assert.deepEqual(data, utils.unwrap(utils.wrap(data, key), key));
    });
  });

  describe('writeFile and readFile', function() {
    it('should write a file', function() {
      utils.writeFile($filepath, "Hello world");
    });

    it('should read a file', function() {
      assert.equal(utils.readFile($filepath), "Hello world");
    });
  })

  describe('reverse', function() {
    it('should reverse a string', function() {
      assert.equal(utils.reverse('kevin'), 'nivek');
    });
  })

  describe('stat', function() {
    it('should stat this file', function() {
      assert.isTrue(utils.stat(__filename).size > 1000);
    });
  });

  describe('time', function() {
    it('should get the time now in milliseconds', function() {
      var now = utils.time();
      assert.isTrue(now > 1000000000000 && now < 9999999999999);
      assert.equal((new String(now)).length, 13);
    });
  })

  describe('lock and unlock', function() {
    it('should lock a file', function() {
      utils.lock($filepath);
      assert.isTrue(utils.isLocked($filepath));
      assert.isTrue(utils.exists($filepath + utils.LOCK_EXT));
    });

    it('should wait while a file is locked', function() {
      assert.throws(function() {
        utils.waitWhileLocked($filepath);
      }, "Locked file at '..." + $filepath.substr($filepath.length - 10) + "'");
    });

    it('should unlock a file', function() {
      utils.unlock($filepath);
      assert.isFalse(utils.exists($filepath + utils.LOCK_EXT));
      assert.doesNotThrow(function() {
        utils.waitWhileLocked($filepath);
      }, "Locked file at '" + $filepath + "'");
    });
  });

  describe('unlink', function() {
    it('should delete a file', function() {
      assert.isTrue(utils.exists($filepath));
      utils.unlink($filepath); // clean up
      assert.isFalse(utils.exists($filepath));
    });
  });

  describe('uuid', function() {
    it('should create UUIDs', function() {
      var uuid = utils.uuid();
      assert.equal(uuid.length, 36);
      assert.match(uuid, /^(\w+\-){4}\w+$/); // match four hyphens
    });
  });

  describe('isUuid', function() {
    it('should confirm a UUID is valid', function() {
      var uuid = utils.uuid();
      assert.isTrue(utils.isUuid(uuid));
      assert.isFalse(utils.isUuid('nope ' + uuid));
    });
  });
});
