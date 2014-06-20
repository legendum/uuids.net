#!/usr/bin/env node

/**
 * Utils - a variety of very handy utiliy functions to avoid code duplication
 */

var fs = require('fs')
  , crypto = require('crypto')
  , scrypt = require('scrypt')
  , uuid = require('node-uuid')
  , errors = require('./errors')
  , LOCK_EXT = '.lock'
  , LOCK_WAIT = 200 // milliseconds
  , LOCK_STALE = 5000 // milliseconds
  , RAINBOW_TABLE_PROTECTION = 'en.wikipedia.org/wiki/Edward_Snowden';

function Utils() {
  Function.prototype.method = function(name, fn) {
    this.prototype[name] = fn;
  };
  this.LOCK_EXT = LOCK_EXT;
}
module.exports = new Utils(); // export a "utils" object, not the function

Utils.method('quit', function() {
  var args = [].splice.call(arguments, 0);
  console.log.apply(console, args);
  process.exit();
});

Utils.method('ipAddress', function(argv) {
  return argv.ip || '0.0.0.0';
});

Utils.method('port', function(argv) {
  var port = argv.port;
  if (!port) {
    this.quit("usage: %s --port=2219", argv.$0)
  }
  return port;
});

Utils.method('digest', function(data, sha, out) {
  sha = sha || 'sha1';
  out = out || 'hex'; if (out == 'none') out = null;
  var shasum = crypto.createHash(sha);
  shasum.update(data + RAINBOW_TABLE_PROTECTION, 'utf8');
  return shasum.digest(out);
});

Utils.method('digestKey', function(data) {
  return this.digest(data, 'sha256', 'none'); // for "encrypt" and "decrypt"
});

Utils.method('exists', function(path) {
  return path && fs.existsSync(path);
});

Utils.method('folderize', function(path) {
  if (!path) return;
  var dirs = path.split('/')
    , file = dirs.pop();
  if (file.length < 36) { // digest filenames are 40 hex characters and UUIDs 36
    path = dirs.join('/');
  } else {
    for (var i = 1; i <= 2; i++) {
      dirs.push(file.substr(0, i*2));
      path = dirs.join('/');
      if (!fs.existsSync(path)) fs.mkdirSync(path, 0755);
    }
  }
  return path + '/' + file;
});

Utils.method('scrypt', function(data, next) {
  var maxTime = 0.2; // Seems to be a good choice
  scrypt.passwordHash(data, maxTime, function(err, hash) {
    if (err) return next(err);
    next(null, hash);
  });
});
    
Utils.method('scryptMatch', function(data, hash, next) {
  scrypt.verifyHash(hash, data, function(err, result) {
    if (err) return next(err);
    next(null, result);
  });
});

Utils.method('encrypt', function(data, key) {
  var cryptKey = this.digestKey(key)
    , iv = this.digest(key, 'sha1').substr(23, 16) // just coz
    , encipher = crypto.createCipheriv('aes-256-cbc', cryptKey, iv)
    , encryptData = encipher.update(data, 'utf8', 'binary');

  encryptData += encipher.final('binary');
  var encoded = new Buffer(encryptData, 'binary').toString('base64');
  return encoded;
});

Utils.method('decrypt', function(data, key) {
  encryptData = new Buffer(data, 'base64').toString('binary');

  var cryptKey = this.digestKey(key)
    , iv = this.digest(key, 'sha1').substr(23, 16) // just coz
    , decipher = crypto.createDecipheriv('aes-256-cbc', cryptKey, iv)
    , decoded = decipher.update(encryptData, 'binary', 'utf8');

  decoded += decipher.final('utf8');
  return decoded;
});

Utils.method('readFile', function(path) {
  return fs.readFileSync(path, 'utf8');
});

Utils.method('reverse', function(str) {
  return str.split('').reverse().join('');
});

Utils.method('stat', function(path) {
  if (fs.existsSync(path)) return fs.statSync(path);
});

Utils.method('time', function() {
  return (new Date).getTime(); // milliseconds since 00:00:00 on 1/1/1970
});

Utils.method('lock', function(path, wait, stale) {
  var lockfile = path + LOCK_EXT;
  this.waitWhileLocked(lockfile, wait, stale);
  this.writeFile(lockfile, this.time());
});

Utils.method('waitWhileLocked', function(path, wait, stale) {
  var lockfile = path + LOCK_EXT
    , locktime;
  wait = wait || LOCK_WAIT;
  stale = stale || LOCK_STALE;
  // And here's where my Node-fu finally failed me :-(
  while (this.exists(lockfile)) {
    locktime = this.time() - parseInt(this.readFile(lockfile));
    if (locktime > wait && locktime < stale) {
      throw errors.create('LOCKED_FILE_AT', path);
    }
  }
});

Utils.method('isLocked', function(path) {
  return this.exists(path + LOCK_EXT);
});

Utils.method('unlock', function(path) {
  this.unlink(path + LOCK_EXT);
});

Utils.method('unlink', function(path) {
  if (fs.existsSync(path)) fs.unlinkSync(path);
});

Utils.method('unwrap', function(data, key) {
  var json = null;
  try {
   json = JSON.parse(this.decrypt(data, key));
  } catch (e) {}
  return json;
});

Utils.method('uuid', function() {
  return uuid.v4();
});

Utils.method('isDigest', function(digest) {
  var match = digest.match(/^\w{40}$/);
  return (match && match.index === 0 ? true : false);
});

Utils.method('isUuid', function(uuid) {
  var match = uuid.match(/^(\w+\-){4}\w+$/);
  return uuid.length === 36 && match && match.index === 0;
});

Utils.method('wrap', function(data, key) {
  return this.encrypt(JSON.stringify(data), key);
});

Utils.method('writeFile', function(path, data) {
  fs.writeFileSync(path, data, 'utf8');
});
