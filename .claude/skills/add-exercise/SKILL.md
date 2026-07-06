---
name: add-exercise
description: Add a new built-in exercise to Liftosaur end-to-end — image (gymvisual.com → S3), catalog registration, description page, and the LLM/MCP exercise list. Use when adding one or more built-in exercises to the app catalog.
disable-model-invocation: true
argument-hint: "[Exercise Name] [equipment]"
---

# Add a Built-in Exercise to Liftosaur

Add the exercise(s): $ARGUMENTS

A built-in exercise touches six places. Do them in order. Worked example throughout:
**Nordic Curl**, id `nordicCurl`, equipment `bodyweight`, image key `nordiccurl_bodyweight`.

## Naming conventions (get these right first)

- **`IExerciseId`** — camelCase, e.g. `nordicCurl`. It's a free `v.string()` (`src/types.ts`), so there is no enum/picklist to update. Pick an id that is NOT exactly 8 lowercase letters (avoids the theoretical collision space with random custom-exercise ids).
- **Display name** — Title Case, e.g. `Nordic Curl`.
- **Equipment** — one of the `equipments` in `src/types.ts` (`bodyweight`, `barbell`, `dumbbell`, `cable`, `leverageMachine`, `band`, `kettlebell`, `smith`, `ezbar`, `trapbar`, `medicineball`).
- **Image / file key** — lowercased `id + "_" + equipment`, e.g. `nordiccurl_bodyweight`. Used for the S3 image filename, the `exerciseImage.ts` sets, and the `exercises/*.md` filename.

## Step 1 — Image (gymvisual.com → S3)

Illustrations come from purchased gymvisual.com assets, cropped and uploaded to the images S3 bucket by `src/imageExtractorGymVisual.ts`.

**If the exercise reuses an existing exercise's image** (e.g. a slight variant): skip S3 entirely and instead set `reuseImageFrom: { id, equipment }` on the exercise entry in Step 2. Then skip to Step 2.

**Otherwise, get a new image (manual, human-in-the-loop — costs money):**

0. **Find the image fast.** gymvisual names exercises differently than we do, so don't browse by hand — search its catalog across a few synonym terms:
   ```
   npx ts-node ./scripts/gymvisual_search.ts "nordic curl" "hamstring curl" "glute ham raise"
   ```
   (Run `ts-node` directly, not `npm run r` — npm strips quotes and splits multi-word terms.) It prints candidate exercises grouped across formats, **illustrations first with preview image URLs**. Only the `illustrations` category yields the transparent multi-pose PNG the extractor needs; exercises that exist only as gif/video are flagged as not-extractable. Pick the right `illustrations/<id>-<slug>.html` product, eyeballing the `preview:` image. `--all` lists gif/video-only matches; `--max=N` widens the scan per term.
1. Ask the user to buy + download that illustration PNG on gymvisual.com. gymvisual illustrations are a multi-pose sheet.
2. Have the user tell you the **pose index** (`boxIndex`, 0-based, counted left-to-right) to use as the single-pose thumbnail.
3. Arrange a source directory: `<src>/<id>_<equipment>_<boxIndex>/` containing the downloaded file whose name matches `/_medium/` (e.g. `nordiccurl_bodyweight_2/xxx_medium.png`).
4. Prereqs: ImageMagick `convert` on PATH, and AWS credentials with write access to the images bucket.
5. Run:
   ```
   npx ts-node src/imageExtractorGymVisual.ts <src-dir> <dest-dir>
   ```
   It crops the single pose to `400x600` (→ `exercises/single/small/`) and the combined sheet to `800x600` (→ `exercises/full/large/`), uploads both to S3, then prints **"Available small images"** and **"Available large images"** arrays.
6. Copy those printed arrays into `src/models/exerciseImage.ts`, replacing the `availableSmallImages` and `availableLargeImages` set contents (entries are lowercased `id_equipment`). At minimum the new `nordiccurl_bodyweight` must appear in both sets — `ExerciseImageUtils_exists` gates whether the app shows an image.

## Step 2 — Register the exercise (`src/models/exercise.ts`)

Add to `allExercisesList` (keep it alphabetically near its neighbors):

```ts
nordicCurl: {
  id: "nordicCurl",
  name: "Nordic Curl",
  defaultWarmup: 10,
  defaultEquipment: "bodyweight",
  types: ["lower"],
  startingWeightLb: { value: 0, unit: "lb" },
  startingWeightKg: { value: 0, unit: "kg" },
},
```

