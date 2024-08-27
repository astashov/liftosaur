---
date: "2021-03-04"
title: Offline mode in Liftosaur
og_title: Offline mode in Liftosaur | Liftosaur blog
og_description: "How I built offline mode in Liftosaur"
og_image: /images/offline-mode-in-liftosaur-no-internet.png
tags: ["tech"]
twitter: https://twitter.com/liftosaur/status/1367685947446489091
reddit: https://www.reddit.com/r/liftosaur/comments/ly3ffc/offline_mode_in_liftosaur/
---

![No Internet in Chrome](../../images/offline-mode-in-liftosaur-no-internet.png)

One of the most significant benefits of PWA apps is enabling offline mode for your apps. You can set up caching in a service worker, and then if there's no Internet, the service worker returns the bundles and maybe even API responses from the cache. There're tons of tutorials on how to set it up, but caching is just the tip of an iceberg. You have to structure your whole app around offline mode if you really want to get a seamless experience without the Internet. That's hard.

Here I'd like to share how I did offline mode for Liftosaur. It's not perfect, and it still has its flaws. But it mostly works fine, only occasionally maybe possibly breaking user experience.

## What do we need to do to make it work offline

Basically two things.

- We need to cache bundles (HTML, CSS, and JS), so if there's no Internet, we could fetch them from the cache.
- We need to sync our in-memory part of the state we want to preserve to some local storage and optionally sync it to the cloud when the Internet is available.

That's about it. But there're caveats.

## Caching bundles

We can use a service worker for caching bundles, intercept all the network calls from there, and cache the bundles and maybe the API calls we care about. There're a million tutorials on the Internet on how to do that. It's probably the most popular usage of service workers.

For initial load, Liftosaur loads its bundles from the Internet and caches them. They are:

- **index.html** - the main page, where we render our whole app.
- **main.js/css** - the main bundle with all the logic included and styles for it.
- **vendor.js/css** - all third-party libraries: CodeMirror, Preact, io-ts, etc.

Those are the files that are absolutely necessary for the working app. There're also others - Webpushr for push notifications, images of muscles and exercises, Rollbar for error collecting, and so on. If they don't load - the app works without them with some degraded functionality, some of them we cache anyway, but they're not that important.

It's a good idea to versionize your bundles, so you could cache them forever, and not be afraid of accidentally serving stale versions of bundles. I.e. you load the bundles from your `index.html` like:

```html
<link href="main.css?version=123" rel="stylesheet" type="text/css" />
<script src="main.js?version=123"></script>
```

If we store our bundles on Amazon S3, it ignores the querystring params when returning the stored objects, so `?version=123` is ignored. But it's not ignored by CDN, browser cache, and the service worker cache. When we bump the version to `124`, it misses the cache both on CDN, browser, and the service worker and returns the actual version of the bundle.

For a version value we simply use a Git commit hash. In Liftosaur we do that via Webpack's `DefinePlugin`:

```js
// webpack.config.js
const { DefinePlugin } = require("webpack");
const commitHash = require("child_process").
    execSync("git rev-parse --short HEAD").toString().trim();

module.exports = {
  // ... various webpack settings
  plugins: [
    new DefinePlugin({
      __COMMIT_HASH__: JSON.stringify(commitHash)
    }),
    new CopyPlugin([
      {
        from: `src/index.html`,
        to: `index.html`,
        transform: (content) => content.toString().
          replace(/\?version=xxxxxxxx/g, `?version=${commitHash}`),
      }
  ]
}
```

So, this way, we'll add the `__COMMIT_HASH__` variable to the bundle. When we copy `index.html` to the `dist` directory, we also replace `?version=xxxxxxxx` with proper git commit hash.

In `index.html`, we import the bundles accordingly:

```html
<link href="main.css?version=xxxxxxxx" rel="stylesheet" type="text/css" />
<script src="main.js?version=xxxxxxxx"></script>
```

In the service worker, we need to set up fetching the bundles, index.html, and handle caching. The logic for caching the bundles and index.html is different:

