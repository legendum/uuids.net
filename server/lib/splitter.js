#!/usr/bin/env node

/**
 * Splitter - manage sessions and shares by splitting a UUID into 2 parts then
 *            requiring both parts to be combined in order to access the session
 *            or the share. It relies on Shamir's Secret Sharing Scheme.
 *
 * create(secret) - Create a session or share and return the user's part of it
 * access(partKey) - Access a session or share by providing the user's part
 * toggle(partKey) - Toggle the session or share so it's on or off
 * delete(partKey) - Delete the session or share
 * destroy() - Destroy all the sessions or shares (this is not undoable!!!)
 */

var Store = require('./store')
  , utils = require('./utils')
  , s4 = require('./s4');

function Splitter(storeName, paddingBits) {
  this.storeName = storeName;
  this.paddingBits = paddingBits || 256;
  this.store = new Store(this.storeName);
}
module.exports = Splitter;

Splitter.method('create', function(secret) {
  var secretStr = JSON.stringify(secret)
    , secretHex = s4.str2hex(secretStr)
    , shares = s4.share(secretHex, 2, 2, this.paddingBits)
    , storedPart = shares[0]
    , sharedPart = shares[1]
    , uuidOfPart = utils.uuid();

  this.store.writeWrapped(sharedPart, storedPart);
  this.store.writeWrapped(uuidOfPart, sharedPart);
  return uuidOfPart;
});

Splitter.method('access', function(uuidOfPart) {
  var sharedPart = this.store.readWrapped(uuidOfPart)
    , storedPart = this.store.readWrapped(sharedPart);
  if (!storedPart) return null;
  try {
    return JSON.parse( s4.hex2str(s4.combine( [storedPart, sharedPart] )) );
  } catch (e) {
    return null;
  }
});

Splitter.method('toggle', function(uuidOfPart) {
  var sharedPart = this.store.readWrapped(uuidOfPart)
    , storedPart = this.store.readWrapped(sharedPart);
  if (!storedPart) return null;
  this.store.writeWrapped(sharedPart, utils.reverse(storedPart));
});

Splitter.method('delete', function(uuidOfPart) {
  var sharedPart = this.store.readWrapped(uuidOfPart);
  this.store.deleteWrapped(sharedPart);
  this.store.deleteWrapped(uuidOfPart);
});

Splitter.method('destroy', function() {
  this.store.destroy();
});
