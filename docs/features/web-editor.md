---
id: web-editor
title: "Editing on Desktop"
shortDescription: "Write your program in a browser with a full keyboard, autocomplete and weekly volume stats, then send it to the phone with one link."
category: "Programs"
order: 60
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: []
---

## Open the editor

Go to [liftosaur.com/planner](/planner), the **Web Editor** link in the site menu. You do not need an account to write a program there. The page starts with **Week 1** and **Day 1** and a help box that shows the syntax.

The editor is built for a big screen. On a laptop the stats sit to the right of the text, and the page can use up to 2400 pixels of width.

## Write the program

Each day has an **Exercises** text box. Type one exercise per line, with sets and reps after a slash:

```liftoscript
Bench Press / 5x5 / 90s
Squat / 3x8 @8
```

Autocomplete suggests exercise names as you type. Errors show inline, in the text. See [Liftoscript](/doc/liftoscript) for the full syntax.

Weeks are tabs. Inside a week you can **Add Day**, **Delete Day**, **Add Week**, **Duplicate Week** and **Delete Week**. **Add Week Description** and **Add Day Description** add Markdown notes.

Click the document icon in the toolbar to switch to **Full Program** mode. The whole program becomes one text, with `# Week 1` and `## Day 1` headings. This mode has find and replace with regular expressions, and multiple cursors with Cmd+click or Ctrl+click. Click **Apply** to go back to the per-day view, or **Cancel** to drop the changes.

## Check volume and balance

To the right of the editor is **Week Stats**. It shows **Total Sets**, **Strength Sets** and **Hypertrophy Sets**, then sets for **Upper**, **Lower**, **Core**, **Push**, **Pull** and **Legs**, then sets per muscle group. Each number is colored by whether it sits in your target range. A `3d` after a number is the number of days that muscle group is trained that week. Hover a number to see which exercises count toward it and how much.

A front and back body figure below the numbers shades the muscles you train that week.

The cog icon opens **Settings**. There you set the **Strength sets %** and **Hypertrophy sets %** split, the **Synergist multiplier**, and the **Min**, **Max** and **Freq, days** targets under **Weekly Sets Per Muscle Group**. When you are signed in, these settings save to your account and the app uses them too.

In Full Program mode, three toolbar icons open week stats, day stats, and exercise stats for the line under the cursor. The exercise stats graph volume and intensity per week.

## Try the program before you run it

Click the eye icon to open **Program Preview**. It lists every workout the program will produce. Turn on **Enable Playground** to complete sets by tapping the squares. The preview then runs the progress scripts, so you can see how the weights change after a finished workout.

## Send it to your phone

Click the link icon. The editor copies a link to the clipboard and shows a QR code for it. The link holds the full program, so it never changes after you copy it. Editing the program again makes a new link.

In the app, open **Choose your program** and tap **Import from link**. The sheet says **Paste link from /program web editor**. Paste the link and tap **Add**. The app accepts `liftosaur.com/p/...` and `liftosaur.com/n/...` short links, and long links with the program data inside.

If you are signed in on the web, the banner above the editor has a second way. Click **Add this program to your account**. The program goes straight to your account, and the page opens it in saved mode.

## Edit an app program on a laptop

Sign in on the web and open [liftosaur.com/user/programs](/user/programs), the **My Programs** link in the site menu. Click a program name to open it in the editor. **New Program in Your Account** creates one there. **New Standalone Program** opens a blank `/planner` page.

From the phone, open the program, tap the three dots in the top right, then **Copy Private Link to Program**. Open the copied `liftosaur.com/user/p/...` link on the laptop. This item needs an account.

A program from your account opens with a **Save** button. There is no autosave. **Save** stays off until you change something, and the browser warns you if you leave with unsaved changes. Once saved, the phone gets the new program without a restart.

Every save on the web or in the app stores a snapshot. The **Versions** link next to the title opens the list, and you can restore any of the last 100.

## Train from a laptop

The app itself runs in a browser at [liftosaur.com/app](/app), with the same screens as the phone, including **Import from link**. Sign in with the same account and history and programs sync between the browser and the phone.

The page is a PWA (installable web app). Add it to your home screen or dock, and it opens full screen with the Liftosaur icon.
