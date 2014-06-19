#!/usr/bin/env node

/**
 * Invites - manage account invitations (see the Splitter class for details)
 */

var Splitter = require('./splitter');
module.exports = new Splitter('invites');
