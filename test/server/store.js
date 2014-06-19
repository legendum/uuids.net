#!/usr/bin/env node

var assert = require('chai').assert
  , Store = require('../../server/lib/store')
  , _ = require('underscore')
  , STORES = ['json', 'dbm']; // TODO: Add new key/value stores for testing

describe('Store', function() {

  function performStoreOperations(type) {
    var store = new Store('test', type)
      , data = {a:1, b:2, c:3, d:4};
    assert.equal(store.type(), type);
    store.write('a', '1');
    store.write('b', '2');
    assert.equal(store.read('a'), '1');
    assert.equal(store.read('b'), '2');
    store.delete('b');
    assert.equal(store.read('b'), undefined);
    store.write('c', '3');
    assert.equal(store.read('c'), '3');
    store.writeWrapped('data', data);
    assert.deepEqual(store.readWrapped('data'), data);
    store.destroy();
  }

  describe('Store test suite', function() {
    it('should perform all store operations', function() {
      _.each(STORES, function(type) {
        performStoreOperations(type);
      });
    })
  })

})
