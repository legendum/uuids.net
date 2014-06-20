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
 * total() - Get the total number of bytes used (input + output + stored)
 * quota() - Get/set the quota for the total bytes (input + output + stored)
 * error() - Returns an error message if the quota is exceeded or if suspended
 */

var errors = require('./errors')
  , utils = require('./utils')
  , Info = require('./info')
  , ACTIVE_STATE = 'active'
  , DAYS_IN_YEAR = 365
  , MSECS_IN_DAY = 86400000
  , PROPERTIES = ['input', 'output', 'stored', 'quota', 'state', 'updated'];

// Because usage objects are frequently created, we offer two constructors:
// a "create from archive" version and a faster "create from local store"
// version. The former is used when we begin handling the network request.
// See the File class for a good example of how this works in practice.
function Usage(uuid, next) {
  var usage = this;
  if (next) {
    this.createFromArchive(uuid, function(err) {
      usage.accountForStorage();
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
  meta.state = meta.state || ACTIVE_STATE;
  meta.updated = meta.updated || now;
  if (meta.quota && meta.stored) {
    // In one year, the quota is reduced by the amount of data stored in bytes
    msecs = now - meta.updated;
    meta.quota = meta.quota -
                 parseInt(meta.stored * msecs / MSECS_IN_DAY / DAYS_IN_YEAR);
  }
  meta.updated = now;
  this.meta(meta);
});

Usage.method('error', function() {
  var meta = this.meta();
  if (this.total(meta) > (meta.quota || 0)) return errors.QUOTA_EXCEEDED;
  if (meta.state && meta.state != ACTIVE_STATE) {
    return errors.create('ACCOUNT_STATE', meta.state);
  }
  return null;
});

Usage.method('total', function(bytes) {
  var bytes = bytes || this.meta();
  return (bytes.input || 0) + (bytes.output || 0) + (bytes.stored || 0);
});

Usage.method('writeBytes', function(bytesWritten) {
  var bytes = this.meta();
  bytes.input = bytes.input || 0;
  if (bytesWritten > 0) {
    bytes.input += bytesWritten;
    this.meta(bytes);
  }
  return bytes.input;
});

Usage.method('readBytes', function(bytesRead) {
  var bytes = this.meta();
  bytes.output = bytes.output || 0;
  if (bytesRead > 0) {
    bytes.output += bytesRead;
    this.meta(bytes);
  }
  return bytes.output;
});

Usage.method('storeBytes', function(sizeDiffInBytes) {
  var bytes = this.meta();
  bytes.stored = bytes.stored || 0;
  bytes.stored += sizeDiffInBytes;
  this.meta(bytes);
  return bytes.stored;
});
