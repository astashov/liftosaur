---
date: "2021-02-05"
title: Quirks of building a PWA app
og_title: Quirks of building a PWA app | Liftosaur blog
og_description: "Main pain points of building a PWA app, and how I worked around them"
og_image: /images/quirks-of-building-a-pwa-app-pwa.png
tags: ["tech"]
twitter: https://twitter.com/liftosaur/status/1358790417102348289
reddit: https://www.reddit.com/r/liftosaur/comments/lfdd6p/quirks_of_building_a_pwa_app/
---

![PWA Logo](../../images/quirks-of-building-a-pwa-app-pwa.png)

I wanted to build a weightlifting tracker app that would be like Stronglifts 5x5, but flexible, so you could build any program in there or modify any program for your needs. And it'd still be a user-friendly, pleasant to use app. And it'd have all the features you expect from that kind of app - progress view, graphs, rest timer, plates calculator, etc.

I write web apps for a living. I'm not a mobile developer. I knew that you could write web apps for mobile phones (they're called PWA - Progressive Web Apps), and then you can install them without App Store or Google Play, and theoretically, they'll be exactly like native apps.

There's also something cool, from idealistic point of view, in writing web apps and running them on phones (vs native apps). Web a is free and decentralized platform, I don't need to rely on Apple Store or Google Play rules, web apps exist kinda in parallel with the Apple/Google gate-keeped stores, and don't have to play by its rules. Also, the update cycles are way faster - I can just push the new version out, and it will be immediately delivered to users' devices, I don't need to wait for a week until my new app version is reviewed by Apple or Google. It's not like the main reason why I wrote PWA, though - the main reason is that I'm just very comfortable with building web apps, I know how to do it. I'm way less comfortable with building native apps.

But I also heard that you would never reach the same user experience as with native apps, though I wasn't sure why. What exactly would prevent that? I was curious to know, I thought - I'm going to write this app as a PWA specifically targeted for mobile devices and experience the development process, see what road bumps I could hit, and how far I could go before I hit a wall.

And here I am, nine months later, with a working PWA app, which is already pretty feature-rich, and I think at this point I can reflect on the development process and share my thoughts about PWAs and what it takes to develop them.

## What the heck is PWA?

[Liftosaur](https://www.liftosaur.com/about) is a PWA. What that really means is that it has a [manifest file](https://www.liftosaur.com/manifest.webmanifest) and [a script](https://www.liftosaur.com/webpushr-sw.js), that runs as a Service Worker - special JavaScript code, that is run by a browser separately from a web page, in a background. We add a link to our manifest file in `index.html` like this:

```html
<link rel="manifest" href="/manifest.webmanifest" />
```

and then we load that service worker script like this:

```ts
navigator.serviceWorker.register("/webpushr-sw.js");
```

and voila! Our web page just became a Progressive Web App!

The manifest file describes how your app will look like mostly on phones - what icons would be used, whether it's full screen or with a URL bar, title/description, what splash screen looks like, etc.

The service worker script currently mostly solves two problems:

- Caches all the scripts, styles, and some API calls so that the app would work offline.
- Sets up Web Push mechanism, so you'd get pushes when the timer is triggered, and it's time to start another exercise set.

And that's mostly it! After that, you can add that web page to your phone home screen, and it'll like a native web app.

<div class="highlight-block highlight-block-flex" style="padding-left: 3rem; padding-right: 3rem">
  <div class="highlight-img-flex">
    <img src="../../images/quirks-of-building-a-pwa-app-home-screen.jpg" width="100%" alt="iOS Home Screen with PWA icon" />
    <div class="highlight-block-sum">This is what it looks like on the home screen (last icon)</div>
  </div>
  <div class="highlight-img-flex">
    <img src="../../images/quirks-of-building-a-pwa-app-liftosaur.jpg" width="100%" alt="Liftosaur Screen on iOS" />
    <div class="highlight-block-sum">This is what PWA app looks like on iOS</div>
  </div>
</div>

But there are various problems associated with PWAs, related mainly to iOS Safari quirks and users' knowledge about PWAs.

## Pain points

Mostly, my experience with building PWA - you can build decent PWA apps, though Mobile Safari definitely will try to make your life harder. I didn't really have any problems with Google Chrome on Android; the app works smoothly even on a cheap Android device. The major pain points were:

### Cookies are weird on iOS when you add your app to the home screen

I initially set the app so that `index.html` and all other assets were loaded from `www.liftosaur.com` and served via Cloudflare CDN. API lived in Cloudflare workers on a separate domain, which used to be `liftosaur.workers.dev`. Some API expects the user to be logged in, so I had `liftosaur.workers.dev/api/signin/google`, which sets up a JWT auth cookie on the `liftosaur.workers.dev` domain. I don't need those cookies for the primary domain `www.liftosaur.com` (they're HttpOnly anyway, and I use them for API calls only). I thought it'd be fine - the cookies would live only on `liftosaur.workers.dev`, the browser would send them to all API endpoints (since they're also on `liftosaur.workers.dev`), and everything would just work. And it worked, almost everywhere - it worked in Mobile Safari browser, it worked in Chrome on Android. But if you add the app to the home screen on iOS, then for some reason, those cookies wouldn't be stored. Like, at all. I finally found a workaround - I stored the cookies with the `.liftosaur.com` domain and moved the API from `liftosaur.workers.dev` to `api.liftosaur.com`, so they'd share the same cookies with `www.liftosaur.com`. But it took me quite a while to figure that out.

