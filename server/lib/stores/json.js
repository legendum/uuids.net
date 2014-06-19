#!/usr/bin/env node

/**
 * JsonStore is designed to mimic DBM, but by using a JSON file instead.
 *
 * exists() - Check whether a store already exists
 * path(path) - Set the path for the key/value store
 * read(key) - Read the value indexed by key
 * write(key, value) - Write a value indexed by key
 * delete(key) - Delete a key/value pair from the store
 * type() - Return what type of store this is
 * destroy() - Destroy the key/value store by deleting it
 */

var fs = require('fs')
  , utils = require('../utils')
  , errors = require('../errors');

function JsonStore() {}
module.exports = JsonStore;

function readFile(filepath) {
  if (utils.exists(filepath)) return utils.readFile(filepath);
};

JsonStore.method('exists', function() {
  return utils.exists(this.filepath);
});

JsonStore.method('path', function(path) {
  path = utils.folderize(path);
  if (path) this.filepath = path + '.json';
  return this.filepath;
});

JsonStore.method('read', function(key) {
  var data, json;
  if (!this.filepath) throw errors.STORE_HAS_NO_PATH;
  json = readFile(this.filepath);
  if (!json) return null;
  data = JSON.parse(json);
  return data[key];
});

JsonStore.method('write', function(key, value) {
  var data, json;
  if (!this.filepath) throw errors.STORE_HAS_NO_PATH;
  json = readFile(this.filepath);
  data = json ? JSON.parse(json) : {};
  data[key] = value;
  utils.writeFile(this.filepath, JSON.stringify(data));
});

JsonStore.method('delete', function(key) {
  var data, json;
  if (!this.filepath) throw errors.STORE_HAS_NO_PATH;
  json = readFile(this.filepath);
  data = json ? JSON.parse(json) : {};
  delete data[key];
  utils.writeFile(this.filepath, JSON.stringify(data));
});

JsonStore.method('type', function() {
  return 'json';
});

JsonStore.method('destroy', function() {
  if (this.exists()) fs.unlinkSync(this.filepath);
  this.filepath = null;
});
