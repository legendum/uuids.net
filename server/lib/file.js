#!/usr/bin/env node

/**
 * File - subclass the "Info" class to add usage accounting to key/value
 *        operations. This class renames "get" to "read", "set" to "write",
 *        and "unset" to "erase".
 *
 *        Various properties are supported as methods on a file object.
 *        They are:
 *          * created - when the file was created (in millisecs since 1/1/1970)
 *          * name - the filename given when the file was created (see note*)
 *          * path - the path to the file content (in the "blob" folder)
 *          * secret - a secret UUID used for encrypting file content
 *          * size - the size of the file content (in the "blob" folder)
 *          * type - the type of the file content (in the "blob" folder)
 *          * updated - when the file was most recently updated
 *          * usage - the UUID of the usage object for the account
 *
 *        Properties are very simple to get and set. For example, call
 *        <code>file.name("poem.txt")</code> to set the filename, then
 *        just call <code>file.name()</code> to read it.
 *
 *        *Note that the filename of the uploaded content does not change
 *        the "name" property of the file object. It remains as it was set.
 */

var Info = require('./info')
  , Usage = require('./usage')
  , utils = require('./utils')
  , PROPERTIES = ['created', 'name', 'path', 'secret', 'size', 'type', 'updated', 'usage'];

function File(uuid, next) {
  var file = this;
  this.createFromArchive(uuid, function(err) {
    if (err) return next(err);
    if (!file.secret()) file.secret(utils.uuid()); // used to store file content
    if (file.usage()) {
      new Usage(file.usage(), function(err, usageObject) {
        next(err, file);
      });
    } else {
      next(null, file);
    }
  });
}
File.prototype.__proto__ = Info.prototype;
Info.properties(File, PROPERTIES);
module.exports = File;

File.method('usageObject', function() {
  var usage = this.usage()
    , usageObject = usage ? new Usage(usage) : null;
  return usageObject;
});

File.method('read', function(key, cryptor) {
  var usage = this.usageObject()
    , value = this.get(key, cryptor);
  if (usage && value) {
    usage.readBytes(JSON.stringify(value).length);
  }
  return value;
});

File.method('write', function(key, value, cryptor) {
  var usage = this.usageObject()
    , oldSize = this.infoSize()
    , newSize;
  this.set(key, value, cryptor);
  if (usage) {
    newSize = this.infoSize();
    if (oldSize != newSize) usage.storeBytes(newSize - oldSize);
    if (value) usage.writeBytes(JSON.stringify(value).length);
  }
  return value;
});

File.method('destroy', function(next) {
  utils.unlink(this.path());
  this.destroyInfo(next);
});

File.method('erase', function(key) {
  this.unset(key);
});
