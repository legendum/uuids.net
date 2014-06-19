#!/usr/bin/env node

var argv = require('yargs').argv
  , Server = require('./lib/server');

(new Server(argv)).start();
