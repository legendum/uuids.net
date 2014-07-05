#!/usr/bin/env node

/**
 * Errors - provide easily throwable Error objects, e.g. errors.ACCOUNT_EXISTS
 */

var util = require('util') // that's the *node* utility library, not ours
  , HttpStatus = require('http-status-codes')
  , ERRORS = {
      ACCESS_DENIED: ["Access denied", HttpStatus.FORBIDDEN]
    , ACCOUNT_EXISTS: ["Account already exists", HttpStatus.FORBIDDEN]
    , ACCOUNT_MISMATCH: ["Account does not exist or password is incorrect", HttpStatus.FORBIDDEN]
    , ACCOUNT_STATE: ["Account state is '%s'", HttpStatus.FORBIDDEN]
    , BAD_PARAMETERS: ["Oops, bad parameters", HttpStatus.BAD_REQUEST]
    , BUCKET_EXISTS: ["Bucket already exists", HttpStatus.FORBIDDEN]
    , BUCKET_MISSING: ["Bucket does not exist", HttpStatus.NOT_FOUND]
    , FILE_BUSY: ["File is being changed", HttpStatus.LOCKED]
    , FILE_EXISTS: ["File already exists", HttpStatus.FORBIDDEN]
    , FILE_MISSING: ["File does not exist", HttpStatus.NOT_FOUND]
    , FILE_NO_CONTENT: ["File has no content", HttpStatus.NOT_FOUND]
    , FILENAME_REQUIRED: ["Filename required", HttpStatus.BAD_REQUEST]
    , INFO_SIZE_TOO_BIG: ["Sorry, too much data", HttpStatus.REQUEST_TOO_LONG]
    , INVITATION_NEEDED: ["Invitation needed", HttpStatus.FORBIDDEN]
    , JSON_MALFORMED: ["JSON data was malformed", HttpStatus.BAD_REQUEST]
    , KEY_MISSING: ["Data tag is missing", HttpStatus.BAD_REQUEST]
    , KEY_TOO_LONG: ["Data tag length is too long", HttpStatus.REQUEST_TOO_LONG]
    , KEY_WRONG_TYPE: ["Data tag is the wrong type", HttpStatus.INTERNAL_SERVER_ERROR]
    , LOCKED_FILE_AT: ["Locked file at '%s'", HttpStatus.LOCKED]
    , PARAM_MISSING: ["Required parameter '%s' missing", HttpStatus.BAD_REQUEST]
    , QUOTA_EXCEEDED: ["Account quota exceeded", HttpStatus.INSUFFICIENT_STORAGE]
    , QUOTA_MISSING: ["Quota does not exist", HttpStatus.NOT_FOUND]
    , SESSION_EXPIRED: ["Session has expired", HttpStatus.FORBIDDEN]
    , SHARE_EMBARGO: ["Shared file is embargoed", HttpStatus.FORBIDDEN]
    , SHARE_EXPIRED: ["Shared file has expired", HttpStatus.FORBIDDEN]
    , SHARE_MISSING: ["Shared file does not exist", HttpStatus.NOT_FOUND]
    , STORE_HAS_NO_NAME: ["Store has no name", HttpStatus.INTERNAL_SERVER_ERROR]
    , STORE_HAS_NO_PATH: ["Store has no path", HttpStatus.INTERNAL_SERVER_ERROR]
    , UUID_MISSING: ["UUID does not exist", HttpStatus.NOT_FOUND]
    , VALUE_TOO_LONG: ["Value length is too long", HttpStatus.REQUEST_TOO_LONG]
    };

function Errors() {
  var my = this, details, description, code;

  for (var error in ERRORS) {
    details = ERRORS[error];
    description = details[0];
    code = details[1];
    this[error] = new Error(description);
    this[error].code = code;
  }

  // The "create" method allows us to interpolate strings into the error message
  this.create = function(error) {
    var args = [].splice.call(arguments, 1)
      , err = my[error]
      , code = err.code;
    args.unshift(err.message);
    err = new Error(util.format.apply(util, args));
    err.code = code;
    return err;
  };
}
module.exports = new Errors();
