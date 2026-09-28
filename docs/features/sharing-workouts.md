---
id: sharing-workouts
title: "Sharing Workouts"
shortDescription: "Post a finished workout to Instagram Story, Feed or TikTok as an image, share it anywhere, copy it as text or a link, or show it on a public profile page."
category: "Sharing and data"
order: 10
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [sharing-workouts-finish-screen, sharing-workouts-share-sheet]
---

## Share right after the workout

![The Share it! row on the finish screen](/images/features/sharing-workouts/sharing-workouts-finish-screen.webp)

Tap **Finish** on a workout. The summary screen shows your time, volume, sets, reps and sets per muscle group. Under **Share it!** you get five buttons:

- **IG Story** posts the workout image to an Instagram Story.
- **IG Feed** posts it to your Instagram Feed.
- **Tiktok** opens TikTok with the image.
- **Text** copies the workout as text.
- **More** renders the image and opens the system share sheet.

Below the row, **or just copy a link** copies a web link to this workout. Tap **Continue** when you are done.

## Share a past workout

![The Share sheet of a past workout](/images/features/sharing-workouts/sharing-workouts-share-sheet.webp)

Open any past workout from the **Home** tab. Tap the three-dot menu in the top right and pick **Share**. A sheet opens with:

- **Share to Instagram Story**
- **Share to Instagram Feed**
- **Share to Tiktok**
- **Sync to Apple Health** or **Sync to Google Health**, when the app can write to it.
- **Copy link to workout**
- **Share Image...**
- **Copy as Text**

The Instagram and TikTok items are only in the iOS and Android apps. The web app offers **Image**, **Text** and **Copy Link**.

## What the image shows

Every share option builds the same workout card:

- The Liftosaur logo, and a trophy with the number of personal records you set in this workout.
- The program name and the day name.
- **Time**, **Volume**, **Sets** and **Reps** totals.
- One row per exercise, with its picture, its name, a trophy if it was a PR, and the sets you did.

Pick **Share to Instagram Story**, **Share to Instagram Feed** or **Share to Tiktok** and the app shows a preview before it hands off. The first frame is **Default Background**. The Feed image is square, the Story and TikTok images are tall. Tap **Share** to send it. Instagram or TikTok opens with the image already attached, and you finish the post there.

## Use your own photo as the background

Swipe the preview to the left. The second frame has a camera icon and the link **Your photo as background**. Tap either one and choose **From Camera** or **From Photo Library**. The workout card is drawn over your photo. The preview scales the card so it fits the bottom of the photo. Tap **Share** to send this frame instead of the default one.

## Share the image anywhere else

**More** on the finish screen and **Share Image...** in the share sheet render the same card to a PNG named `workout.png` and open the system share sheet. Pick any app or save it to your photos. In the web app the file downloads instead.

## Copy the workout as text

![The Copied! alert after Copy as Text](/images/features/sharing-workouts/sharing-workouts-copied-text.webp)

**Text** on the finish screen and **Copy as Text** in the share sheet put the workout on the clipboard in a compact text form. The app shows **Copied!**. The text starts with the date, the program and day, and the duration in seconds. Then one line per exercise with completed sets, warmups and targets:

```
2026-09-27 10:15:00 +02:00 / program: "Demo Program" / dayName: "Upper A" / week: 1 / dayInWeek: 1 / duration: 3120s / exercises: {
  Bench Press / 3x5 135lb / warmup: 1x10 45lb, 1x5 95lb
  Bent Over Row / 1x8 95lb, 1x6 95lb
}
```

Sets with the same reps and weight are grouped, like `3x5 135lb`. Different sets are listed one by one, like `1x8 95lb, 1x6 95lb`. Workout notes and exercise notes go in as `//` lines. Exercises where you completed no set are left out.

## Copy a link to the workout

**or just copy a link** on the finish screen and **Copy link to workout** in the share sheet copy a web link like `https://www.liftosaur.com/record?id=<workout id>&user=<your user id>`. You must be signed in, otherwise the app says "You should be logged in to copy link to a workout". The page shows the program and day, the date, a **New Personal Records** block when you set any, your max weights, and every exercise with its sets. Anyone with the link can open it.

## Your public profile page

![Nickname and public profile settings on the Me tab](/images/features/sharing-workouts/sharing-workouts-profile-settings.webp)

Go to **Me**. Under **Account**:

- **Nickname** is the name shown on your profile page. The app says "Used for profile page if you have an account".
- **Is Profile Page Public?** appears when you are signed in. Turn it on, and two links appear under it: **Copy Link To Clipboard** and **Open Public Profile Page**.

The link is `https://www.liftosaur.com/profile/<your user id>`. The page title is your nickname and "Profile Page". It shows your current program, then **Main Lifts Progress** for Bench Press, Overhead Press, Squat and Deadlift, then **Rest Lifts Progress** for every other exercise. Each exercise has "Max lifted reps x weight" and a **Progress Graph** with your program lines and estimated 1RM. Turn the toggle off, and the link answers "The user's profile is not public".
