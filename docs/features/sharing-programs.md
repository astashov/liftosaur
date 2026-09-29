---
id: sharing-programs
title: "Sharing Programs"
shortDescription: "Copy a public link to any program, generate an image with a QR code, or grab a private link to edit it on your laptop. Anyone with the link can add it."
category: "Sharing and data"
order: 20
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [sharing-programs-menu, sharing-programs-image-preview]
---

## How it works

A program in Liftosaur is text, and a link is a snapshot of that text. Sharing a program means sharing the snapshot as it is right now. If you edit the program later, the link still opens the old version. To share the new version, generate a new link.

All sharing starts on the **Program** tab. Tap the **⋮** menu in the top right corner. The menu has:

- **Copy Shareable Link to Program**, to send the program to somebody.
- **Generate program image**, to post it as a picture.
- **Copy Private Link to Program**, to edit it on your laptop in a browser. Only shown when you are signed in.
- **Show program versions**, covered on the [Program Editor](/features/program-editor) page.

## Share a public link

![The copied public link](/images/features/sharing-programs/sharing-programs-public-link.webp)

Tap **Copy Shareable Link to Program**. The app packs the program, its custom exercises, your units and timer settings into a short link. It looks like `https://www.liftosaur.com/p/abc123`. The app copies the link to the clipboard and shows it in a popup.

The link does not need your account. Anyone can open it. It never changes, so what you shared is what they get, even if you keep editing the program.

If you turned on the **Affiliate Program** under **Me → Earn money with Liftosaur**, the link carries your affiliate id. The menu item says **as an affiliate link** in that case.

## What a public link opens

Opening `/p/...` in a browser shows the program in the **Web Editor** on liftosaur.com. Near the top, a yellow box says **To use this program**:

- If they are signed in, they tap **Add this program to your account**. If the program uses the other weight unit, the site asks: "The program has weights in kg, do you want to convert them to lb?". The program is saved to their account and opens at `/user/p/...`.
- If they are not signed in, the box shows the App Store and Google Play badges. They install the app, copy the link with the link icon under the program, and import it on the **Choose Program** screen.

Someone who edits the program in the Web Editor sees a red bar: "Made changes to the program, but the link still goes to the original version. If you want to share updated version, generate a new link."

## Import a link into the app

![The Import from link popup](/images/features/sharing-programs/sharing-programs-import.webp)

Go to **Me → Program** and tap **Import** in the top right corner. Paste the link into the popup and tap **Add**. The app asks "Do you want to import program Demo Program?". If a program with the same id is already there, it asks to overwrite it. If the weights are in the other unit, it offers to convert them.

The link can be a short `/p/...` link or a long link with the program encoded in it. Custom exercises come along. A custom exercise you already have, with the same name, is kept as yours.

## Share the program as an image

![Image options](/images/features/sharing-programs/sharing-programs-image-settings.webp) ![Image preview](/images/features/sharing-programs/sharing-programs-image-preview.webp)

Tap **Generate program image** in the **⋮** menu. The **Settings** tab has:

- **Include program details**, the program name with the week and day count at the top.
- **Include QR Code**. The QR code opens the public link, so a reader can scan the picture and import the program.
- **Include week descriptions** and **Include day descriptions**.
- **Columns**, how many days go side by side. Default 1.
- **Days to show**, one toggle per week and per day, with **Select All** and **Deselect All**.

The **Preview** tab shows the picture with your options applied. Tap **Generate image** to render it, then the system share sheet opens to save or send the PNG. A very long program may not fit in one picture. The app then asks for more columns or fewer days.

## Edit on a laptop with a private link

![The copied private link](/images/features/sharing-programs/sharing-programs-private-link.webp)

Tap **Copy Private Link to Program**. The app copies `https://www.liftosaur.com/user/p/<program id>` to the clipboard. Open it in a browser where you are signed in to the same account. The site asks you to sign in first if you are not.

The private link opens the live program from your account, with a **Save** button and a **Versions** list. Edits saved there sync back to the app. The link is useless to others. Another account gets "Not Found", and a signed-out browser gets the login page.

## Export every program as text

![Me → Import / Export](/images/features/sharing-programs/sharing-programs-export-text.webp)

Go to **Me** and scroll to **Import / Export**. Tap **Export all programs to text file**. The app writes one `.txt` file with every program in [Liftoscript](/doc/liftoscript), each under a header like `======= Demo Program =======`, and opens the share sheet to save it. The text is the same as the full text mode of the editor, so you can paste a program back into a new program later.

Backups, CSV export and JSON program files are on the [Import and Export](/features/import-export) page.
