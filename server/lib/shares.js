#!/usr/bin/env node

/**
 * Shares - manage shared buckets and files (see the Splitter class for details)
 */

var Splitter = require('./splitter');
module.exports = new Splitter('shares');
