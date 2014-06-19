#!/usr/bin/env node

/**
 * Manage the environment depending on whether we're testing or not
 */

var path = require('path')
  , DEFAULT_BLOBS_PATH = path.join(__dirname, '../../blob')
  , DEFAULT_STORE_PATH = path.join(__dirname, '../../data');

function Env(environment) {
  var env = process.env;

  env.UUIDS_BLOBS_PATH = env.UUIDS_BLOBS_PATH || DEFAULT_BLOBS_PATH;
  env.UUIDS_BUCKET_NAME = env.UUIDS_BUCKET_NAME || 'uuids';
  env.UUIDS_STORE_PATH = env.UUIDS_STORE_PATH || DEFAULT_STORE_PATH;
  env.UUIDS_STORE_TYPE = (environment == 'test' ? 'json' : 'dbm');
  env.UUIDS_SECRET_KEY = env.UUIDS_SECRET_KEY || 'en.wikipedia.org/wiki/Uuid';
  return env;
}
module.exports = Env;
