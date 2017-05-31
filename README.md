# react-ssr-caching [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

Support profiling React Server Side Rendering time and component caching to help you speed up SSR.
This project is originally forked from `electrode-react-ssr-caching`.

# What's new?

This lib [`react-ssr-caching`](https://www.npmjs.com/package/react-ssr-caching) support
1. Configurable lru cache with `lru-cache` lib

    > You could config data expire time, max data length, etc. Config parameters could check [here](https://www.npmjs.com/package/react-ssr-caching).

2. User defined any cache implementations with length(), get() and set() methods, like redis on remote server.  The get() and set() method could be either sync functions or async ones.
    > Note that in this way, data cache stragety should be assigned on the redis server side.


# Installing

```
npm i react-ssr-caching
```

# Why and When we use it

For some reasons like SEO we have to make sure out websites could render web page on the server side. One difficulty with React side rendering is that
1. `ReactDOM.renderToString` is synchronous,
2. nodejs is not good at this kind of work, it's obviously [CPU bound](http://stackoverflow.com/questions/868568/what-do-the-terms-cpu-bound-and-i-o-bound-mean)

so it can become a performance bottleneck in server-side rendering of React sites. This is especially true of pages with larger HTML payloads(like SPA), because `ReactDOM.renderToString`'s runtime tends to scale more or less linearly with the number of virtual DOM nodes. This leads to three problems:

> 1. The server cannot send out any part of the response until the entire HTML is created, which means that browsers can't start working on painting the page until the renderToString call is finished. With larger pages, this can introduce a latency of hundreds of milliseconds.
> 2. The server has to allocate memory for the entire HTML string.
> 3. One call to `ReactDOM.renderToString` can dominate the CPU and starve out other requests. This is particularly troublesome on servers that serve a mix of small and large pages.

On the other side, it's not necessary that the server has to render the same component for every time requests come in, especially when the components contain lots of logic work to handle with. It's really a waste of CPUs. Most components don't have to update instantly. So hold your components in memery with limited time could massively improve your server performances.

This is why we hack React module.


# Usage

Note that since this module patches React's source code to inject the caching logic, it must be loaded before the React module.

For example:

```js
import SSRCaching from "react-ssr-caching";
import React from 'react';
import ReactDOM from 'react-dom/server';
```


## Profiling

You can use this module to inspect the time each component took to render.

```js
import SSRCaching from "react-ssr-caching";
import { renderToString } from "react-dom/server";
import MyComponent from "mycomponent";

// First you should render your component in a loop to prime the JS engine (i.e: V8 for NodeJS)
for( let i = 0; i < 10; i ++ ) {
    renderToString(<MyComponent />);
}

SSRCaching.clearProfileData();
SSRCaching.enableProfiling();
const html = renderToString(<MyComponent />);
SSRCaching.enableProfiling(false);
console.log(JSON.stringify(SSRCaching.profileData, null, 2));
```

## Caching

Once you determined the most expensive components with profiling, you can enable component caching this module provides to speed up SSR performance.

`react-ssr-caching` cache data with [`lru-cache`](https://github.com/isaacs/node-lru-cache). It's default config looks like:
```js
const config = {
  enabled: false,
  profiling: false,
  caching: false,
  hashKey: true,
  stripUrlProtocol: true
};
```

lru cache default config:
```js
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
```

Parameters like `max`, `length()`, `maxAge`, and other paramters. are all the same with the options of [`lru-cache`](https://github.com/isaacs/node-lru-cache):
> * `max` The maximum size of the cache, checked by applying the length
  function to all values in the cache.  Not setting this is kind of
  silly, since that's the whole purpose of this lib, but it defaults
  to `Infinity`.
> * `maxAge` Maximum age in ms.  Items are not pro-actively pruned out
  as they age, but if you try to get an item that is too old, it'll
  drop it and return undefined instead of giving it to you.
> * `length` Function that is used to calculate the length of stored
  items.  If you're storing strings or buffers, then you probably want
  to do something like `function(n, key){return n.length}`.  The default is
  `function(){return 1}`, which is fine if you want to store `max`
  like-sized things.  The item is passed as the first argument, and
  the key is passed as the second argumnet.
> * `dispose` Function that is called on items when they are dropped
  from the cache.  This can be handy if you want to close file
  descriptors or do other cleanup tasks when items are no longer
  accessible.  Called with `key, value`.  It's called *before*
  actually removing the item from the internal cache, so if you want
  to immediately put it back in, you'll have to do that in a
  `nextTick` or `setTimeout` callback or it won't do anything.
> * `stale` By default, if you set a `maxAge`, it'll only actually pull
  stale items out of the cache when you `get(key)`.  (That is, it's
  not pre-emptively doing a `setTimeout` or anything.)  If you set
  `stale:true`, it'll return the stale value before deleting it.  If
  you don't set this, then it'll return `undefined` when you try to
  get a stale entry, as if it had already been deleted.


If you want to use your own cache server, set the lru cache config with
```js
{
    cacheImpl: redisClient // redisClient is instance of redis-cli to redis server
}
```
Then all data would be cached with `redisClient`, and the lru stragety could be set on the redis server side.
You may need some redis client libs here, like [ioredis](https://www.npmjs.com/package/ioredis).

The basic steps to enabling caching are:

```js
import SSRCaching from "react-ssr-caching";

SSRCaching.enableCaching();
SSRCaching.setCachingConfig(cacheConfig);
```

Where `cacheConfig` contains information on what component to apply caching.  See below for details.

In order for the `enableCaching()` method to work, you'll also need `NODE_ENV` set to `production`, or else it will throw an error.

### cacheConfig

SSR component caching was first demonstrated in [Sasha Aickin's talk].

His demo requires each component to provide a function for generating the cache key.

Here we implemented two cache key generation strategies: `simple` and `template`.

You are required to pass in the `cacheConfig` to tell this module what component to apply caching.

For example:

```js
const cacheConfig = {
    components: {
        "Component1": {
            strategy: "simple",
            enable: true
        },
        "Component2": {
            strategy: "template",
            enable: true
        }
    },
    lruCacheConfig: {
        maxAge: 1000 * 60 * 60 // expired in 1 hour later
    }
}

SSRCaching.setCachingConfig(cacheConfig);
```

### Caching Strategies

#### simple

The `simple` caching strategy is basically doing a `JSON.stringify` on the component's props.  You can also specify a callback in `cacheConfig` to return the key.

For example:

```js
const cacheConfig = {
    components: {
        Component1: {
            strategy: "simple",
            enable: true,
            genCacheKey: (props) => JSON.stringify(props)
        }
    },
    lruCacheConfig: {
        max: 50 * 1024 * 1024, // 50 Meg
        maxAge: 1000 * 60 * 60 // expired in 1 hour later
    }
};
```

This strategy is not very flexible.  You need a cache entry for each different props.  However it requires very little processing time.

#### template

The `template` caching strategy is more complex but flexible.  

The idea is akin to generating logic-less handlebars template from your React components and then use string replace to process the template with different props.

If you have this component:

```js
class Hello extends Component {
    render() {
        return <div>Hello, {this.props.name}.  {this.props.message}</div>
    }
}
```

And you render it with props:
```js
const props = { name: "Bob", message: "How're you?" }
```

You get back HTML string:
```html
<div>Hello, <span>Bob</span>.  <span>How&#x27;re you?</span></div>
```

Now if you replace values in props with tokens, and you remember that `@0@` refers to `props.name` and `@1@` refers to `props.message`:
```js
const tokenProps = { name: "@0@", message: "@1@" }
```

You get back HTML string that could be akin to a handlebars template:
```html
<div>Hello, <span>@0@</span>.  <span>@1@</span></div>
```

We cache this template html using the tokenized props as cache key.  When we need to render the same component with a different props later, we can just lookup the template from cache and use string replace to apply the values:
```js
cachedTemplateHtml.replace( /@0@/g, props.name ).replace( /@1@/g, props.message );
```

That's the gist of the template strategy.  Of course there are many small details such as handling the encoding of special characters, preserving props that can't be tokenized, avoid tokenizing non-string props, or preserving `data-reactid` and `data-react-checksum`.

To specify a component to be cached with the `template` strategy:

```js
const cacheConfig = {
    components: {
        Hello: {
            strategy: "template",
            enable: true,
            preserveKeys: [ "key1", "key2" ],
            preserveEmptyKeys: [ "key3", "key4" ],
            ignoreKeys: [ "key5", "key6" ],
            whiteListNonStringKeys: [ "key7", "key8" ]
        }
    }
};
```

   - `preserveKeys` - List of keys that should not be tokenized.
   - `preserveEmptyKeys` - List of keys that should not be tokenized if they are empty string `""`
   - `ignoreKeys` - List of keys that should be completely ignored as part of the template cache key.
   - `whiteListNonStringKeys` - List of non-string keys that should be tokenized.

# API

### [`enableProfiling(flag)`](#enableprofilingflag)

Enable profiling according to flag

   - `undefined` or `true` -  enable profiling
   - `false` - disable profiling

### [`enableCaching(flag)`](#enablecachingflag)

Enable cache according to flag

   - `undefined` or `true` - enable caching
   - `false` - disable caching

### [`setCachingConfig(config)`](#setcachingconfigconfig)

Set caching config to `config`.

### [`stripUrlProtocol(flag)`](#stripurlprotocolflag)

Remove `http:` or `https:` from prop values that are URLs according to flag.

> Caching must be enabled for this to have any effect.

   - `undefined` or `true` - strip URL protocol
   - `false` - don't strip

### [`shouldHashKeys(flag, [hashFn])`](#shouldhashkeysflaghashfn)

Set whether the `template` strategy should hash the cache key and use that instead.

> Caching must be enabled for this to have any effect.

  - `flag`
    - `undefined` or `true` - use a hash value of the cache key
    - `false` - don't use a hash valueo f the cache key
  - `hashFn` - optional, a custom callback to generate the hash from the cache key, which is passed in as a string
    - i.e. `function customHashFn(key) { return hash(key); }`

If no `hashFn` is provided, then [farmhash] is used if it's available, otherwise hashing is turned off.

### [`clearProfileData()`](#clearprofiledata)

Clear profiling data

### [`clearCache()`](#clearcache)

Clear caching data

### [`cacheEntries()`](#cacheentries)

Get total number of cache entries

### [`cacheHitReport()`](#cachehitreport)

Returns an object with information about cache entry hits

# Related works

1. [electrode-react-ssr-caching](https://github.com/electrode-io/electrode-react-ssr-caching)
2. [react-ssr-optimization](https://www.npmjs.com/package/react-ssr-optimization)
3. [react-server](https://github.com/redfin/react-server)
4. [react-dom-stream](https://github.com/aickin/react-dom-stream)
5. [hypernova](https://github.com/airbnb/hypernova)
6. [Rapscallion](https://github.com/FormidableLabs/rapscallion)



Built with :heart: by walkthunder.
Forked from [electrode-react-ssr-caching](https://github.com/electrode-io/electrode-react-ssr-caching)

[Sasha Aickin's talk]: https://www.youtube.com/watch?v=PnpfGy7q96U
[farmhash]: https://github.com/google/farmhash
[npm-image]: https://badge.fury.io/js/react-ssr-caching.svg
[npm-url]: https://npmjs.org/package/react-ssr-caching
[travis-image]: https://travis-ci.org/walkthunder/react-ssr-caching.svg?branch=master
[travis-url]: https://travis-ci.org/walkthunder/react-ssr-caching
[daviddm-image]: https://david-dm.org/walkthunder/electrode-react-ssr-lru-caching.svg
[daviddm-url]: https://david-dm.org/walkthunder/electrode-react-ssr-lru-caching
