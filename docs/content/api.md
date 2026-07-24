---
id: api
title: "REST API"
shortDescription: "Access your programs and workout history programmatically with the Liftosaur REST API."
order: 1
category: "Integrations"
datePublished: "2026-03-07"
dateModified: "2026-03-07"
---

## What is the Liftosaur API?

Liftosaur has a REST API that lets you manage your programs and workout history programmatically. You can create programs, log workouts, simulate progressions, and pull stats - all from scripts, apps, or anything that can make HTTP requests.

Requires a premium subscription.

## Getting an API Key

1. Open Liftosaur and go to **Settings**
2. Tap **API Keys**
3. Tap **Create API Key** and give it a name
4. Copy the key - it starts with `lftsk_`

Keep it secret. If you lose it, delete it and create a new one.

## Authentication

Pass your API key as a Bearer token in the `Authorization` header:

```
Authorization: Bearer lftsk_your_key_here
```

Every request needs this header. Without it you'll get a `401` error.

## Base URL

```
https://www.liftosaur.com/api/v1
```

## Endpoints

### List Programs

```
GET /api/v1/programs
```

Returns all your programs with their IDs, names, and which one is currently active.

**Response:**

```json
{
  "data": {
    "programs": [
      { "id": "abc123", "name": "5/3/1 BBB", "isCurrent": true },
      { "id": "def456", "name": "GZCLP", "isCurrent": false }
    ]
  }
}
```

### Get a Program

```
GET /api/v1/programs/:id
```

Returns the program's name and full source code in Liftoscript format. Use `id=current` to get the currently active program.

**Response:**

```json
{
  "data": {
    "id": "abc123",
    "name": "My Program",
    "text": "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)",
    "isCurrent": true
  }
}
```

### Create a Program

```
POST /api/v1/programs
Content-Type: application/json

{
  "name": "My Program",
  "text": "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)"
}
```

The `text` field must be valid Liftoscript. If there are syntax errors, you'll get a `422` response with line numbers and error messages.

**Response (201):**

```json
{
  "data": {
    "id": "abc123",
    "name": "My Program",
    "text": "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)"
  }
}
```

### Update a Program

```
PUT /api/v1/programs/:id
Content-Type: application/json

{
  "text": "# Week 1\n## Day 1\nSquat / 5x5 / 185lb / progress: lp(10lb)",
  "name": "Updated Name"
}
```

`name` is optional - if omitted, keeps the existing name. Use `id=current` to update the active program.

**Response:**

```json
{
  "data": {
    "id": "abc123",
    "name": "Updated Name",
    "text": "# Week 1\n## Day 1\nSquat / 5x5 / 185lb / progress: lp(10lb)",
    "isCurrent": true
  }
}
```

### Delete a Program

```
DELETE /api/v1/programs/:id
```

Can't delete the currently active program.

**Response:**

```json
{
  "data": {
    "deleted": true
  }
}
```

### List History

```
GET /api/v1/history?limit=50&startDate=2026-01-01&endDate=2026-03-01
```

Query parameters (all optional):
- `startDate` - ISO date or unix timestamp
- `endDate` - ISO date or unix timestamp
- `limit` - max records to return (default 50, max 200)
- `cursor` - pagination cursor from previous response

History records use Liftoscript Workouts - a compact, human-readable text format for workouts.

**Response:**

```json
{
  "data": {
    "records": [
      {
        "id": 1,
        "text": "2026-03-01T10:00:00Z / program: \"5/3/1\" / dayName: \"Squat Day\" / week: 1 / dayInWeek: 1 / duration: 3600s / exercises: {\n  Squat, Barbell / 3x5 185lb / warmup: 1x5 95lb, 1x3 135lb / target: 3x5 185lb 120s\n  Leg Press / 3x10 200lb / target: 3x10 200lb 90s\n}"
      }
    ],
    "hasMore": false
  }
}
```

When `hasMore` is `true`, use the `nextCursor` value as the `cursor` parameter in the next request:

