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