- For bundles, since they're versioned, we can cache them forever. I'll just need to remove the old versions from the cache from time to time
- For index.html, we don't need to return the cached version of it. We need to ensure the user gets the freshest version of it all the time. Unless the user is offline. In that case - return the cached version of index.html.

So, the service worker looks like this:

```ts
// sw.ts

// __COMMIT_HASH__ will be filled in by a webpack bundler
declare let __COMMIT_HASH__: string;

const cacheName = `liftosaur-sw-${__COMMIT_HASH__}`;

const urlsToCache = [
  `/main.css?version=${__COMMIT_HASH__}`,
  `/main.js?version=${__COMMIT_HASH__}`,
  `/vendors.css?vendor=${__COMMIT_HASH__}`,
  `/vendors.js?vendor=${__COMMIT_HASH__}`,
  "/index.html",
  "/",
];

async function cacheRequestAndResponse(request: Request, response: Response): Promise<void> {
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function requestAndCacheAllUrls(): Promise<void> {
  const cache = await caches.open(cacheName);
  await cache.addAll(urlsToCache);
}

// Fetches all the time, caches it, but never returns
// the cached version if user is online
async function handleFetchingIndexHtml(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  try {
    const response = await fetch(request);
    await cacheRequestAndResponse(request, response);
    return response;
  } catch (err) {
    if (cachedResponse != null) {
      console.error(err);
      return cachedResponse;
    } else {
      throw err;
    }
  }
}

// Checks cache first, if there's no cached response -
// fetches the request and caches it
async function handleFetchingEverythingElse(request: Request): Promise<Response> {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  } else {
    const response = await fetch(request);
    // If the url is one of the urls to cache -
    // cache request and response
    const isCacheableRequest = urlsToCache.some((url) => {
      const url = new URL(request.url);
      return `${url.pathname}${url.search}` === url;
    });
    if (request.method === "GET" && isCacheableRequest) {
      await cacheRequestAndResponse(request, response);
    }
    return response;
  }
}

// When the browser installs the service worker for the
// first time, we'll request all the bundles and cache them
service.addEventListener("install", (event) => {
  event.waitUntil(requestAndCacheAllUrls());
});

// We intercept all fetch requests from a browser,
// and apply our logic to handling those
service.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isIndexHtml = url.pathname === "/" || url.pathname === "index.html";
  if (e.request.method === "GET" && isIndexHtml) {
    e.respondWith(handleFetchingIndexHtml(e.request));
  } else {
    e.respondWith(handleFetchingEverythingElse(e.request));
  }
});

// Every times service workers activates -
// check for old caches and remove them
self.addEventListener("activate", async (event) => {
  const allKeys = await caches.keys();
  const keysToRemove = allKeys.filter((k) => k !== cacheName);
  for (const key of keys) {
    await caches.delete(key);
  }
});
```

That is a rather long code listing, but it basically implements the logic we described above for bundles and for `index.html`.

Then we need to make sure to set proper `Cache-Control` headers. Since the versioned bundles are immutable, we can safely set the expiration time to a year. So, all the versioned bundles (`main.js`, `main.css`, `vendors.js`, etc) are served with `Cache-Control: public, max-age=31536000, immutable`. For `index.html` though, we need to ensure it's always fresh, so we set `Cache-Control: max-age=0` for it.

<object data="../../images/offline-mode-in-liftosaur-assets.svg" style="width: 100%" type="image/svg+xml"></object>

This covers the part when we serve the app's code, even when the user is offline. But we also need to handle the local state part.

## Adding local state

When a user interacts with the app (for example, progresses through the workout day), we update the global state in memory and sync the changes to the server. When the user refreshes the page, we fetch the state from the server. This way, the user's data won't be lost.

In case there's no Internet, there's a chance user could lose the data because we can't sync it to the server. It makes sense to sync it to some local storage too, so that if there's no Internet, the user won't lose the data. It also helps with data privacy - if the user is not logged in, no data is stored in the cloud, everything lives just on their device.

But now we have two problems:

