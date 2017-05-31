"use strict";

/* eslint-disable no-magic-numbers */
const defaultConfig = {
  enabled: false,
  profiling: false,
  caching: false,
  hashKey: true,
  stripUrlProtocol: true
};

const defaultLruCacheConfig = {
  debug: true,
  max: 50 * 1024 * 1024, // 50M
  length: function (n, key) {
    const len = key && key.length || 0;
    if (n && n.html) {
      return n.html.length + len;
    }
    return len;
  },
  maxAge: 1000 * 60 * 60 * (Math.random() + 1)
};

exports.defaultLruCacheConfig = defaultLruCacheConfig;

exports.defaultConfig = defaultConfig;
