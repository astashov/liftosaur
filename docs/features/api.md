---
id: api
title: "API"
shortDescription: "Create an API key in the app, then read and write programs, history, measurements and equipment from any script. Run whole workouts through the engine."
category: "Sharing and data"
order: 70
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [api-me-row, api-keys-empty]
---

## Create an API key

Go to **Me → API Keys**. The row is in the **Account** group. Type a name under **Create New Key** and tap **Create**. If you leave the name empty, the key is called "API Key".

The new key appears under **Your Keys** with its name and creation date. It starts with `lftsk_`. Tap **Copy** to put it on the clipboard. The label changes to **Copied!** for two seconds.

Keep the key secret. Anyone who has it can read and change your training data. If you lose it, delete it and create a new one.

API keys need Premium and a signed-in account. Without an account, the screen shows a **Log in** button. Without Premium, it shows **Subscribe to unlock**.

## Revoke a key

Tap **Delete** next to a key. The app asks "Are you sure you want to delete this API key?". Tap **OK**. Every request with that key now gets a `401` error. With no keys left, the screen says "No API keys yet".

## What a key can do

A key acts as you. It reaches everything the app stores for your account:

- **Programs**: list, read, create, update and delete. Program text is Liftoscript. A syntax error returns `422` with the line number.
- **History**: list with date filters and paging, read one record, create, update, delete. Records use the Liftoscript Workouts text format.
- **Playground**: run a program day with commands like `complete_set(1, 1)` and `finish_workout()`, without saving. Returns the workout and the updated program text.
- **Program stats**: sets per muscle group, strength versus hypertrophy split and workout length estimates for any program text.
- **Gyms and equipment**: create gyms, switch the current gym, and change bars, plates and fixed weights.
- **Exercise data**: 1RM, rounding, notes, muscle overrides and per-gym equipment per exercise.
- **Measurements**: bodyweight, body parts, body fat, and the read-only `sleep`, `calories` and `protein` series from Health sync.

## Call the API

Every request goes to `https://www.liftosaur.com/api/v1` with the key as a Bearer token:

```
curl https://www.liftosaur.com/api/v1/programs \
  -H "Authorization: Bearer lftsk_your_key_here"
```

The reply is JSON with a `data` object. Errors come back as an `error` object with a `code` and a `message`:

- `401` missing or invalid key.
- `403` no active Premium subscription.
- `400` invalid input, like deleting the active program.
- `404` record or program not found.
- `409` conflict, like a duplicate measurement timestamp.
- `422` Liftoscript parse error, or a program script that failed.

Use `id=current` in the programs endpoints for the active program. Lists page with `hasMore` and `nextCursor`, 50 records by default and 200 at most.

Request and response bodies for every endpoint are in the [REST API reference](/doc/api).

## Run a workout from another app

The endpoints under `/api/v1/workout/*` run the program engine on the server. Your app reports what the lifter did, and the server applies progressions, updates 1RMs and writes history, the same as finishing in the app.

- `GET /api/v1/workout/next` previews the next day, with weights rounded to your gym, plates per side and rest timers resolved.
- `POST /api/v1/workout/start` starts it.
- `POST /api/v1/workout/set` logs one set by `setId`. `POST /api/v1/workout/sets` logs several in one call.
- `POST /api/v1/workout/finish` saves it, runs progressions and advances the next-workout pointer.
- `GET /api/v1/workout/current` returns the live workout, so your app can pick up sets logged on the phone.
- `DELETE /api/v1/workout/current` discards the live workout.

Writes need two extra headers, `X-Liftosaur-Device-Id` and `X-Liftosaur-Client`. Every write is safe to repeat after a lost reply. An AMRAP set or a set with `askWeight` returns `400 missing_set_input` until you send the value.

## AI assistants and MCP

The same key also powers the MCP server, so Claude, ChatGPT or Gemini can edit programs and log workouts for you. See [AI and MCP](/features/ai-and-mcp).
