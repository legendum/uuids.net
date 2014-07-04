#!/usr/bin/env node

var IP_ADDRESS = '0.0.0.0'
  , PORT = '1234'
  , URL = 'http://' + IP_ADDRESS + ':' + PORT + '/'
  , UUIDS_ENV = 'test'
  , TINY_STORAGE_CHARGE = 100; // bytes

process.env.UUIDS_ENV = UUIDS_ENV; // to run the UUIDs server in test mode

var path = require('path')
  , exec = require('child_process').exec
  , asyncblock = require('asyncblock')
  , assert = require('chai').assert
  , unirest = require('unirest')
  , env = require('../../server/lib/env')(UUIDS_ENV)
  , utils = require('../../server/lib/utils')
  , errors = require('../../server/lib/errors')
  , shares = require('../../server/lib/shares')
  , secrets = require('../../server/lib/secrets')
  , sessions = require('../../server/lib/sessions')
  , archive = require('../../server/lib/archive')
  , invites = require('../../server/lib/invites')
  , quotas = require('../../server/lib/quotas')
  , Server = require('../../server/lib/server')
  , Usage = require('../../server/lib/usage')

  , $nameDigest = utils.digest('kevin')
  , $passwordDigest = utils.digest('hush!')
  , $newPasswordDigest = utils.digest('puppy')
  , $invitation = invites.create(utils.uuid())
  , $quota
  , $quotaUuid
  , $session
  , $shareBucketUuid
  , $shareFileUuid
  , $pdfPath = path.join(env.UUIDS_STORE_PATH, '../test/fixtures/101-tips.pdf')
  , $uuidsCmd = path.join(__dirname, '../../bin/uuids');

