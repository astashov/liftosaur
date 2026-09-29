---
id: account
title: "Account and Sign-in"
shortDescription: "Sign in with Apple, Google or email to sync workouts, share links and keep Premium on every device. Keep several local accounts on one phone."
category: "Sharing and data"
order: 50
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [account-screen, account-sign-in]
---

## What signing in gives you

You can use Liftosaur without an account. Everything stays on the phone. Signing in adds:

- **Cloud sync.** The app uploads your data and keeps it in sync. Lose your phone, sign in on the new one, and your history is back.
- **Links.** **Copy Private Link to Program**, **Copy link to workout** and the public profile page need you signed in. See [Sharing programs](/features/sharing-programs) and [Sharing workouts](/features/sharing-workouts).
- **Premium on every device.** Subscribe in the iOS or Android app, then sign in with the same method on the web or another phone.
- **Apple Watch.** When the phone is signed in, the watch talks to the Liftosaur server directly, even with the phone out of reach.
- **API keys.** The keys for the REST API and the MCP server belong to the account.

## Sign in

![The sign-in choices on the Account screen](/images/features/account/account-sign-in.webp)

Go to **Me → Account**. The row under **Account** on the Me screen says "Not signed in" until you do. On a fresh install, **I have an account** on the first screen opens the same choices.

You get three options:

- **Sign in with Google**
- **Sign in with Apple**, on iOS and on Android
- **or use email login**

Sign in to an existing account, and the app loads that account's data from the cloud. What was on the phone before stays as a separate local account, listed under **Other local accounts**.

Create a new account, and the app keeps what is on the phone and uploads it.

## Email and password

![The Sign in with Email form](/images/features/account/account-email-form.webp)

Tap **or use email login**. The **Sign in with Email** sheet has an **Email** field, a **Password** field and a **Sign In** button.

Tap **Create account** to switch the sheet to sign-up mode. The button becomes **Create Account**. A password is 8 to 256 characters. The app sends a "Liftosaur - verify your email" message with a link that works for 7 days. Verifying makes sure you can reset the password later.

If the email already signs in with Google or Apple, the app does not create a second account. It emails a link to set a password for the existing one, and says "This email already has a Liftosaur account".

After too many wrong passwords, the app shows "Too many attempts, try again in 15 minutes".

## Reset a forgotten password

![The Forgot Password form](/images/features/account/account-forgot-password.webp)

Tap **Forgot password?** on the email sheet. Enter your email and tap **Send Reset Link**. The app says "We've sent an email with instructions to" and your address.

The email is "Liftosaur - reset your password". Its link opens a web page where you choose a new password. The link expires in 1 hour. The web page does not sign you in. Go back to the app and sign in with the new password.

If the email signs in with Google or Apple and has no password, the app says "This email signs in with Google or Apple".

When you are signed in, **Change password** sits under **Sign Out** on the Account screen. Leave the current password blank if you sign in with Google or Apple and never set one.

## Several accounts on one phone

![Me → Account](/images/features/account/account-screen.webp)

The Account screen shows **Current Account** first: your nickname or id, the number of programs, the number of workouts, and "Signed in as" with your email, or "Not signed in to cloud".

Every account on the phone keeps its own copy of programs, history and settings. Under **Other local accounts**:

- Tap an account to switch to it. The app asks "Want to switch to this account? You WILL NOT lose your current account, you'll be able to switch back to it later."
- **Create New Local Account** signs you out and starts an empty account. The current one stays in the list.
- **Edit** shows a trash icon next to each account. Tap it and type `delete` to remove that copy from the phone.

## Sign out and delete

**Sign Out** signs the phone out of the cloud. Your data stays on the phone, and sync stops. The watch is signed out too.

**Delete Current Local Account** asks you to type `delete`. It signs out, removes this account's data from the phone, and starts a new empty local account. The cloud copy is not touched.

**Delete Current Cloud Account** appears only when you are signed in. Type `delete` to confirm. The server removes your programs, workout history, measurements, settings, uploaded images, API keys, push subscriptions and logs. Payment records stay, tax law requires it. The app then signs out and says "Account deleted from cloud." If it fails, it asks you to email info@liftosaur.com.