```json
{
  "data": {
    "records": [...],
    "hasMore": true,
    "nextCursor": 42
  }
}
```

### Get a History Record

```
GET /api/v1/history/:id
```

**Response:**

```json
{
  "data": {
    "id": 1,
    "text": "2026-03-01T10:00:00Z / program: \"5/3/1\" / dayName: \"Squat Day\" / exercises: {\n  Squat, Barbell / 3x5 185lb\n}"
  }
}
```

### Create a History Record

```
POST /api/v1/history
Content-Type: application/json

{
  "text": "2026-03-01T10:00:00Z / program: \"My Program\" / dayName: \"Day 1\" / week: 1 / dayInWeek: 1 / exercises: {\n  Squat / 3x5 135lb\n  Bench Press / 3x8 95lb\n}"
}
```

If you include `program: "Name"`, the API looks up that program and links the workout to it - exercises get matched to their program counterparts, and the day name is filled in if you didn't specify one. If the program doesn't exist, you'll get a `400` error.

You can also create workouts without a program reference - just omit the `program` section.

**Response (201):**

```json
{
  "data": {
    "id": 1,
    "text": "2026-03-01T10:00:00Z / program: \"My Program\" / dayName: \"Day 1\" / week: 1 / dayInWeek: 1 / exercises: {\n  Squat / 3x5 135lb\n  Bench Press / 3x8 95lb\n}"
  }
}
```

### Update a History Record

```
PUT /api/v1/history/:id
Content-Type: application/json

{
  "text": "2026-03-01T10:00:00Z / exercises: {\n  Squat / 3x5 155lb\n}"
}
```

**Response:**

```json
{
  "data": {
    "id": 1,
    "text": "2026-03-01T10:00:00Z / exercises: {\n  Squat / 3x5 155lb\n}"
  }
}
```

### Delete a History Record

```
DELETE /api/v1/history/:id
```

**Response:**

```json
{
  "data": {
    "deleted": true
  }
}
```

### Playground

Simulate a workout without saving anything. Use this to test program logic and progressions before committing.

```
POST /api/v1/playground
Content-Type: application/json

{
  "programText": "# Week 1\n## Day 1\nSquat / 3x5 / 135lb / progress: lp(5lb)",
  "day": 1,
  "week": 1,
  "commands": [
    "complete_set(1, 1)",
    "complete_set(1, 2)",
    "complete_set(1, 3)",
    "finish_workout()"
  ]
}
```

Only `programText` is required. `day`, `week`, and `commands` are optional.

Available commands:
- `complete_set(exercise, set)` - mark a set done (1-indexed)
- `change_weight(exercise, set, weight)` - e.g. `change_weight(1, 1, 185lb)`
- `change_reps(exercise, set, reps)`
- `change_rpe(exercise, set, rpe)`
- `set_state_variable(exercise, name, value)`
- `finish_workout()` - runs progression scripts, returns updated program text

**Response:**

```json
{
  "data": {
    "workout": "2026-03-07T10:00:00Z / exercises: {\n  Squat, Barbell / 3x5 135lb / target: 3x5 135lb\n}",
    "updatedProgramText": "# Week 1\n## Day 1\nSquat / 3x5 / 140lb / progress: lp(5lb)"
  }
}
```

`updatedProgramText` is only present when `finish_workout()` is included in the commands.

### Program Stats

Get stats for a program without saving it - workout duration estimates, weekly volume per muscle group, strength vs hypertrophy breakdown.

```
POST /api/v1/program-stats
Content-Type: application/json

{
  "programText": "# Week 1\n## Day 1\nSquat / 3x5 / 135lb\nBench Press / 3x8 / 95lb"
}
```

**Response:**

