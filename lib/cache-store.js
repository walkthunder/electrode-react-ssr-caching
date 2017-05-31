"use strict";
/* eslint-disable */
const LRU = require("lru-cache");
const defaultLruCacheConfig = require('./config').defaultLruCacheConfig;
// Note that cache implementation should implement `length` attribute, `get()` and `set()` functions
function CacheStore(cfg) {
  const config = Object.assign({}, defaultLruCacheConfig, cfg);
  this.cache = config.cacheImpl ? config.cacheImpl : LRU(config);
  this.debug = config.debug;
}

CacheStore.prototype.size = function () {
  return this.cache.length;
}

CacheStore.prototype.newEntry = function (name, key, value) {
  const entryKey = `${name}-${key}`;
  if (this.debug) {
    value.hits = 0;
  }
  return this.cache.set(entryKey, JSON.stringify(value));
}

CacheStore.prototype.getEntry = function (name, key) {
  const entryKey = `${name}-${key}`;
  let res = this.cache.get(entryKey);
  if (res && typeof res === 'string') {
    res = JSON.parse(res);
    if (this.debug) {
      res.hits++;
      this.cache.set(entryKey, JSON.stringify(res));
    }
  }
  if (res && typeof res.then === 'function') {
    return res.then(value => {
      if (value) {
        console.log("debug info value: ", value);
        value = JSON.parse(value);
        if (this.debug) {
          value.hits++;
          this.cache.set(entryKey, JSON.stringify(value));
        }
      }
      return value;
    })
  }
  return res;
}

module.exports = CacheStore;
