---
id: sync-and-offline
title: "Sync and Offline"
shortDescription: "Sign in once and your workouts, programs and settings follow you across iOS, Android and web. Train offline and sync when you are back online."
category: "Sharing and data"
order: 40
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [sync-and-offline-me-account, sync-and-offline-account]
---

## Where your data lives

Everything you do in Liftosaur is saved on the device first. Workouts, programs, measurements, settings, and the workout you have open right now. You can use the app without an account and without a connection.

An account adds a copy in the cloud. Sign in on another device, and the same data appears there.

## Sign in

![The Account row on the Me screen](/images/features/sync-and-offline/sync-and-offline-me-account.webp) ![The Account screen while signed in](/images/features/sync-and-offline/sync-and-offline-account.webp)

Go to **Me → Account**. The row shows your email when you are signed in, and **Not signed in** when you are not.

The Account screen has three ways to sign in: **Sign in with Google**, **Sign in with Apple**, and **or use email login** for an email and password.

When you sign up on a device that already has data, that data becomes the account. Nothing is lost.

When you sign in to an account that already exists, the app loads the account's data. The data that was on the device stays as a separate local account. Scroll to **Other local accounts** on the Account screen to switch back to it.

**Sign Out** signs the device out. The data stays on the device.

## Use it on every platform

![The Account screen with the sign-in buttons](/images/features/sync-and-offline/sync-and-offline-sign-in.webp)

Liftosaur runs as an iOS app, an Android app, and a web app at [liftosaur.com/app](/app). One account works on all of them.

In the browser, add the web app to your home screen. It then opens full screen, like an installed app.

## When the app syncs

Sync runs on its own. You do not tap anything. The app syncs:

- After every change. Completing a set, editing a program, adding a measurement.
- When you open the app, and when you bring it back from the background.
- When another device changes something. The server tells your other phones and tablets, and they pull the change right away. This works in the iOS and Android apps when you are signed in.

The web app syncs when you open it and after each change.

While a sync runs, a spinner shows in the top left corner of the screen. If a sync fails, a red **Sync failed** pill shows there instead. The app retries three times, one second apart. After that, it tries again on the next change, or the next time you open the app.

## Continue a workout on another device

The workout you have open syncs too. Start on your phone, complete a few sets, then open the web app. The same workout is there, with the same sets done. Finish it on either device.

The cloud keeps one open workout per account. If two devices each start a different workout, the one started last is kept.

## Edit on two devices

Every piece of data carries the time of its last change. When two devices change the same thing, the later change is kept and the earlier one is dropped. Changes to different things merge, so both devices end up with both.

What counts as one thing:

- A finished workout is one thing. Edit the same workout on two devices, and the later edit replaces the whole workout.
- A program's name, its next day, and its text are three separate things. Rename it on the phone and edit the text on the web, and both changes are kept.
- In the open workout, each exercise is tracked on its own. Complete Bench Press sets on the phone and Squat sets on the web, and both are kept.
- Deleting is a change too. Delete a workout on one device, and it disappears from the others.

## Train without a connection

No connection is needed to train. Start a workout, complete sets, edit programs, add measurements. The app saves to the device and syncs when it is online again.

The web app keeps a copy of itself in the browser, so it opens without a connection too.

The list of built-in programs comes from the server, so it needs a connection. Programs you already have stay on the device.

For a file backup that does not depend on an account, see [Import and Export](/features/import-export).
