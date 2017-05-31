"use strict";

// test simple caching feature

require("../farmhash-mock");
const SSRCaching = require("../..");
const renderGreeting = require("../gen-lib/render-greeting").default;
const chai = require("chai");
const expect = chai.expect;
process.env.NODE_ENV = "production";

describe("SSRCaching simple caching", function () {
  afterEach(() => {
    SSRCaching.setCachingConfig({});
    SSRCaching.clearCache();
    SSRCaching.clearProfileData();
  });

  const verifyRenderResults = (r1, r2, r3) => {
    expect(r1).to.equal(r2);
    expect(r1).to.equal(r3);
    expect(r2).to.equal(r3);
  };

  //
  // test simple strategy with user provided function to generate cache key
  //
  it("should cache component with simple strategy", function () {
    const message = "how're you?";

    let start = Date.now();
    const r1 = renderGreeting("test", message);
    const r1Time = Date.now() - start;

    SSRCaching.enableCaching();
    SSRCaching.setCachingConfig({
      components: {
        "Hello": {
          strategy: "simple",
          enable: true,
          genCacheKey: () => "key-simple"
        }
      }
    });

    // should add an entry to cache with key-simple

    SSRCaching.shouldHashKeys(false);
    renderGreeting("test", message);
    expect(SSRCaching.cacheStore.getEntry("Hello", "key-simple").hits).to.equal(1);

    // should add an entry to cache with hashed key from key-simple

    SSRCaching.shouldHashKeys(true);
    start = Date.now();
    const r2 = renderGreeting("test", message);
    const r2Time = Date.now() - start;
    let entry = SSRCaching.cacheStore.getEntry("Hello", "500034349202595839ffe2cb6f83665b");
    expect(entry.hits).to.equal(1);

    // now render should use result from cache

    start = Date.now();
    const r3 = renderGreeting("test", message);
    const r3Time = Date.now() - start;

    console.log(`rendering time r1 ${r1Time}ms r2 ${r2Time} r3 (cached) ${r3Time}`);
    expect(r3Time).below(r1Time);
    expect(r3Time).below(r2Time);
    entry = SSRCaching.cacheStore.getEntry("Hello", "500034349202595839ffe2cb6f83665b");
    expect(entry.hits).to.equal(3);
    verifyRenderResults(r1, r2, r3);
  });

  //
  // test cache store config
  //
  it("should clean up all cache when expired", function () {
    const message = "how're you again?";

    SSRCaching.enableCaching();
    SSRCaching.setCachingConfig({
      components: {
        "Hello": {
          strategy: "simple",
          enable: true,
          genCacheKey: () => "key-simple"
        }
      },
      lruCacheConfig: {
        max: 50 * 1024 * 1024, // 50M
        length: function (n, key) {
          const len = key && key.length || 0;
          if (n && n.html) {
            return n.html.length + len;
          }
          return len;
        },
        maxAge: 1000 * 15
      }
    });
    SSRCaching.shouldHashKeys(false);
    renderGreeting("test", message);
    expect(SSRCaching.cacheStore.getEntry("Hello", "key-simple").hits).to.equal(1);
    setTimeout(function () {
      expect(SSRCaching.cacheStore.getEntry("Hello", "key-simple").hits).to.equal(0);
    }, 2000);
  });

  //
  // test simple strategy with JSON.stringify on props to generate cache key
  //
  it("should cache component with simple strategy and stringify", function () {
    const message = "good morning";

    SSRCaching.enableProfiling(true);
    const r1 = renderGreeting("test", message);
    const data = SSRCaching.profileData;
    expect(data.Greeting[0].Hello[0].time).to.be.above(0);

    SSRCaching.enableProfiling(false);
    SSRCaching.clearProfileData();
    expect(data).to.deep.equal({});

    SSRCaching.enableCaching();
    SSRCaching.setCachingConfig({
      components: {
        "Hello": {
          strategy: "simple",
          enable: true
        }
      }
    });

    // should add an entry to cache with stringified props as cache key

    SSRCaching.shouldHashKeys(false);
    renderGreeting("test", message);
    expect(SSRCaching.cacheStore.getEntry("Hello", JSON.stringify({name: "test", message})).hits).to.equal(1);

    // should add an entry to cache with hashed value of key

    SSRCaching.shouldHashKeys(true);
    const r2 = renderGreeting("test", message);
    let entry = SSRCaching.cacheStore.getEntry("Hello", "6a86523415a68c4c7580fe6db324923c");
    expect(entry.hits).to.equal(1);

    // now render should use result from cache

    SSRCaching.enableProfiling(true);
    const r3 = renderGreeting("test", message);
    expect(data.Greeting[0].Hello[0].time).to.be.above(0);
    entry = SSRCaching.cacheStore.getEntry("Hello", "6a86523415a68c4c7580fe6db324923c");
    expect(entry.hits).to.equal(3);
    verifyRenderResults(r1, r2, r3);
  });
});
