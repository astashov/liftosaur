---
id: import-export
title: "Import and Export"
shortDescription: "Import workout history from Hevy or a CSV file, with a preview and undo. Export everything as JSON, your history as CSV, or your programs as text."
category: "Sharing and data"
order: 30
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [import-export-export, import-export-import]
---

## Where to find it

Go to **Me** and scroll to the **Import / Export** section. It has three export rows and four import rows. On the phone, every export opens the system share sheet, so you can save the file to Files or send it to another app. In the browser, the file downloads.

## Back up all your data

![The Import / Export section on the Me screen](/images/features/import-export/import-export-export.webp)

Tap **Export data to JSON file**. The app writes everything it stores about you into one file: history, programs, settings, measurements, and custom exercises. The file is named `liftosaur-YYYYMMDD.json`, with today's date.

Keep this file as a backup. It is the only export that you can load back into the app in full.

## Export your history as a spreadsheet

Tap **Export history to CSV file**. The app writes one row per set into `liftosaur_YYYYMMDD.csv`. Warmup sets are rows too, with **Is Warmup Set?** set to 1.

The columns are: Workout DateTime, Program, Day Name, Exercise, Is Warmup Set?, Required Reps, Completed Reps, Is AMRAP?, Required RPE, Completed RPE, Log RPE?, Required Weight Value, Required Weight Unit, Completed Weight Value, Completed Weight Unit, Ask Weight?, Completed Reps Time, Target Muscles, Synergist Muscles, Notes.

Open it in Excel, Google Sheets, or any tool that reads CSV. The same file can be imported back.

## Export your programs as text

Tap **Export all programs to text file**. The app writes every program as Liftoscript text into `liftosaur_all_programs_YYYYMMDD.txt`. Each program starts with a line like `======= Demo Program =======`, followed by its full text.

You can paste that text back into the program editor to recreate a program. See [Program Editor](/features/program-editor) for the editor and [Liftoscript](/doc/liftoscript) for the syntax.

## Import history from Hevy

![The Import history from other apps sheet](/images/features/import-export/import-export-hevy.webp)

Export your workouts from Hevy as a CSV file first. Then go to **Me → Import history from other apps** and tap **Upload CSV file from Hevy**. Pick the file.

The app maps Hevy exercise names to Liftosaur exercises, for example "Bench Press (Barbell)" becomes Bench Press with a barbell. A name it does not know becomes a custom exercise. Warmup sets, weights in kg or lb, and exercise notes come along.

If you pick a Liftosaur CSV here by mistake, the app tells you and points you to the right row.

## Import history from a Liftosaur CSV

![The import rows on the Me screen](/images/features/import-export/import-export-import.webp)

Tap **Import history from CSV file** and pick the file. The file must use the same columns as **Export history to CSV file**. The app checks the header row for **Workout DateTime**, **Exercise** and **Is Warmup Set?**. Tap the help icon next to the row for a link to an example file and formatting instructions.

Rows the app cannot read are skipped and listed on the preview. If more than half the rows fail, the import stops with an error instead.

## Check the preview before you import

Both CSV imports open an **Import Preview** screen. Nothing is saved yet. The screen shows:

- How many workouts will be imported and their date range.
- Every workout, drawn the way it will look on the Home screen.
- Which exercises will be created as custom. Tap **Show** to see the names.
- Rows skipped because they could not be parsed, with the row number and the reason.
- Values that look suspicious: a weight over 3000 lb, more than 1000 reps, a date before 2000 or more than a day in the future.
- Workouts that look like duplicates of your existing history. A workout is a duplicate when it starts within one minute of one you already have. Duplicates are skipped by default. Tap **Skipped - Include?** to import them anyway.

Tap **Import** in the top right to save. The app returns to Home and shows "Successfully imported N workouts".

## Undo an import

After your first import, a **Recent imports** row appears in the **Import / Export** section. It lists your last 5 imports, each with the source, the date, and the number of workouts and new exercises.

Tap **Undo** next to an import. The app asks to confirm, and warns you if you edited some of those workouts after the import. Undo removes the workouts from that import. It also removes the custom exercises that import created, unless a program or another workout uses them.

## Restore from a JSON backup

Tap **Import data from JSON file** and pick a file made by **Export data to JSON file**. The app warns you first: "Importing new data will wipe out your current data." Tap OK to replace everything in the app with the contents of the file.

Old backups work too. The app runs its data migrations on the file before loading it.

## Import a program from a JSON file

Tap **Import program from JSON file** to load a single program from a program JSON file. If a program with the same id already exists, the app overwrites it. Otherwise it creates a new one. The app asks you to confirm first.