- `types` — subset of `upper`/`lower`/`push`/`pull`/`legs`/`core`. Copy from the closest analogous exercise.
- `startingWeight*` — `0` for pure bodyweight; otherwise a sane starting load matching similar exercises.
- Add `reuseImageFrom: { id: "...", equipment: "..." }` here if you skipped Step 1.

Add to the `metadata` record (same file, keyed by id):

```ts
nordicCurl: {
  targetMuscles: ["Hamstrings"],
  synergistMuscles: ["Gastrocnemius", "Gluteus Maximus"],
},
```

`targetMuscles` / `synergistMuscles` must be exact literals from the `availableMuscles` list in `src/types.ts` (typed as `IMuscle`) — inventing a name is a type error. The allowed values:

> Adductor Brevis, Adductor Longus, Adductor Magnus, Biceps Brachii, Brachialis, Brachioradialis, Deltoid Anterior, Deltoid Lateral, Deltoid Posterior, Erector Spinae, Gastrocnemius, Gluteus Maximus, Gluteus Medius, Hamstrings, Iliopsoas, Infraspinatus, Latissimus Dorsi, Levator Scapulae, Obliques, Pectineous, Pectoralis Major Clavicular Head, Pectoralis Major Sternal Head, Quadriceps, Rectus Abdominis, Sartorius, Serratus Anterior, Soleus, Splenius, Sternocleidomastoid, Tensor Fasciae Latae, Teres Major, Teres Minor, Tibialis Anterior, Trapezius Lower Fibers, Trapezius Middle Fibers, Trapezius Upper Fibers, Triceps Brachii, Wrist Extensors, Wrist Flexors

(Check `src/types.ts` for the current source of truth.) When unsure which muscles apply, copy from the `metadata` entry of the most analogous exercise.

## Step 3 — Description page (`exercises/<id>_<equipment>.md`)

Filename is lowercased: `exercises/nordiccurl_bodyweight.md`. Format:

```markdown
---
video: "<youtube-id>"
description: "One-sentence summary of the exercise and what it trains."
---

## Starting Position

1. ...

## Movement

1. ...

## Key Points

- ...

<!-- howto -->

### Set Up Your Position

Plain-prose step.

### Execute the Movement

Plain-prose step.
```

- `video` — the YouTube video **id only** (the `abc123XYZ` part, not the full URL). Find a real, good demonstration video; do not fabricate an id.
- Everything before `<!-- howto -->` is the form guide; everything after is parsed into `### Heading` + prose steps (see `scripts/build-exercises.ts`).
- Match the tone/quality of existing files (`exercises/pushup_bodyweight.md`, `exercises/pistolsquat_bodyweight.md`) and the writing guidance in `.claude/commands/describe-technique.md`.

Then regenerate the compiled descriptions (never hand-edit the generated file):

```
npm run build:exercises
```

This rewrites `src/models/exerciseDescriptions.ts`, keyed by `nordiccurl_bodyweight`.

## Step 4 — LLM/MCP exercise list (`llms/exercises.md`)

Add the display name to `llms/exercises.md` (this manually-maintained list is compiled to `src/generated/exercises.ts` by `scripts/build-markdown.js` and surfaced to the LLM/MCP via `lambda/mcp/reference.ts`). Match the existing formatting, including per-equipment variants (`Name, Equipment`) if the exercise ships with more than its default equipment. The regeneration runs as part of the normal build.

## Step 5 — Verify

- `npx tsc --noEmit` — no type errors.
- Exercise appears in the picker (search its name).
- Its detail/how-to page renders the image, description, video, and how-to steps.
- If you added several exercises, re-run the exercise unit tests: `npx mocha --require ts-node/register test/exercise.test.ts`.

## Name-collision safety (already handled in code — do not re-implement)

Users often create **custom** exercises to fill catalog gaps. When a new built-in shares a **name** with a user's custom exercise, resolution prefers the **custom** one, so existing programs/history never silently re-point to the new built-in. This is enforced in `Exercise_findIdByName` / `Exercise_findByNameAndEquipment` (`src/models/exercise.ts`, custom-index checked before `nameToIdMapping`) and covered by `test/exercise.test.ts` ("custom exercise wins over built-in on name collision"). You don't need to do anything per-exercise — just be aware that picking a display name that matches an existing custom exercise is safe by design.
