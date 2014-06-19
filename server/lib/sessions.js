#!/usr/bin/env node

/**
 * Sessions - manage sessions for accounts (see the Splitter class for details)
 */

var Splitter = require('./splitter');
module.exports = new Splitter('sessions');
