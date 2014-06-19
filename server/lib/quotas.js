#!/usr/bin/env node

/**
 * Quotas - manage account quotas (see the Splitter class for details)
 */

var Splitter = require('./splitter');
module.exports = new Splitter('quotas');
