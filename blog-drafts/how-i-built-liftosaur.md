---
date: "2021-01-10"
title: How I built Liftosaur
---

Liftosaur is a weightlifting tracker app, where you can build any weightlifting program you want, using simple built-in scripting language Liftoscript.

Like I told in [How I came to weightlifting](), I wanted an app, that would be like Stronglifts 5x5, but flexible, so you could build any program in there, or modify any program for your needs. And it'd still be user-friendly, nice to use app. And it'd have all the features you expect from that kind of app - progress view, graphs, rest timer, plates calculator, etc.

I write web apps for living. I'm not a mobile developer. I knew that you theoretically can write web apps for mobile (they're called PWA - Progressive Web Apps), and then you can install them, without App Store or Google Play, and theoretically they'll be exactly as native apps. But I also heard that you would never be able to reach the same user experience as with native apps, though I wasn't sure why. What exactly would prevent that? I was curious to know, I thought - I'm going to write this app as a PWA specifically targeted for mobile devices, and will experience the development process, see what roadbumps I could hit, and how far I could go before I hit a wall.

So, here I am, 9 months later, with a working PWA app, which is already pretty feature rich, and I think at this point I can reflect about the development process, and share my thoughts about various technologies I used while building the app. Hopefully you'll find it interesting. Let's go!

## PWA

Mostly, my experience with building PWA - you can build decent PWA apps, though Mobile Safari definitely will try to make your life harder. I didn't really have any problems with Google Chrome on Android, the app works smoothly even on a cheap Android device. The major pain points were:

#### Cross-domain cookies are weird on iOS, specifically if you add your app to the home screen.

I originally set the app so that `index.html` and all other assests were loaded from `www.liftosaur.com`, and served via Cloudflare CDN, and API lives in Cloudflare workers on a separate domain, which used to be something like `liftosaur.workers.dev`. API sets up cookies when log in, and all the cookies I tried to set up for that domain were not stored if the app is added to home screen. It was fine in Mobile Safari browser, it was fine (of course) in Google Chroe on Android, but if you add the app to the home screen on iOS - you're doomed. I finally found workaround - I stored the cookies with `.liftosaur.com` domain, and moved the API from `liftosaur.workers.dev` to `api.liftosaur.com`, so they'd share the same cookies with `www.liftosaur.com`.

I've been building a PWA for tracking my weightlifting progress (https://www.liftosaur.com), and I was using it mostly on iOS as an added to home screen app. One of the goals was to see how far I could get with a PWA instead of a native app on iOS, and whether it's possible to build a fast, featureful app on iOS as a PWA.

So far I like the result, and I think it's still worth it. But there were some issues I was hitting, especially on iOS, and I'd like to share those. Curious if you had similar experiences, and if maybe you somehow overcame them.

Crossdomain cookies are weird on iOS when added to home screen.

The app is set up so that the index.html and all the assets are loaded from www.liftosaur.com and served via Cloudflare CDN, and API lives in Cloudflare Workers on a separate domain, which used to be something like 'liftosaur.workers.dev'. All the cookies I tried to set up for that domain were not stored if the app is added to home screen. Apparently it only stored the cookies that are related to the main domain (www.liftosaur.com). Interesting that in iOS Safari browser everything works fine and as it should (it stores the cookies for 'liftosaur.workers.dev' properly). The workaround was to store the cookies with .liftosaur.com domain, and move the API from liftosaur.workers.dev to api.liftosaur.com so they'd share the same cookies.

No web push notifications for iOS

There's a feature in the app - after you're done with a set, you press a button, and it starts a timer. Once timer hits some threshold, it can send a push notification to your phone, so you know it's time to start another set. I couldn't find a way to send a push notification in iOS :( It seems like one way is to install a "helper" native app, that would proxy the push notification, but that seems excessive - no user would want to do that :)

You can only trigger a sound on user action

