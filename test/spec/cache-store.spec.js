"use strict";

// test cache store feature

const CacheStore = require("../../lib/cache-store");

describe("CacheStore", function () {
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
      max: 79
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
      expect(cacheStore.cache.keys()).includes("test-4", "test-6", "test-5", "foobar-1");
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
});
