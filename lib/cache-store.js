"use strict";
/* eslint-disable */
const LRU = require("lru-cache");
const defaultLruCacheConfig = require('./config').defaultLruCacheConfig;
// Note that cache implementation should implement `length` attribute, `get()` and `set()` functions
function CacheStore(cfg) {
  const config = Object.assign({}, defaultLruCacheConfig, cfg);
  this.cache = config.cacheImpl ? config.cacheImpl : LRU(config);
}

CacheStore.prototype.size = function () {
  return this.cache.length;
}

CacheStore.prototype.newEntry = function (name, key, value) {
  const entryKey = `${name}-${key}`;
  value.hits = 0;
  return this.cache.set(entryKey, value);
}

CacheStore.prototype.getEntry = function (name, key) {
  const res = this.cache.get(`${name}-${key}`);
  if (res && typeof res.then === 'function') {
    return res.then(value => {
      value && value.hits++;
      return value;
    })
  }
  res && res.hits++;
  return res;
}

module.exports = CacheStore;