### No web push notifications for iOS

There's a feature in the app - after you've finished a set, you press a button, and it starts a timer. Once timer hits some threshold, it sends a push notification to your phone, so you know it's time to start another set. Apparently, there's no way to do that on iOS. I couldn't find a way to send a push notification in iOS, at all. It seems like a possible solution would be to install a "helper" native app that would proxy the push notification, but that seems excessive - I really doubt any user would want to do that!

### You can trigger a sound only on user action

When the timer mentioned above hits a threshold, it plays a sound, so you know - it's time to start another set. I couldn't figure out how to do that on iOS. Safari on iOS only allows you to play a sound in e.g. an event click handler. If you try to play it on some random event happening (like for me, it was a Redux action triggering it), Safari complains about audio autoplay being forbidden. There're some solutions on the Internet/Stack Overflow, but none of them works. Apparently, if a user is done with the set and hits a button, you can start `setTimeout` and try to play the audio inside that `setTimeout`. It works, but only for small enough timeouts (like several seconds). Anything over a minute - and you get that audio autoplay forbidden error again.

I couldn't figure out that too for iOS. Liftosaur on iOS doesn't send push notifications when timers hit a threshold, and also it doesn't make a sound when it happens :(

### iOS could be pretty aggressive unloading from memory the opened PWA apps that are added to the home screen

Imagine you just finished a set, and you switch to Twitter to read some stuff there while resting. A couple of minutes later, you switch back to Liftosaur - and iOS already unloaded it from memory, so Liftosaur loads again. So you need to make sure your app launches fast, and also you store as much internal state as possible in IndexedDB. Otherwise, users may have a horrible experience losing all their progress.

To be fair, it got better after iOS 13, and it's not as aggressive with unloading PWAs from memory anymore, but it still happens sometimes.

### Missing some default gestures

There're some gestures built-in into any native app. Like swipe left to right across the screen gets you back to the previous page. Obviously you don't get them for PWAs, since it's just a web page.

It's not that big of a deal to implement those, but you have to implement those, and on a native app, you get them for free.

I personally don't use gestures much on my phone apps, but I can see how it could be a UX issue for some users.

### Choose your app icon wisely because it will stay forever

If you add a PWA app to your home screen, whatever the app icon was, it will be there forever. Even if you update the manifest with the new icon, the icon won't change on the home screen. Not that big of a deal, but it definitely was an unpleasant surprise.

### Users have no idea what the heck PWA is

**And here's our winner!!!** The major pain point of PWA is the users' knowledge. They don't know that a web page they're on is a web app they can install to their home screen. They don't know how to do that (and frankly, iOS Safari doesn't even try to make it obvious). They often even never heard of PWAs at all. They don't know PWAs exist and they can add a web app to their home screen.

<div class="highlight-block highlight-block-flex" style="padding-left: 3rem; padding-right: 3rem">
  <div class="highlight-img-flex">
    <img src="../../images/quirks-of-building-a-pwa-app-ios-share.png" width="100%" alt="Liftosaur Screen with share icon" />
    <div class="highlight-block-sum">To add to home screen on iOS, you need to Share (!) first</div>
  </div>
  <div class="highlight-img-flex">
    <img src="../../images/quirks-of-building-a-pwa-app-ios-add-to-home.png" width="100%" alt="Share screen with 'Add to Home Screen' option highlighted" />
    <div class="highlight-block-sum">And there find the option "Add to Home Screen"</div>
  </div>
</div>

So, you need to deliver the installation instructions to your users somehow. Since there's a good chance they've never installed a PWA previously in their life, there're high chances that this PWA will be their first one, and they are going to figure out how to do that.

It is already hard to convince somebody to install an app. Convince somebody to install a web app is ten times harder if they never did that, and they don't know it's possible.

To be fair, if you use a web app several times on Android Chrome, and it's a PWA, Chrome will suggest adding it to the home screen once it notices you use the app often. iOS Safari will not.

In my opinion, this is the worst pain point of PWA. Technology-wise, and especially on Android - you can make very decent phone apps, and get the user experience very close to native apps. But the people aspect - educating users about PWAs and how to install them - is way harder.

Here's a bright side, though - Google Play allows you to publish your PWAs right in the store. It's called [TWA (Trusted Web Activity)](https://developers.google.com/web/android/trusted-web-activity), and that makes the PWA installation process look exactly like a native app - you can find it in the Play Store, click Install, and it will get installed, just like a regular app. Obviously - nothing like that exists on iOS.

<div class="highlight-block">
  <img src="../../images/quirks-of-building-a-pwa-app-google-play.png" width="100%" alt="Liftosaur in Google Play" />
  <div class="highlight-block-sum">PWA in Google Play Store</div>
</div

To build TWA, you'll need to ensure you get maximum PWA points in Lighthouse, and then you can use [PWABuilder](https://www.pwabuilder.com/), that will generate Android APK, which you can upload to Google Play Store.

## Conclusion

You definitely can build quality PWAs. You usually won't have any problems on Android, and you'll need to jump through some hoops for iOS. Some things are impossible to do on iOS at all. And be prepared that users don't know anything about PWAs, so you'd need to educate them about it somehow - that means your marketing will be harder.
