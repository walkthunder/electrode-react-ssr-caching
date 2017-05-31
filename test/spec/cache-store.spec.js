"use strict";

// test cache store feature

const CacheStore = require("../../lib/cache-store");

describe("CacheStore", function () {
  this.timeout(15000);
  it("should cache entry", function () {
    const cacheStore = new CacheStore({
      maxAge: 200,
      max: 1024
    });
    expect(cacheStore.getEntry("test", "1")).to.equal(undefined);
    cacheStore.newEntry("test", "1", {html: "hello"});
    expect(cacheStore.getEntry("test", "1")).to.be.ok;
    expect(cacheStore.getEntry("test", "1").html).to.equal("hello");
    expect(cacheStore.getEntry("test", "1").hits).to.equal(3);
  });

  it("should free up cache", function (done) {
    const cacheStore = new CacheStore({
      maxAge: 100,
      max: 23
    });
    cacheStore.newEntry("test", "1", {html: "hello1"});
    cacheStore.newEntry("test", "2", {html: "hello2"});
    cacheStore.newEntry("test", "3", {html: "hello3"});
    cacheStore.newEntry("test", "4", {html: "hello4"});
    cacheStore.newEntry("test", "5", {html: "hello5"});
    cacheStore.newEntry("test", "6", {html: "hello6"});
    cacheStore.newEntry("test", "7", {html: "hello7"});
    setTimeout(() => {
      cacheStore.getEntry("test", "5");
      cacheStore.newEntry("foobar", "1", {html: "blahblahblahblahblah"});
      expect(cacheStore.cache.keys()).includes("test-7", "test-5", "foobar-1");
      cacheStore.newEntry("foobar", "2", {html: "blahblahblahblahblah"});
      expect(cacheStore.cache.keys()).to.deep.equal(["foobar-2", "foobar-1", "test-5"]);
      done();
    }, 90);
  });

  it("should free all cache when expired", function (done) {
    const cacheStore = new CacheStore({
      maxAge: 10
    });
    cacheStore.newEntry("test", "1", {html: "hello1"});
    cacheStore.newEntry("test", "2", {html: "hello2"});
    setTimeout(() => {
      expect(cacheStore.getEntry("test", "1")).to.equal(undefined);
      expect(cacheStore.getEntry("test", "2")).to.equal(undefined);
      done();
    }, 100);
  });
  const redisHost = process.env.REDIS;
  const port = process.env.REDIS_PORT || 6379;
  const password = process.env.REDIS_PW;
  if (redisHost && port && password) {
    const Redis = require("ioredis");
    const cacheImpl = new Redis(port, redisHost, { password });
    cacheImpl.length = cacheImpl.dbsize;

    it("should cache data with redis", function (done) {
      const cacheStore = new CacheStore({
        cacheImpl
      });
      Promise.resolve()
      .then(function () {
        return cacheStore.newEntry("test", "1", {html: "hello1"});
      })
      .then(function () {
        return cacheStore.getEntry("test", "1")
        .then(function (res) {
          expect(res.html).to.equal("hello1");
          done();
        });
      })
      .catch(function (e) {
        console.log("error happened: ", e);
        done();
      });
    });

    it("should cache data with redis in production mode", function (done) {
      const cacheStore = new CacheStore({
        cacheImpl,
        debug: false
      });
      Promise.resolve()
      .then(function () {
        return cacheStore.newEntry("test", "1", {html: "hello1"});
      })
      .then(function () {
        return cacheStore.getEntry("test", "1")
        .then(function (res) {
          expect(res.html).to.equal("hello1");
          done();
        });
      })
      .catch(function (e) {
        console.log("error happened: ", e);
        done();
      });
    });
  }
});
