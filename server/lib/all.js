#!/usr/bin/env node

/**
 * When playing with node, just enter: <code>require('./all')</code>
 */

global.env = require('./env')('test');
global.account = require('./account');
global.accounts = require('./accounts');
global.Bucket = require('./bucket');
global.content = require('./content');
global.errors = require('./errors');
global.File = require('./file');
global.Info = require('./info');
global.archive = require('./archive');
global.invites = require('./invites');
global.quotas = require('./quotas');
global.secrets = require('./secrets');
global.server = require('./server');
global.sessions = require('./sessions');
global.shares = require('./shares');
global.Store = require('./store');
global.Usage = require('./usage');
global.utils = require('./utils');

