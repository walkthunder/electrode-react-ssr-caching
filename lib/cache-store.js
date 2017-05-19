"use strict";
/* eslint-disable */
const LRU = require("lru-cache");
const lruCacheConfig = require("./config").defaultLruCacheConfig;

function CacheStore(cfg) {
  this.config = Object.assign({}, lruCacheConfig, cfg);
  this.cache = LRU(this.config);
  this.size = this.cache.length;
}

CacheStore.prototype.newEntry = function (name, key, value) {
  const entryKey = `${name}-${key}`;
  this.cache.set(entryKey, value);
  value.hits = 0;
}

CacheStore.prototype.getEntry = function (name, key) {
  const value = this.cache.get(`${name}-${key}`);
  value && value.hits++
  return value;
}

module.exports = CacheStore;