- The code may change, and it's expectations of the state shape also may change. That can lead to runtime exceptions when we try to load local or cloud data.
- Local storage data and cloud storage data may change independently. For example, user may use the app on the phone without the Internet. Then they come home, open the app on the laptop, and use it there, then open the app on the phone again. At that moment, we'll load the data from the server, and if we blindly rewrite the local storage with cloud storage, the user may lose data. We practically have distributed system here now and should figure out how to resolve merge conflicts.

### Database migrations

Let's talk about the solution to the first problem - changing code expectations of the state shape.

The codebase and the state are not synced. We can often get an older local state with the newer codebase. For example when there's a new feature released, the codebase may start to expect a different state shape. Like, we used to specify weight as a regular number. Then we added a new feature for switching between kilograms and pounds, so now we store the weight as `{value: number, units: 'kg' | 'lb'}`. But the local state and the cloud state of our users still have the weights stored as numbers! The user gets a new bundle, it expects the weight to be stored as an object, and that mismatch causes an exception. That easily can crash our app during the boot time, causing a white screen, a completely broken app, and frustrated users.

Humanity figured a solution for this problem - the database migrations.

I learned it when I was working with Ruby on Rails, and it's an excellent concept. Sometimes when you make modifications in the codebase, the expectations of the data store changes. Like, in some database table, you had a field `name`, which was a string, but then you decide that you should have `first_name` and `last_name` stored separately instead and updated the codebase for that. After that, you create a migration that has a version and the executable code to convert your table to the new state (with two separate name fields), and also you define how to rollback (i.e., switch back from two separate name fields to one). It could look like this:

```ts
{
  "version": 1,
  "migration": [
    "ALTER TABLE users ADD first_name varchar(255)",
    "ALTER TABLE users ADD last_name varchar(255)",
    "UPDATE users SET first_name = name",
    "ALTER TABLE users DROP COLUMN name",
  ],
  "rollback": [
    "ALTER TABLE users ADD name varchar(255)",
    "UPDATE users SET name = first_name",
    "ALTER TABLE users DROP COLUMN first_name",
    "ALTER TABLE users DROP COLUMN last_name",
  ]
}
```

Version is a monotonically increasing number.

The database stores its current version. When you try to run migrations, it will run them in the order defined by its versions. For example, the current version is 2, and you defined new migrations with versions 3 and 4. So, when you run migrations, it applies migrations 3 and 4.

You can also rollback the migrations and run rollbacks in reverse order. Usually, it's necessary when you published code that broke some functionality, and you want to revert changes. Then, you deploy the previous version of the code and run rollbacks in reverse order - first 4, then 3.

In a Ruby on Rails app, the process is usually the following:

- You change the codebase
- If the codebase's state shape expectations changed, you add migrations
- You deploy the app
- You run migrations

### Local state migrations

In our case, things are somewhat more complicated. We do have continuous access to the databases, but we don't have access to the user's local storage state. So, we can't run migrations on the user's local storage state at an arbitrary point in time.

As a solution, we can move the migrations to the client code - to the JS bundles. And then, when a user opens an app, we will:

1. Get the local storage state, and run migrations on it.
2. Fetch the storage state from the cloud, and run migrations on it.
3. Merge the cloud state into the local storage state.
4. Upload the updated, merged state back to the cloud and to local storage.

<object data="../../images/offline-mode-in-liftosaur-migration-diagram.svg" style="width: 100%" type="image/svg+xml"></object>

For the server-side generated pages (for example, the shared workout results or the public profile page), the algorithm would be:

1. Fetch the data from the database
2. Apply migrations
3. Render the page, and for hydration - send the migrated data to the client inlined as JSON in the HTML.

<object data="../../images/offline-mode-in-liftosaur-migration-server-diagram.svg" style="width: 100%" type="image/svg+xml"></object>

I like to handle the local storage as a main source of truth and don't try to migrate the data in the database before I try to run migrations on the local storage. The reason - in case something goes wrong during running migrations on the local storage state or during merge, and it throws an exception - I want a chance to fix it. If I separately apply the same migration in the database, and it goes well there, but it fails locally - reverting the database migration could be hard.