```json
{
  "data": {
    "days": [
      { "name": "Day 1", "approxMinutes": 25, "workingSets": 6 }
    ],
    "totalWeeklySets": 6,
    "strengthSets": 3,
    "hypertrophySets": 3,
    "muscleGroups": [
      {
        "muscle": "Quads",
        "totalSets": 3,
        "strengthSets": 3,
        "hypertrophySets": 0,
        "frequencyPerWeek": 1,
        "exercises": [
          { "name": "Squat", "sets": 3, "isSynergist": false }
        ]
      },
      {
        "muscle": "Chest",
        "totalSets": 3,
        "strengthSets": 0,
        "hypertrophySets": 3,
        "frequencyPerWeek": 1,
        "exercises": [
          { "name": "Bench Press", "sets": 3, "isSynergist": false }
        ]
      }
    ]
  }
}
```

### List Gyms

Equipment (bars, plates, fixed weights) is configured per gym. Most accounts have a single gym. You need a gym's `id` before reading or editing its equipment.

```
GET /api/v1/gyms
```

**Response:**

```json
{
  "data": {
    "currentGymId": "default",
    "gyms": [
      { "id": "default", "name": "Main", "isCurrent": true, "equipmentCount": 8 }
    ]
  }
}
```

### Create a Gym

The new gym starts with a copy of the current gym's equipment.

```
POST /api/v1/gyms
Content-Type: application/json

{
  "name": "Home"
}
```

**Response (201):**

```json
{
  "data": {
    "id": "k3n8p2qz",
    "name": "Home",
    "isCurrent": false,
    "equipmentCount": 8
  }
}
```

### Update a Gym

Rename a gym and/or make it the current (active) gym.

```
PUT /api/v1/gyms/:id
Content-Type: application/json

{
  "name": "Garage",
  "setCurrent": true
}
```

Both fields are optional.

**Response:**

```json
{
  "data": {
    "id": "k3n8p2qz",
    "name": "Garage",
    "isCurrent": true,
    "equipmentCount": 8
  }
}
```

### Delete a Gym

```
DELETE /api/v1/gyms/:id
```

You cannot delete the last remaining gym (returns `400`).

**Response:**

```json
{
  "data": {
    "deleted": true
  }
}
```

### List Equipment

```
GET /api/v1/gyms/:gymId/equipment
```

Built-in equipment keys: `barbell`, `cable`, `dumbbell`, `smith`, `band`, `kettlebell`, `bodyweight`, `leverageMachine`, `medicineball`, `ezbar`, `trapbar`. Custom equipment has keys like `equipment-xxxxxxxx`.

Returns all equipment in the gym, including soft-deleted ones (each item carries an `isDeleted` flag) — deleted equipment is kept in storage so that exercises which reference it (for weight rounding / the plate calculator) don't point at a non-existent id. Filter by `isDeleted` client-side if you only want active equipment.

**Response:**

```json
{
  "data": {
    "gymId": "default",
    "equipment": [
      {
        "id": "barbell",
        "name": "Barbell",
        "isCustom": false,
        "isDeleted": false,
        "bar": { "lb": "45lb", "kg": "20kg" },
        "multiplier": 2,
        "isFixed": false,
        "plates": [
          { "weight": "45lb", "num": 8 },
          { "weight": "25lb", "num": 4 },
          { "weight": "10lb", "num": 4 }
        ],
        "fixed": []
      }
    ]
  }
}
```

The optional fields `unit`, `notes`, `similarTo`, `useBodyweightForBar`, and `isAssisting` are only present when set on the equipment.

### Get Equipment

```
GET /api/v1/gyms/:gymId/equipment/:id
```

**Response:**

```json
{
  "data": {
    "id": "barbell",
    "name": "Barbell",
    "isCustom": false,
    "isDeleted": false,
    "bar": { "lb": "45lb", "kg": "20kg" },
    "multiplier": 2,
    "isFixed": false,
    "plates": [
      { "weight": "45lb", "num": 8 },
      { "weight": "25lb", "num": 4 },
      { "weight": "10lb", "num": 4 }
    ],
    "fixed": []
  }
}
```

