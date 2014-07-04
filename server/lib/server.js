#!/usr/bin/env node

/**
 * Server - serve the REST API over HTTP (recommend using Nginx for HTTPS)
 */

var os = require('os')
  , HttpStatus = require('http-status-codes')
  , restify = require('restify') // See http://mcavage.github.io/node-restify
  , utils = require('./utils')
  , env = require('./env')(process.env.UUIDS_ENV || 'production')
  , api = require('./api')

  , DEFAULT_PORT = env.UUIDS_PORT || '2219'
  , DEFAULT_IP_ADDRESS = env.UUIDS_IP_ADDRESS || '0.0.0.0';

function Server(argv) { this.argv = argv }
module.exports = Server;

Server.method('setupRoutes', function(restServer) {
  restServer.get('/', function(req, res, next) {
    res.setHeader('location', '/app/');
    res.send(HttpStatus.MOVED_PERMANENTLY);
    return next(false);
  });
  restServer.get(/^\/(app|css|fonts|img|js|pdf)\/.*/, restify.serveStatic({
    directory: __dirname + '/../../site',
    default: 'index.html'
  }));
  api.setupRoutes(restServer);
});

Server.method('createRestServer', function() {
  var restServer = restify.createServer({name: 'UUIDs'});
  restServer.use(restify.authorizationParser());
  restServer.use(restify.queryParser());
  restServer.use(restify.bodyParser({
    keepExtensions: true
  , uploadDir: os.tmpdir()
  }));
  restServer.use(restify.throttle({
    burst: 100
  , rate: 50
  , xff: true
  }));
  this.setupRoutes(restServer);
  return restServer;
});

Server.method('start', function(next) {
  var restServer = this.createRestServer();
  function run() {
    console.log('Started %s at %s (v. %s)', restServer.name, restServer.url, api.VERSION);
    if (next) next();
  }
  restServer.pre(restify.pre.userAgentConnection()); // For "curl" clients
  restServer.listen(
    this.argv.port || DEFAULT_PORT
  , this.argv.ip || DEFAULT_IP_ADDRESS
  , run
  );
});