When the timer mentioned above hits a threshold, it plays sound, so you know - it's time to start another set. I couldn't figure out how to do that in iOS. Safari on iOS only allows you to play a sound in e.g. event click handler. If you try to play it on some random event happening (like for me it was Redux action should trigger it), Safari complains about audio autoplay being forbidden. There're some solutions on the Internet/Stack Overflow, but none of them works. Apparently, if you start setTimeout when user is done with the set and hits a button, and try to play the audio inside that setTimeout, and it works, but only for small enough timeouts (like, several seconds). Anything over a minute - and you get that audio autoplay forbidden error again.

I couldn't figure out that too for iOS. So, on iOS it doesn't send a push notification when timer hits a threshold, and also it doesn't make a sound when it happens :(

iOS could be pretty aggressive unloading opened PWA apps added to home screen from memory

Like, you're done with your set, and you switch to Twitter to read some stuff there while resting. A couple minutes later you switch back to Liftosaur - and iOS apparently unloaded it from memory, so it starts to launch it again. So, need to make sure your app launches fast, and also you store as much internal state as possible in IndexedDB, otherwise users will have really bad experience losing all their progress.

### State serialization

Good frontend web developers should be experts in distrubuted systems, because there's just no way around it. With PWA, to support the offline mode, you should mostly store your whole state locally. Which essentially means you have a database locally. Then, you have a database on the server, since the app allows to store the state in cloud. And now you have to sync them in a predictable way. Like, user used your app offline, and then Internet restored, and the update came from the server. Now you need to ensure user won't lose any data (because server update overwritten local data), or won't get any duplicate data (because it just added server data alongside with local one).

Fun doesn't end here. Since you keep making changes in the codebase, your state shape changes. And you kinda can keep up with that on the server, by changing the state in your server database as well. But you can't really do anything about local state of users. Users may get behind, their local state could get outdated, and then they receive new codebase. The expectations of the new codebase don't match the local user's state, and boom, the app throws an exception. Worst (and most probable) case scenario - it throws an exception during page load, and after that user stares at an empty screen. Horrible.

Make it all work properly, and ensure that users always get working app is an incredibly hard problem. I don't think I solved it properly, but most of the time it works, though in edge cases it probably won't. Here's what I did.

In database world, there's a concept of migrations. I learned it when I was working with Ruby on Rails, and it's a very good concept. Sometimes when you make modifications in the codebase, the expectations of the data store changes. Like, in the database you had a field "name", which was a string, but then you decide that instead you should have "first_name" and "last_name" stored separately instead, and updated the codebase for that. After that, you create a migration, that has a version, and the executable code to convert your database to the new state (with 2 separate name fields), and also you define how to rollback (i.e. return from 2 separate name fields to one). It could look like this:

```ts
{
  "version": 1,
  "migration": [
    "ALTER TABLE users ADD COLUMN first_name",
    "ALTER TABLE users ADD COLUMN last_name",
    "UPDATE users SET first_name = name",
    "ALTER TABLE users DROP COLUMN name",
  ],
  "rollback": [
    "ALTER TABLE users ADD COLUMN name",
    "UPDATE users SET name = first_name",
    "ALTER TABLE users DROP COLUMN first_name",
    "ALTER TABLE users DROP COLUMN last_name",
  ]
}


```

## Bundle size

There's a lot of native apps that are also weightlifting progress trackers, Liftosaur is definitely not the first one ever. If I want to compete with native apps, my PWA should load fast, similar to a native application.

One of the ways to achieve that - keep the bundle as small as possible. There is a lot of business logic in the app, I can't do much about it, but at least I can be smart about third-party dependencies. So, instead of React I decided to use Preact, which is way smaller. I don't use any third-party React or Preact components, e.g. for a drag'n'drop sortable list I've created my own component, which is tiny. For graphs I use uplot, which is not only blazing fast, but also waaaay smaller than any other graphs library.

There're 2 big libraries though I had to use - Codemirror for code editor, and io-ts for safe serializing/deserializing