### Update Equipment

Equipment configuration drives how Liftosaur rounds prescribed weights during a workout. Only provided fields change; omitted fields keep their current values. Weights are strings like `"45lb"` or `"20kg"`. Out-of-range values are clamped.

```
PUT /api/v1/gyms/:gymId/equipment/:id
Content-Type: application/json

{
  "bar": { "lb": "45lb", "kg": "20kg" },
  "plates": [{ "weight": "45lb", "num": 8 }, { "weight": "25lb", "num": 2 }],
  "fixed": ["10lb", "15lb", "20lb"],
  "isFixed": false,
  "multiplier": 2,
  "unit": "lb",
  "name": "Barbell",
  "notes": ""
}
```

Field notes:
- `bar` — optional `lb` and `kg` bar weights; `lb` must be in lb, `kg` in kg.
- `plates` — available plates; `num` is how many of that plate.
- `fixed` — fixed weights, used when `isFixed` is `true` (e.g. a dumbbell rack).
- `multiplier` — integer 1-10, how many sides plates load onto (`2` for a barbell/dumbbell loaded on both ends, `1` for a machine loaded on one side).
- `isDeleted` — soft-delete/restore. Set `true` to remove the equipment from workout pickers (this is how you "delete" a custom equipment or hide a built-in like `barbell`); set `false` to restore it. The entry and its config are kept in storage either way (so exercises that reference it for rounding don't dangle), and it still appears in List Equipment with `isDeleted: true`. There is no separate delete endpoint and no hard-delete.

Works for built-in and custom equipment, including soft-deleted ones. Returns the updated equipment.

**Response:**

```json
{
  "data": {
    "id": "barbell",
    "name": "Barbell",
    "isCustom": false,
    "isDeleted": false,
    "unit": "lb",
    "bar": { "lb": "45lb", "kg": "20kg" },
    "multiplier": 2,
    "isFixed": false,
    "plates": [{ "weight": "45lb", "num": 8 }, { "weight": "25lb", "num": 2 }],
    "fixed": ["10lb", "15lb", "20lb"],
    "notes": ""
  }
}
```

### Create Custom Equipment

```
POST /api/v1/gyms/:gymId/equipment
Content-Type: application/json

{
  "name": "Battle Rope",
  "plates": [{ "weight": "10kg", "num": 4 }]
}
```

Only `name` is required; the same fields as Update Equipment are accepted. Returns `201` with the full created equipment object (same shape as Get Equipment), including the generated `id`.

**Response (201):**

```json
{
  "data": {
    "id": "equipment-a1b2c3d4",
    "name": "Battle Rope",
    "isCustom": true,
    "isDeleted": false,
    "bar": { "lb": "0lb", "kg": "0kg" },
    "multiplier": 1,
    "isFixed": false,
    "plates": [{ "weight": "10kg", "num": 4 }],
    "fixed": []
  }
}
```

### Delete / Restore Equipment

There is no separate delete endpoint — soft-delete and restore are done through **Update Equipment** by setting the `isDeleted` field:

```
PUT /api/v1/gyms/:gymId/equipment/:id
Content-Type: application/json

{
  "isDeleted": true
}
```

Set `isDeleted` to `true` to remove equipment from workout pickers (works for both a custom equipment and a built-in like `barbell`), or `false` to restore it. The entry and its config are kept in storage so exercises that reference it for rounding don't dangle, and it still appears in List Equipment with `isDeleted: true`. Returns the updated equipment, or `404` if it doesn't exist in the gym.

### List Exercise Data

Per-exercise settings (1 rep max, weight rounding, per-gym equipment overrides, notes, muscle overrides, unilateral flag) are stored keyed by an _exercise key_: a built-in exercise id plus its equipment, joined with `_` (e.g. `squat_barbell`, `benchPress_barbell`), or a custom exercise id.

The key must match the equipment your workouts actually use, which is almost always the equipment-qualified form (e.g. `benchPress_barbell`, `bicepCurl_dumbbell`). A bare id like `benchPress` only matches an exercise configured with **no equipment** — setting data under a bare id will not affect your normal barbell/dumbbell entries. List Exercise Data shows the exact keys already in use on your account.

```
GET /api/v1/exercise-data
```

Returns only the exercises the user has customized. Exercises with no stored customizations don't appear (their values fall back to defaults).

**Response:**

```json
{
  "data": {
    "exerciseData": [
      {
        "key": "squat_barbell",
        "exerciseName": "Squat",
        "rm1": "315lb",
        "rounding": 5,
        "isUnilateral": false
      }
    ]
  }
}
```

The fields `rm1`, `rounding`, `equipment`, `notes`, `muscleMultipliers`, and `isUnilateral` are only present when set.

### Get Exercise Data

```
GET /api/v1/exercise-data/:key
```

Returns the stored customizations for a single exercise key (same shape as a List item), or `404` if the exercise has no customizations stored.

### Set Exercise Data

Upserts per-exercise settings. Only provided fields change; omitted fields keep their current values; pass `null` for a field to clear it (revert to default). If clearing leaves no fields set, the entry stops appearing in List / Get (it's emptied, not hard-deleted, so re-adding a field later works cleanly). The key's exercise must exist (a built-in id optionally with an equipment suffix, or a custom exercise id) and, if an equipment suffix is given, it must be a built-in equipment or a custom equipment id present in one of your gyms — otherwise `400`.

```
PUT /api/v1/exercise-data/:key
Content-Type: application/json

{
  "rm1": "315lb",
  "rounding": 5
}
```

Fields:

- `rm1` — the exercise 1 rep max, as a weight string like `"315lb"` or `"140kg"`.
- `rounding` — weight increment that prescribed weights round to (e.g. `5` for 5lb, `2.5` for 2.5kg).
- `equipment` — per-gym equipment override, a map of `gymId` → `equipmentId` (e.g. `{ "default": "dumbbell" }`). The map replaces any existing override wholesale. Each `gymId` must exist and each `equipmentId` must exist in that gym (see List Gyms / List Equipment), or be `null` to mean "None" (the exercise uses no equipment at that gym). Setting the whole `equipment` field to `null` clears the override entirely. In responses the map lists only gyms with a real equipment override; a gym absent from the map (when an override is present) means "None" there.
- `notes` — free-text notes shown for the exercise.
- `muscleMultipliers` — override of which muscles the exercise works, a map of muscle name → multiplier; `1` marks a target muscle, a value `<1` (e.g. `0.5`) marks a synergist with that weight. Replaces the exercise's default muscles entirely.
- `isUnilateral` — whether the exercise is performed one side at a time.

Returns the updated exercise data (same shape as Get).

### Delete Exercise Data

```
DELETE /api/v1/exercise-data/:key
```

Clears all stored customizations for the exercise key, reverting it entirely to defaults — afterwards it no longer appears in List / Get. Returns `{ "data": { "deleted": true } }`, or `404` if nothing was stored. To clear just one field, use Set Exercise Data with that field set to `null` instead.

### List Measurements

Body measurements (bodyweight, body parts, and bodyfat) are recorded as time series. Each measurement is addressed by a _key_ that falls in one of three categories, and every value is a number with an **explicit unit suffix**:

- **weight** — `weight` (bodyweight), e.g. `"180lb"` / `"82kg"`.
- **percentage** — `bodyfat`, e.g. `"18%"`.
- **length** — a body part, e.g. `"37cm"` / `"14.75in"`: `neck`, `shoulders`, `bicepLeft`, `bicepRight`, `forearmLeft`, `forearmRight`, `chest`, `waist`, `hips`, `thighLeft`, `thighRight`, `calfLeft`, `calfRight`.

```
GET /api/v1/measurements
```

A bounded overview — returns only keys that have at least one recorded value, each with the total `count` and the `latest` value (with its unix epoch ms `timestamp`, its stable id used by Update / Delete, an ISO 8601 `date`, and the unit-suffixed `value`). It does **not** return the full series — a key can hold thousands of values; page through them with Get Measurement.

**Response:**

```json
{
  "data": {
    "measurements": [
      {
        "key": "weight",
        "category": "weight",
        "count": 412,
        "latest": { "timestamp": 1700000000000, "date": "2023-11-14T22:13:20.000Z", "value": "180lb" }
      }
    ]
  }
}
```

### Get Measurement

```
GET /api/v1/measurements/:key?limit=50&cursor=1700000000000
```

Returns the recorded history for a single key, newest-first and paginated. Each value's unit is part of its string and may differ between values (changing your units setting does not convert past entries). `limit` defaults to 50 (max 200). The response includes `hasMore` and, when there are more, a `nextCursor` — pass it back as `cursor` to fetch the next (older) page. A valid key with no recorded values returns `200` with an empty `values` array; an unknown key returns `400`.

**Response:**

```json
{
  "data": {
    "key": "weight",
    "category": "weight",
    "values": [
      { "timestamp": 1700000000000, "date": "2023-11-14T22:13:20.000Z", "value": "180lb" }
    ],
    "hasMore": false
  }
}
```

### Add Measurement

```
POST /api/v1/measurements/:key
Content-Type: application/json

{
  "value": "180lb",
  "timestamp": 1700000000000
}
```

- `value` (required) — a number with a unit suffix that matches the key's category: `lb`/`kg` for weight, `cm`/`in` for length, `%` for bodyfat (e.g. `"180lb"`, `"37cm"`, `"18%"`). The suffix is required.
- `timestamp` (optional) — unix epoch ms or an ISO 8601 date string. Defaults to now.

Returns the created value (`201`). Fails with `409` if a value already exists at that exact timestamp for the key — use Update Measurement instead.

### Update Measurement

```
PUT /api/v1/measurements/:key/:timestamp
Content-Type: application/json

{
  "value": "178lb"
}
```

The `:timestamp` in the path identifies the existing value, and `value` (unit-suffixed, as in Add) is the new reading. The timestamp is the entry's identity and isn't changed here — to re-date an entry, Delete it and Add it at the new time. Returns the updated value, `400` if `value` is missing/invalid, or `404` if no value exists at that timestamp.

### Delete Measurement

```
DELETE /api/v1/measurements/:key/:timestamp
```

Deletes a single recorded value. Returns `{ "data": { "deleted": true } }`, or `404` if no value exists at that timestamp.

## Liftoscript and Liftoscript Workouts

Programs use Liftoscript - a custom DSL for defining workout programs. It's not a standard format, so you'll need to learn the syntax to write valid programs. Check out the built-in program library for examples, or use the [MCP server](/docs/mcp) to let an AI assistant write programs for you.

History records use Liftoscript Workouts - a compact text format for workouts. Here's what a record looks like:

```
2026-03-01T10:00:00Z / program: "5/3/1" / dayName: "Push Day" / week: 1 / dayInWeek: 1 / duration: 3600s / exercises: {
  Bench Press, Barbell / 3x5 185lb, 1x3 185lb / warmup: 1x5 95lb, 1x3 135lb / target: 3x5 185lb 120s
  Overhead Press / 3x10 95lb / target: 3x10 95lb 60s
}
```

## Error Responses

Errors come back as JSON with a status code, error code, and message:

```json
{
  "error": {
    "code": "parse_error",
    "message": "Failed to parse program",
    "details": [
      { "line": 3, "offset": 1, "message": "Unknown exercise: Barbell Curl" }
    ]
  }
}
```

Common status codes:
- `401` - missing or invalid API key
- `403` - no active subscription
- `400` - invalid input (wrong program name, can't delete active program, etc.)
- `404` - record or program not found
- `422` - parse error (invalid Liftoscript or Liftoscript Workouts syntax)
