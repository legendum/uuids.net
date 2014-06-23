#!/usr/bin/env node

/**
 * Usage - track the number of bytes that travel through the system for accounts
 *
 * writeBytes(bytes) - Increase the count of written bytes (input)
 * readBytes(bytes) - Increase the count of read bytes (output)
 * storeBytes() - Increase the count of stored bytes by the file size
 * input() - Get the total number of bytes written
 * output() - Get the total number of bytes read
 * stored() - Get the total number of bytes stored
 * transferred() - Get the total number of bytes transferred (input + output)
 * quota() - Get/set the quota for the total bytes (input + output + stored)
 * error() - Returns an error message if the quota is exceeded or if suspended
 */

var errors = require('./errors')
  , utils = require('./utils')
  , Info = require('./info')
  , MSECS_IN_DAY = 86400000
  , DAYS_IN_YEAR = 365
  , PROPERTIES = ['input', 'output', 'stored', 'quota', 'state', 'updated'];

// Because usage objects are frequently created, we offer two constructors:
// a "create from archive" version and a faster "create from local store"
// version. The former is used when we begin handling the network request.
// See the File class for a good example of how this works in practice.
function Usage(uuid, next) {
  var usage = this;
  if (next) {
    this.createFromArchive(uuid, function(err) {
      if (err) return next(err);
      var meta = usage.accountForStorage();
      err = usage.error(meta); // e.g. quota exceeded, or account suspended
      next(err, usage);
    });
  } else {
    this.create(uuid);
  }
}
Usage.prototype.__proto__ = Info.prototype;
Info.properties(Usage, PROPERTIES);
module.exports = Usage;

Usage.method('accountForStorage', function() {
  var meta = this.meta()
    , now = utils.time()
    , msecs;
  meta.state = meta.state || 'active';
  meta.updated = meta.updated || now;
  if (meta.quota && meta.stored) {
    // In one year, the quota is reduced by the amount of data stored in bytes
    msecs = now - meta.updated;
    meta.quota = meta.quota -
                 parseInt(meta.stored * msecs / MSECS_IN_DAY / DAYS_IN_YEAR);
    if (meta.quota < 0) meta.quota = 0;
  }
  meta.updated = now;
  this.meta(meta);
  return meta;
});

Usage.method('error', function(meta) {
  var meta = meta || this.meta();
  if (this.transferred(meta) > (meta.quota || 0)) {
    return errors.QUOTA_EXCEEDED;
  }
  if (meta.state && meta.state != 'active') {
    return errors.create('ACCOUNT_STATE', meta.state);
  }
  return null;
});

Usage.method('transferred', function(meta) {
  var meta = meta || this.meta();
  return (meta.input || 0) + (meta.output || 0);
});

Usage.method('writeBytes', function(bytesWritten) {
  var meta = this.meta();
  meta.input = meta.input || 0;
  if (bytesWritten > 0) {
    meta.input += bytesWritten;
    this.meta(meta);
  }
  return meta.input;
});

Usage.method('readBytes', function(bytesRead) {
  var meta = this.meta();
  meta.output = meta.output || 0;
  if (bytesRead > 0) {
    meta.output += bytesRead;
    this.meta(meta);
  }
  return meta.output;
});

Usage.method('storeBytes', function(sizeDiffInBytes) {
  var meta = this.meta();
  meta.stored = meta.stored || 0;
  meta.stored += sizeDiffInBytes;
  this.meta(meta);
  return meta.stored;
});