I don't have rollbacks in my migrations (yet?), but they could be implemented. Though it's way harder than with the regular database migrations. When running migrations, they may fail in different places for different users since users maybe have different versions of the states.

For now, if some user has issues with the migrations, I just try to fix it asap by adjusting migrations or creating new ones - i.e., always going forward.

### Implementation details

So, this is how it looks like in code. Liftosaur has a global state in memory, and the part of the state we want to store locally and in the cloud lives in the `state.storage` field.

There's the `state.storage.version` field, that stores the current version of the state. For simplicity, for a version, we use the current datetime in `yyyymmddhhmmss` format, like `20200929231430`.

For the local storage we use `IndexedDB`, which has horrible API, but it's asynchronous and not limited by 5MB like `window.localStorage`.

Initially, we check if the local state is presented - by querying IndexedDB. If it's there, we fetch it and pass `state.storage` field into our migration function. That looks like:

```ts
interface IStorage {
  version: number;
  // ... other fields
}

// List of all migrations
const migrations = {
  // Each migration key is version and some descriptive name.
  "20200929231430_split_name_into_first_and_last_name": async (storage: any): Promise<IStorage> => {
    storage.firstName = storage.name;
    storage.lastName = "";
    delete storage.name;
    return storage;
  },
  // ...
};

async function runMigrations(storage: IStorage): Promise<IStorage> {
  // Ordering migrations by version
  const keys = Object.keys(migrations);
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  // Figuring out what versions we should run for
  const newVersions = keys.filter((versionStr) => {
    const version = parseInt(versionStr, 10);
    return version > storage.version;
  });

  // Run the migrations
  let result = storage;
  for (const version of newVersions) {
    const storageCopy = JSON.parse(JSON.stringify(result));
    result = await migrations[version](storageCopy);
  }

  // Storing the last version as the new storage version
  result.version = parseInt(keys[keys.length - 1], 10);
  return result;
}
```

As I said above, it only can run forward; it doesn't support rollbacks.

Then, we fetch the storage from the cloud and also run it through migrations. Now we have local storage and cloud storage with the same version. We can merge them now.

For merging local and cloud states, it's tricky to do automatically. The logic is different, in some places it makes more sense to combine two arrays; in other cases - prefer one or another.

For example, it makes sense to combine workouts made both on the cloud and locally. But if, for example, user changed the available plates both locally and in the cloud, it doesn't make sense to combine both. We may end up having duplicate plates.

Ideally, it could be solved with special data structures called CRDT, where log changes separately on cloud and locally, and then replay them for merging. But that would complicate things significantly.

We're assuming that most of the time, users will use Liftosaur locally while offline, so usually, the local state is newer and more actual than the cloud state. With this assumption, we can combine workouts and some other parts, and for other stuff prefer local state as a source of truth.

So, like this:

```ts
function mergeStates(localStorage: IStorage, cloudStorage: IStorage): IStorage {
  return {
    version: localStorage.version,
    settings: localStorage.settings,
    // Concatenates two arrays, using date as unique key.
    // I.e. if both oldStorage.history and newStorage.history
    // has record with date == '2020-08-03', then the newStorage's
    // record with that date won't be added
    workoutsHistory: CollectionUtils.concatBy(
      oldStorage.history,
      newStorage.history,
      (record) => record.date)
    ),
    // ... etc
  };
}
```

Obviously, there're cases where this approach will work poorly, and users may lose some changes they did, for example, on the laptop while the phone was offline. For Liftosaur (since it's mostly a phone app), this should be pretty rare, so we sacrifice correctness in favor of simplicity here.

After the states are merged, we save the merged state in `IndexedDB`, and send the new state to the cloud.
And from now on, we keep syncing the state into `IndexedDB` and cloud on each `state.storage` change.

## Conclusion

That's about it! Implementing offline mode made me scratch my head a bit while doing all those migrations and configuring service workers. But once all the groundwork is done, I don't really have to think about it anymore while adding new features to Liftosaur. I just add new migrations from time to time and update the merging function.
