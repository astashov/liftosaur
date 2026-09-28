# Writing a feature page and its screenshot flow

One topic is one page under `docs/features/<id>.md` plus one Maestro flow under `screenshots/flows/<id>.yaml`. `npm run screenshots` runs every flow on a Release build of the app in the iPhone simulator and on the Android emulator, converts the shots to WebP under `images/features/<id>/`, and the page shows them in phone frames. The canon is `docs/features/rest-timer.md` with `screenshots/flows/rest-timer.yaml`. Read both before writing.

## The page

Frontmatter, all keys required except `screenshots`:

```
---
id: rest-timer
title: "Rest Timer"
shortDescription: "One or two sentences for the card on /features and the meta description."
category: "Workout"
order: 10
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [rest-timer-collapsed, rest-timer-expanded]
---
```

- `category` is one of `Workout`, `Programs`, `Exercises and equipment`, `Progress`, `Sharing and data`, `Getting started`. `order` sorts within the category.
- `title` is at most 60 characters and `shortDescription` is 50 to 160 characters. They become the page title, the meta description and the card text. `test/featureDocs.test.ts` fails on anything else.
- `screenshots` names the one or two shots shown under the title, and the first one is also the card thumbnail on /features and the page's social image. Names are screenshot names from the flow, without extension. Add `headerScreenshots: false` to keep the thumbnail and social image but leave the strip under the title out, when those shots already sit in a section.
- Sections are `## ` headings. Each section that has a screen gets one image line right under the heading: `![What the reader sees](/images/features/<id>/<shot-name>.webp)`. Up to three images on one line, separated by a space, when a section spans platforms. An image of the watch must have `Apple Watch` in its alt text, that is what sizes it.
- Every fact comes from the code in `src/`, from `llms/app.md`, `docs/content/*.md` or `CHANGELOG.md`. A claim you cannot find in one of those is left out. Name the exact menu path, the button label and the Liftoscript syntax, as the app shows them.
- Plain sentences, under 20 words, one idea each. Say what the user does and what the app does in reply. No marketing words. Bold the labels the user taps, as in **Me → Timers**. Liftoscript goes in fenced code blocks. Link to `/doc/liftoscript` for syntax detail and to another feature page with `/features/<id>` when it covers the rest.
- Length: 400 to 900 words. Sections named by what the user wants to do, not by screen name.

## The flow

`screenshots/flows/<id>.yaml`, Maestro 2.10 syntax:

```
appId: ${APP_ID}
---
- runFlow: lib/login.yaml
- tapOn:
    id: footer-workout
- tapOn:
    text: ".*Demo Program.*"
- takeScreenshot: <id>-<what>
```

- Start with `runFlow: lib/login.yaml`. It lands on the Home tab, signed in.
- `tapOn` by `id:` uses the component's `testID`. Find them with `grep -rn "testID" src/components src/navigation`. Template ids such as `menu-item-${name}` resolve at runtime, read the code to know the value. The app is bare React Native, so a `.native.tsx` file next to a `.tsx` is the one that runs.
- `tapOn` by `text:` matches the whole accessible label as a regular expression. `".*Demo Program.*"` matches, `"Demo Program"` fails if the label has more words.
- Something below the fold needs `scrollUntilVisible` with `element: { id: ... }` or `element: { text: ... }`, `direction: DOWN`, and then the `tapOn`. Add `centerElement: true` only for an element in the middle of a long list, never for one near the top or bottom of the screen or inside a sheet, because the step fails when the element cannot be centered. Rows near the bottom of a tab screen sit under the tab bar, so scroll them up before tapping.
- Elements of hidden tabs stay in the accessibility tree, so a tap on one "completes" and hits whatever the visible tab shows there. After a tab switch, add `waitForAnimationToEnd`.
- An `index` counts only the elements on screen, in tree order, and a page's warmup rows come before its working sets.
- Type with `inputText` after tapping the field's label, as `lib/login.yaml` does with "Email".
- `takeScreenshot: <id>-<what>` names must start with the page id and be kebab-case. The runner prefixes Android shots with `android-` on its own.
- `runFlow: { when: { platform: iOS }, commands: [...] }` for platform-only steps. `pressKey: Lock` and `pressKey: Home` work on iOS, `pressKey: Back` on Android.
- Never use `launchApp: clearState: true`, it uninstalls the app. Never type a password or email other than `${EMAIL}` and `${PASSWORD}`.
- The account is reset from the fixture before every flow, so a flow may change anything: finish workouts, edit the program, delete history.
- Keep a flow under two minutes of app time and under 12 screenshots. Each screenshot is one section of the page.

## The account

Every flow signs into an account holding `screenshots/fixtures/demo.json`, built from `screenshots/fixtures/demo-program.txt`:

- Program "Demo Program", four days: Upper A, Lower A, Upper B, Lower B. Bench Press with `lp(5lb)` and warmups, Bent Over Row with `dp`, Overhead Press with a custom progress script and `state.increment`, Lateral Raise and Face Pull as superset A, Plank as a timed set `3x1 60s|30s / 0lb`, Squat, Romanian Deadlift `@8+`, Bulgarian Split Squat, Seated Leg Curl and Standing Calf Raise as superset B, Incline Bench Press, Pull Up `3x5+`, Bicep Curl `@8 ?+`, Triceps Extension and Lateral Raise as superset C, Deadlift, Front Squat, Leg Press, Hanging Leg Raise.
- 48 finished workouts over 12 weeks, the last one 9 days ago, with progressions applied and some missed sets.
- Bodyweight weekly from 184 lb down to 178 lb, waist, chest and body fat every two weeks.
- Premium, units lb, no custom exercises, one gym, default equipment.
- Tours and help tips are dismissed. The What's New sheet is dismissed.

Whatever the topic needs beyond that, the flow creates through the UI.

## The watch

A watch flow is `screenshots/flows/watch/<id>.txt`, run through idb after the phone is signed in and synced. Lines: `launch`, `wait <ms>`, `tap <x> <y>`, `swipe <x1> <y1> <x2> <y2>`, `screenshot watch-<id>-<what>`, and `#` comments. Coordinates are points on a 208x248 Apple Watch Series 11 46mm. There is no accessibility tree on the watch, so every tap is a guessed coordinate, checked by running it. `screenshots/flows/watch/rest-timer.txt` shows the known positions: Start at 104 220, first exercise card at 104 160, complete set at 104 196, the header pill's sheet at 104 52.

## Checking your work

You cannot run Maestro, one simulator serves the whole run. Check instead that every `id:` you use exists in `src/` and every `text:` matches a label in the code. The runner reports `PASS`/`FAIL` per flow, and a failed flow leaves the page without its images.