describe('server', function() {

  // Be sure to start the server first!
  before(function(done) {
    (new Server({ip: IP_ADDRESS, port: PORT})).start(function() {
      done();
    });
  });

  describe('GET /', function() {
    it('should redirect to the app page', function(done) {
      unirest.get(URL)
        .end(function(response) {
          assert.equal(response.request.path, "/app/");
          assert.match(response.body, /<!DOCTYPE html>/);
          done();
        });
    });
  });

  describe('POST /signup', function() {
    it('should signup a new user', function(done) {
      unirest.post(URL + 'signup')
        .field('nameDigest', $nameDigest)
        .field('passwordDigest', $passwordDigest)
        .field('invitation', $invitation)
        .end(function(response) {
          var result = response.body
          assert.isTrue(utils.isUuid(result.session));
          $session = result.session;
          done();
        });
    });
  });

  describe('POST /login', function() {
    it('should login a user', function(done) {
      unirest.post(URL + 'login')
        .field('nameDigest', $nameDigest)
        .field('passwordDigest', $passwordDigest)
        .end(function(response) {
          var result = response.body
            , oldSession = $session;
          assert.isTrue(utils.isUuid(result.session));
          $session = result.session;
          assert.isFalse(oldSession == $session); // coz we have a new session
          done();
        });
    });
  });

  describe('POST /password', function() {
    it('should change the password', function(done) {
      unirest.post(URL + 'password')
        .field('nameDigest', $nameDigest)
        .field('passwordDigest', $passwordDigest)
        .field('newPasswordDigest', $newPasswordDigest)
        .end(function(response) {
          var result = response.body
          assert.isTrue(utils.isUuid(result.session));
          $session = result.session;
          $passwordDigest = $newPasswordDigest;
          done();
        });
    });
  });

  var weirdName = "Kevin's bucket/Sub folder"
    , urlencoded = encodeURIComponent(weirdName);
  describe('POST /bucket/' + urlencoded, function() {
    it('should create a bucket with a weird name', function(done) {
      unirest.post(URL + 'bucket/' + urlencoded)
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, weirdName);
          done();
      });
    });

    it('should rename a bucket to a weirder name', function(done) {
      var newUrlencoded;
      weirdName += " even weirder!?";
      newUrlencoded = encodeURIComponent(weirdName);
      unirest.post(URL + 'bucket/' + urlencoded + '/rename/' + newUrlencoded)
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, weirdName);
          urlencoded = newUrlencoded;
          done();
        });
    });

    it('should get a bucket with a weird name', function(done) {
      unirest.get(URL + 'bucket/' + urlencoded)
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, weirdName);
          done();
        });
    });

    it('should delete a bucket with a weird name', function(done) {
      unirest.post(URL + 'bucket/' + urlencoded + '/delete')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, weirdName);
          done();
      });
    });

    it('should not get a deleted bucket with a weird name', function(done) {
      unirest.get(URL + 'bucket/' + urlencoded)
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.error, errors.BUCKET_MISSING.message);
          done();
        });
    });

    it('should not delete a bucket with a weird name twice', function(done) {
      unirest.post(URL + 'bucket/' + urlencoded + '/delete')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.error, errors.BUCKET_MISSING.message);
          done();
      });
    });
  });

  describe('POST /bucket/bucket2', function() {
    it('should create another bucket', function(done) {
      unirest.post(URL + 'bucket/bucket2')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          done();
      });
    });

    it('should not create the bucket twice', function(done) {
      unirest.post(URL + 'bucket/bucket2')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.error, errors.BUCKET_EXISTS.message);
          done();
        });
    });
  });

  describe('GET /buckets', function() {
    it('should get all buckets', function(done) {
      unirest.get(URL + 'buckets')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.ok(result.buckets.bucket2.created);
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/file/file2', function() {
    it('should create a file', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2')
        .auth($nameDigest, $session)
        .attach('file', $pdfPath)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file2');
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/file/file3', function() {
    it('should upload a new file', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file3')
        .auth($nameDigest, $session)
        .attach('file', $pdfPath)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file3');
          assert.isTrue(result.file.size == utils.stat($pdfPath).size);
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/file/file3/rename/file4', function() {
    it('should rename new file', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file3/rename/file4')
        .auth($nameDigest, $session)
        .attach('file', $pdfPath)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file4');
          done();
        });
    });
  });

  describe('GET /bucket/bucket2', function() {
    it('should get a bucket', function(done) {
      unirest.get(URL + 'bucket/bucket2')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          assert.ok(result.bucket.files.file2.created);
          assert.notOk(result.bucket.files.file3); // we renamed it earlier
          assert.ok(result.bucket.files.file4.created);
          done();
        });
    });
  });

  describe('GET /bucket/bucket2/file/file4', function() {
    it('should download a new file', function(done) {
      unirest.get(URL + 'bucket/bucket2/file/file4')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(response.headers['content-type'], 'application/pdf');
          assert.equal(response.headers['connection'], 'keep-alive');
          assert.equal(response.headers['transfer-encoding'], 'chunked');
          assert.isTrue(result.length > 100);
          done();
        });
    });
  });

  describe('GET /bucket/bucket2/file/file9', function() {
    it('should not download a missing file', function(done) {
      unirest.get(URL + 'bucket/bucket2/file/file9')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(response.headers['content-type'], 'application/json');
          assert.equal(result.error, errors.FILE_MISSING.message);
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/file/file2', function() {
    it('should upload a file', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2')
        .auth($nameDigest, $session)
        .attach('file', $pdfPath)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file2');
          assert.isTrue(result.file.size == utils.stat($pdfPath).size);
          done();
        });
    });
  });

  describe('GET /bucket/bucket2/file/file2', function() {
    it('should download a file', function(done) {
      unirest.get(URL + 'bucket/bucket2/file/file2')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(response.headers['content-type'], 'application/pdf');
          assert.equal(response.headers['connection'], 'keep-alive');
          assert.equal(response.headers['transfer-encoding'], 'chunked');
          assert.isTrue(result.length > 100);
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/file/file2/data', function() {
    it('should update some file data', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/data')
        .auth($nameDigest, $session)
        .field('data', JSON.stringify({a: 1, b: 2}))
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file2');
          done();
        });
    });
  });

  describe('GET /bucket/bucket2/file/file2/a', function() {
    it('should get the value for a file data key', function(done) {
      unirest.get(URL + 'bucket/bucket2/file/file2/a')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file2');
          assert.equal(result.file.data.a, '1');
          assert.notEqual(result.file.data.b, '2'); // we only requested key "a"
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/share', function() {
    it('should share a bucket', function(done) {
      unirest.post(URL + 'bucket/bucket2/share')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          assert.equal(result.bucket.share.type, 'bucket');
          assert.equal(result.bucket.share.name, 'bucket2');
          assert.isTrue(utils.isUuid(result.bucket.share.uuid));
          $shareBucketUuid = result.bucket.share.uuid;
          done();
        });
    });
  });

  describe('GET /shared/bucket/$shareBucketUuid', function() {
    it('should get a shared bucket', function(done) {
      unirest.get(URL + 'shared/bucket/' + $shareBucketUuid)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          done();
        });
    })
  });

  describe('GET /shared/bucket/$shareBucketUuid/file/$filename', function() {
    it('should get a shared bucket file', function(done) {
      unirest.get(URL + 'shared/bucket/' + $shareBucketUuid + '/file/file2')
        .end(function(response) {
          var result = response.body;
          assert.isTrue(result.length > 100);
          done();
        });
    })
  });

  describe('GET /shared/bucket/$shareBucketUuid/file/$filename/$key', function() {
    it('should get a shared bucket file key', function(done) {
      unirest.get(URL + 'shared/bucket/' + $shareBucketUuid + '/file/file2/a')
        .end(function(response) {
          var result = response.body;
          assert.equal(result.file.data.a, 1);
          done();
        });
    })
  });

  describe('POST /bucket/bucket2/file/file2/share/once', function() {
    it('should share a file once', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/share/once')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          assert.equal(result.bucket.share.type, 'file');
          assert.equal(result.bucket.share.name, 'file2');
          assert.isTrue(result.bucket.share.once);
          assert.isTrue(utils.isUuid(result.bucket.share.uuid));
          assert.isTrue(shares.access(result.bucket.share.uuid).once);
          unirest.get(URL + 'shared/file/' + result.bucket.share.uuid)
            .end(function(response) {
              // Prove we can only access the shared file once
              assert.isNull(shares.access(result.bucket.share.uuid));
              done();
            });
        });
    });
  });

  describe('POST /bucket/bucket2/file/file2/share/once', function() {
    it('should share a file once (yet again)', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/share/once')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          assert.equal(result.bucket.share.type, 'file');
          assert.equal(result.bucket.share.name, 'file2');
          assert.isTrue(result.bucket.share.once);
          assert.isTrue(utils.isUuid(result.bucket.share.uuid));
          $shareFileUuid = result.bucket.share.uuid;
          done();
        });
    });
  });

  describe('GET /shared/file/$shareFileUuid', function() {
    it('should get a shared file', function(done) {
      unirest.get(URL + 'shared/file/' + $shareFileUuid)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(result.length > 100);
          done();
        });
    })

    it('should toggle a share to get a shared file again', function(done) {
      asyncblock(function(flow) {
        exec([$uuidsCmd, 'toggle', $shareFileUuid].join(' '), flow.add());
        result = flow.wait();
        assert.match(result, /share was toggled/);
        unirest.get(URL + 'shared/file/' + $shareFileUuid)
          .end(function(response) {
            var result = response.body;
            assert.isTrue(result.length > 100);
            done();
          });
      });
    });
  });

  describe('embargoes and expiries', function() {
    it('should share a file with an embargo', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/share?embargo=9999999999')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          assert.equal(result.bucket.share.type, 'file');
          assert.equal(result.bucket.share.name, 'file2');
          assert.isFalse(result.bucket.share.once);
          assert.isTrue(utils.isUuid(result.bucket.share.uuid));
          unirest.get(URL + 'shared/file/' + result.bucket.share.uuid)
            .end(function(response) {
              var result = response.body;
              assert.equal(result.error, errors.SHARE_EMBARGO.message);
              done();
            });
        });
    });

    it('should share a file that expires', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/share?expires=1000000000')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          assert.equal(result.bucket.share.type, 'file');
          assert.equal(result.bucket.share.name, 'file2');
          assert.isFalse(result.bucket.share.once);
          assert.isTrue(utils.isUuid(result.bucket.share.uuid));
          unirest.get(URL + 'shared/file/' + result.bucket.share.uuid)
            .end(function(response) {
              var result = response.body;
              assert.equal(result.error, errors.SHARE_EXPIRED.message);
              done();
            });
        });
    });
  });

  describe('suspend and activate an account', function() {
    var result;
    it('should suspend an account', function(done) {
      asyncblock(function(flow) {
        exec([$uuidsCmd, 'suspend', $shareFileUuid].join(' '), flow.add());
        result = flow.wait();
        assert.match(result, /is now suspended/);
        unirest.get(URL + 'shared/file/' + $shareFileUuid)
          .end(function(response) {
            var result = response.body;
            assert.ok(result.error);
            assert.match(result.error, /suspended/);
            done();
          });
      });
    });

    it('should activate an account', function(done) {
      asyncblock(function(flow) {
        exec([$uuidsCmd, 'activate', $shareFileUuid].join(' '), flow.add());
        result = flow.wait();
        unirest.get(URL + 'shared/file/' + $shareFileUuid)
          .end(function(response) {
            var result = response.body;
            assert.isTrue(result.length > 100);
            shares.toggle($shareFileUuid); // so we can perform more tests below
            done();
          });
      });
    });
  });

  describe('GET /shared/file/$shareFileUuid/$key', function() {
    it('should get a shared file key', function(done) {
      unirest.get(URL + 'shared/file/' + $shareFileUuid + '/a')
        .end(function(response) {
          var result = response.body;
          assert.equal(result.file.data.a, 1);
          done();
        });
    })
  });

  describe('POST /bucket/bucket2/share/' + $shareFileUuid + '/toggle', function() {
    it('should toggle a share', function(done) {
      unirest.post(URL + 'bucket/bucket2/share/' + $shareFileUuid + '/toggle')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.bucket.shares[$shareFileUuid].type, 'file');
          assert.equal(result.bucket.shares[$shareFileUuid].name, 'file2');
          assert.isFalse(result.bucket.shares[$shareFileUuid].active);
          done();
        });
    })
  });

  describe('POST /bucket/bucket2/share/' + $shareFileUuid + '/delete', function() {
    it('should delete a share', function(done) {
      unirest.post(URL + 'bucket/bucket2/share/' + $shareFileUuid + '/delete')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.ok(result.bucket.shares);
          assert.notOk(result.bucket.shares[$shareFileUuid]);
          done();
        });
    })
  });

  describe('POST /bucket/bucket2/file/file2/delete', function() {
    it('should delete a file', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/delete')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.file.uuidDigest));
          assert.equal(result.file.name, 'file2');
          done();
        });
    });

    it('should not delete a file twice', function(done) {
      unirest.post(URL + 'bucket/bucket2/file/file2/delete')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.error, errors.FILE_MISSING.message);
          done();
        });
    });
  });

  describe('POST /bucket/bucket2/delete', function() {
    it('should delete a bucket', function(done) {
      unirest.post(URL + 'bucket/bucket2/delete')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(utils.isDigest(result.bucket.uuidDigest));
          assert.equal(result.bucket.name, 'bucket2');
          done();
        });
    });
  });

  describe('GET /usage', function() {
    it('should get usage', function(done) {
      unirest.get(URL + 'usage')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body
            , usage = result.usage;
          assert.isTrue(usage.stored > 1000);
          $quota = usage.quota;
          done();
        });
    });
  });

  describe('POST /quota', function() {
    it('should increase the quota', function(done) {
      var bytes = 123456789;
      $quotaUuid = quotas.create(bytes);
      unirest.post(URL + 'quota/' + $quotaUuid)
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body
            , usage = result.usage;
          assert.isTrue(usage.stored > 1000);
          assert.isTrue(usage.quota > $quota + bytes - TINY_STORAGE_CHARGE);
          done();
        });
    });

    it('should not increase the quota twice', function(done) {
      unirest.post(URL + 'quota/' + $quotaUuid)
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.error, errors.QUOTA_MISSING.message);
          done();
        });
    });
  });

  describe('GET /version', function() {
    it('should get the API version', function(done) {
      unirest.get(URL + 'version')
        .end(function(response) {
          var result = response.body;
          assert.equal(result.version, '1.0.0');
          done();
        });
    });
  });

  describe('POST /logout', function() {
    it('should logout a user', function(done) {
      unirest.post(URL + 'logout')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(result.ok);
          done();
        });
    });
  });

  describe('GET /usage', function() {
    it('should not get usage after logout', function(done) {
      unirest.get(URL + 'usage')
        .auth($nameDigest, $session)
        .end(function(response) {
          var result = response.body;
          assert.equal(result.error, errors.SESSION_EXPIRED.message);
          done();
        });
    });
  });

  describe('POST /leave', function() {
    it('should destroy a user account', function(done) {
      unirest.post(URL + 'leave')
        .field('nameDigest', $nameDigest)
        .field('passwordDigest', $passwordDigest)
        .end(function(response) {
          var result = response.body;
          assert.isTrue(result.ok);
          done();
        });
    });

    it('should not login to a destroyed user account', function(done) {
      unirest.post(URL + 'login')
        .field('nameDigest', $nameDigest)
        .field('passwordDigest', $passwordDigest)
        .end(function(response) {
          var result = response.body;
          assert(result.error == errors.ACCOUNT_MISMATCH.message);
          done();
        });
    });
  });

  // We only cleanup in *this* file because it runs *after* all the other tests

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

    it('should destroy all restores', function() {
      var restoresPath = archive.store.path()
        , fs = require('fs');
      archive.destroy();
      assert.isFalse( fs.existsSync(restoresPath) );
    });

    it('should destroy all shares', function() {
      var sharesPath = shares.store.path()
        , fs = require('fs');
      shares.destroy();
      assert.isFalse( fs.existsSync(sharesPath) );
    });

    it('should destroy all invites', function() {
      var invitesPath = invites.store.path()
        , fs = require('fs');
      invites.destroy();
      assert.isFalse( fs.existsSync(invitesPath) );
    });

    it('should destroy all quotas', function() {
      var quotasPath = quotas.store.path()
        , fs = require('fs');
      quotas.destroy();
      assert.isFalse( fs.existsSync(quotasPath) );
    });
  });

});
