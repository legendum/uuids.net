#!/usr/bin/env node

var IP_ADDRESS = '0.0.0.0'
  , PORT = '1234'
  , URL = 'http://' + IP_ADDRESS + ':' + PORT + '/'
  , UUIDS_ENV = 'test';

process.env.UUIDS_ENV = UUIDS_ENV; // to run the UUIDs server in test mode

var assert = require('chai').assert
  , unirest = require('unirest')
  , path = require('path')
  , env = require('../../server/lib/env')(UUIDS_ENV)
  , api = require('../../client/uuids_api')
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , Server = require('../../server/lib/server')
  , invites = require('../../server/lib/invites')
  , secrets = require('../../server/lib/secrets')
  , sessions = require('../../server/lib/sessions')

  , $name = 'kevin'
  , $password = 'hush!'
  , $invitation = invites.create(utils.uuid())
  , $bucketName
  , $bucket, $bucket2
  , $filename
  , $file, $file2
  , $data
  , $session;

describe('api', function() {

  // Be sure to start the server first!
  before(function(done) {
    (new Server({ip: IP_ADDRESS, port: PORT})).start(function() {
      api.setup({serverUrl: URL, unirest: unirest});
      done();
    });
  });

  describe('api.signup', function() {
    it('should create a new account', function(done) {
      api.signup($name, $password, $invitation, function(err, session) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(session.setting('session')));
        done();
      });
    });
  });

  describe('api.login', function() {
    it('should login to an account', function(done) {
      api.login($name, $password, function(err, session) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid(session.setting('session')));
        $session = session;
        done();
      });
    });
  });

  describe('session.createBucket', function() {
    it('should create a bucket', function(done) {
      $bucketName = 'bucket1';
      $session.createBucket($bucketName, function(err, bucket) {
        $bucket = bucket;
        assert.isNull(err);
        assert.equal(bucket.name, $bucketName);
        assert.isTrue(utils.isDigest(bucket.uuidDigest));
        done();
      });
    });
  });

  describe('bucket.setFileData', function() {
    it('should create a file with some data', function(done) {
      $data = {
        score: {arsenal: 3, chelsea: 1}
      , date: 'Monday, 27 December 2010'
      , link: 'http://news.bbc.co.uk/sport2/hi/football/eng_prem/9309539.stm'
      };
      $filename = 'Classic win';
      $bucket.setFileData($filename, $data, function(err, file) {
        $file = file;
        assert.isNull(err);
        assert.equal(file.name, $filename);
        done();
      });
    });
  });

  describe('bucket.getFileData', function() {
    it('should get file string data', function(done) {
      $file.getData('link', function(err, data) {
        assert.equal(data.link, $data.link);
        done();
      });
    });

    it('should get file object data', function(done) {
      $file.getData('score', function(err, data) {
        assert.deepEqual(data.score, $data.score);
        done();
      });
    });

    it('should update some file object data', function(done) {
      $data.link = 'http://goo.gl/0nMYwb';
      $file.setData({link: $data.link}, function(err, data) {
        assert.isNull(err);
        done();
      });
    });

    it('should get file updated and old data', function(done) {
      $file.getData('score', function(err, data) {
        assert.deepEqual(data.score, $data.score);
        $file.getData('link', function(err, data) {
          assert.equal(data.link, $data.link);
          done();
        });
      });
    });
  });

  describe('bucket.uploadFile and bucket.downloadFile', function() {
    it('should not download a file until uploaded', function(done) {
      $bucket.downloadFile($filename, function(err, file) {
        assert.equal(err, errors.FILE_NO_CONTENT.message);
        done();
      });
    });

    it('should upload a new file (using actual filename)', function(done) {
      var filepath = path.join(__dirname, '../fixtures/101-tips.pdf');
      $bucket.uploadFile(filepath, function(err, file) {
        $file2 = file;
        assert.equal(err, null);
        assert.isTrue(file.size > 100);
        assert.equal(file.name, '101-tips.pdf');
        assert.equal(file.type, 'application/pdf');
        done();
      });
    });

    it('should upload a file to an existing file', function(done) {
      var filepath = path.join(__dirname, '../../README.md');
      $bucket.uploadFile($filename, filepath, function(err, file) {
        assert.equal(err, null);
        assert.isTrue(file.size > 100);
        assert.equal(file.type, 'text/x-markdown');
        done();
      });
    });

    it('should download an uploaded file', function(done) {
      $bucket.downloadFile($filename, function(err, text) {
        assert.equal(err, null);
        assert.match(text, /UUIDs.net/);
        assert.isTrue(text.length > 100);
        done();
      });
    });
  });

  describe('session.getBucket', function() {
    it('should get a bucket', function(done) {
      $session.getBucket($bucketName, function(err, bucket) {
        assert.isNull(err);
        assert.equal(bucket.name, $bucketName);
        assert.isTrue(utils.isDigest(bucket.uuidDigest));
        assert.isNumber(bucket.created);
        assert.isObject(bucket.files[$filename]);
        done();
      });
    });
  });

  describe('session.getBuckets', function() {
    it('should get all the buckets', function(done) {
      $session.getBuckets(function(err, buckets) {
        assert.isNull(err);
        assert.equal(buckets[0].name, $bucketName);
        assert.isNumber(buckets[0].created);
        done();
      });
    });
  });

  describe('bucket.deleteFile', function() {
    it('should delete a file', function(done) {
      $file.delete(function(err, file) {
        assert.isNull(err);
        assert.equal(file.name, $filename);
        done();
      });
    });

    it('should not delete a file twice', function(done) {
      $bucket.deleteFile($filename, function(err, file) {
        assert.equal(err, errors.FILE_MISSING.message);
        done();
      });
    });
  });

  describe('session.deleteBucket', function() {
    it('should delete a bucket', function(done) {
      $bucketName = 'bucket1';
      $session.deleteBucket($bucketName, function(err, session) {
        assert.isNull(err);
        assert.isTrue(utils.isUuid($session.setting('session')));
        done();
      });
    });

    it('should not delete a bucket twice', function(done) {
      $bucketName = 'bucket1';
      $session.deleteBucket($bucketName, function(err) {
        assert.equal(err, errors.BUCKET_MISSING.message);
        done();
      });
    });
  });

  describe('session.logout', function() {
    it('should logout of an account', function(done) {
      $session.logout(function(err, session) {
        assert.isNull(err);
        assert.notOk(session.setting('nameDigest'));
        assert.notOk(session.setting('session'));
        done();
      });
    });
  });

  describe('api.leave', function() {
    it('should delete an account', function(done) {
      api.leave($name, $password, function(err, ok) {
        assert.isNull(err);
        assert.isTrue(ok);
        done();
      });
    });
  });

  describe('cleanup', function() {
    it('should destroy any test secrets', function() {
      var ok = true;
      try {
        secrets.destroy();
        secrets.destroy(); // prove that we may call this multiple times
      } catch (e) {
        ok = false;
      }
      assert.isTrue(ok);
    })

    it('should destroy any test sessions', function() {
      var ok = true;
      try {
        sessions.destroy();
        sessions.destroy(); // prove that we may call this multiple times
      } catch (e) {
        ok = false;
      }
      assert.isTrue(ok);
    })

    it('should destroy all invites', function() {
      var invitesPath = invites.store.path()
        , fs = require('fs');
      invites.destroy();
      assert.isFalse( fs.existsSync(invitesPath) );
    });
  });

});
