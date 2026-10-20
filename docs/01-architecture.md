# 1 · System & tech stack architecture

LiftoDroid is a **gym execution engine**, not a Liftosaur client clone. It reads the program the
server already resolved, records what the lifter actually did, and hands it back. It never runs
Liftoscript, never computes progression, never edits a program.

> **Server-side progression principle.** Report what the lifter did; the server decides what it means.
> LiftoDroid only ever writes `completed` values. Targets, plates, rest timers, 1RMs, and the next
> day all come from the server.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Language | Kotlin 2.0, JVM 17 | |
| UI | Jetpack Compose (BOM 2024.12) + Material 3 as a base, with a custom `FlowTheme` on top | Material supplies dialogs, sheets and text fields. Living Flow supplies everything you see. |
| Backdrop blur | [Haze](https://github.com/chrisbanes/haze) 1.1 | Real backdrop blur on API 31+, opaque fallback below. |
| Shared-element morphs | `SharedTransitionLayout` + `AnimatedContent` | The set card morphs instead of navigating. |
| Networking | Ktor 3 client (OkHttp engine) + kotlinx.serialization | Coroutine-native. `MockEngine` makes the sync logic testable on the JVM. |
| Persistence | Room 2.6 (KSP) | Live-workout snapshot, ordered outbox, read cache. |
| Background sync | WorkManager 2.10, expedited unique work with a `CONNECTED` constraint | Survives process death. Resumes the drain the moment signal returns. |
| Rest timer | Foreground service (`specialUse`) + ongoing notification | Lock-screen countdown and controls. Haptics fire with the screen off. |
| Settings | DataStore. API key AES-GCM-encrypted with an Android Keystore key | The premium key never sits in plaintext. |
| DI | Manual `AppContainer` | One small graph; a framework would cost more than it saves. |
| minSdk / target | 28 / 35 | Blur and the richer haptics need API 31+, and both degrade gracefully below it. |

## Module & package map

```
app/src/main/java/app/liftodroid/
├── LiftoDroidApp.kt          AppContainer (manual DI)
├── MainActivity.kt           edge-to-edge, FlowTheme, AppShell
├── domain/                   pure Kotlin, no Android
│   ├── Weight.kt             "100kg" ⇄ Weight, unit conversion
│   ├── PlateCalculator.kt    per-side plate breakdown, loadable-weight stepping
│   ├── Liftohistory.kt       parser for GET /history record text
│   ├── Progress.kt           e1RM / volume / rep-PR analytics, live PR detection
│   └── Ids.kt                six-lowercase-letter setIds for appends
├── data/
│   ├── remote/               DTOs (1:1 with the API docs) + LiftosaurApi (Ktor)
│   ├── local/                Room: active_workout, outbox, cache · SettingsStore
│   ├── WorkoutMerge.kt       pure: optimistic apply, rebase, offline-start id remap
│   ├── WorkoutRepository.kt  the workout cycle and the outbox drain
│   └── InsightsRepository.kt history, measurements, gyms, equipment (network → cache)
├── sync/OutboxSync.kt        WorkManager worker + scheduler
├── session/                  WorkoutSessionService (rest timer FGS), Haptics
└── ui/
    ├── theme/                FlowTokens (colour, glass, radius, type, motion), FlowTheme
    ├── components/           glass(), flowCard(), flowPressable(), FlowButton, TrendChart
    ├── shell/                AppShell (root morph), FloatingIsland nav
    ├── dashboard/            Up Next + gym switcher sheet
    ├── workout/              SetFlow (state model), ActiveSetFlowCard, WorkoutScreen, VM
    └── insights/             History feed, Progress charts
```

## Data flow: one direction, Room in the middle

```
 tap ──▶ ViewModel ──▶ WorkoutRepository ──┬─▶ Room.active_workout   (optimistic snapshot)
                                           └─▶ Room.outbox           (ordered write-ahead log)
                                                      │
 UI ◀── StateFlow ◀── Room Flow ◀───────────────────────┤
                                                      ▼
                                   drain()  ◀── WorkManager (CONNECTED) / in-app trigger
                                      │
                                      ▼
                               Liftosaur API ──▶ server workout ──▶ rebase ──▶ Room
```

The UI never waits on the network. Every action is a Room transaction: snapshot update plus
outbox row, atomically. The UI renders from Room. The network only ever *corrects* Room.

## Workout session state machine

Two layers. **Durable state** lives in Room and survives process death: which sets are complete,
the rest deadline, and whether a finish was requested. **Ephemeral UI phase** lives in the ViewModel:
the set being edited and its draft values, or a running hold timer. A pure function,
`SetFlow.resolve(...)`, combines them into exactly one `SetFlowState` for the bottom card.

```
                       ┌──────────── Up Next (no live workout) ─────────────┐
                       │                  tap START                          │
                       ▼                                                     │
  ┌─────────┐  ✓ Done (as prescribed)   ┌─────────┐  timer hits 0 / Lift  ┌──┴──────┐
  │  READY  │ ────────────────────────▶ │ RESTING │ ────────────────────▶ │  READY  │ (next set)
  └────┬────┘                           └────▲────┘                       └─────────┘
       │ Adjust / AMRAP / askWeight / RPE    │ Save
       ▼                                     │
  ┌─────────┐ ───────────────────────────────┘
  │ LOGGING │ ◀── tap any set chip (edit while resting: LOGGING outranks RESTING)
  └─────────┘
       ▲ needs input after the hold
  ┌────┴────┐  Start hold ─▶ count up ─▶ Stop (unilateral: right ▸ switch ▸ left)
  │ HOLDING │ ──────────────────────────────────────────────────────────▶ RESTING
  └─────────┘
                         no incomplete sets ──▶ COMPLETE ──Finish──▶ (outbox) ──▶ Up Next
```

Resolution priority: `Logging | Holding` (explicit interaction) > `Resting` (deadline in the
future) > `Ready` (focused set, else first incomplete) > `Complete`.

`phaseKey` drives `AnimatedContent`. It changes only on a real phase change (`ready:<setId>`,
`logging:<setId>`, `resting`…), so stepper taps don't restart the morph. This is unit-tested.

## Offline-first synchronization

### The outbox

| kind | body | replay-safe because |
|---|---|---|
| `START` | `{programId, week, dayInWeek, startTime}` | same program/day already live → `200` with that workout |
| `SET` | `SetWrite {setId, entryId, completed, append?}` | sets are last-writer-wins by `setId`; an append with a seen `setId` is a no-op |
| `FINISH` | `{startTime, endTime, notes, intervals?}` | repeating a finish returns the original summary: no second record, no double-advance |
| `DISCARD` | `{startTime}` | a repeat returns `404`, which we treat as done |

Drain rules (`WorkoutRepository.drainLoop`):

1. **Strict order.** Rows are sent by ascending `seq`. A run of consecutive `SET` rows for the same
   workout becomes **one** `POST /workout/sets`, a single server transaction. A single row uses `POST /workout/set`.
2. **Collapse adjacent duplicates.** Two writes in a row to the same `setId` collapse to the last one,
   since last-writer-wins makes that equivalent. An append is never collapsed away. Instead it absorbs the later value.
3. **Adopt, then rebase.** Every response carries the whole workout. The snapshot becomes *server
   workout + any SET rows still queued*, re-applied in order. A set logged while a request was in
   flight is never clobbered by the older response. This is tested.
4. **Update scripts.** For entries with `hasUpdateScript: true`, the remaining incomplete sets are
   marked `pendingRewrite` while a write is queued, and the card says *"Target may update once your
   last set syncs"*. We never guess what the script will do. The server's next response replaces those targets.

### Starting a workout with zero signal

`start()` never waits for the server:

1. Take the cached `GET /workout/next` preview (refreshed on every app open and after every finish).
2. Choose `startTime = now()` on the device. The API accepts a client `startTime`, and it becomes
   the history record id, so the id is final from the first second.
3. Write the snapshot (`startConfirmed = false`) and a `START` row. The lifter is already on set 1.
4. When `POST /workout/start` answers, its sets may carry **different `setId`s** from the preview.
   `WorkoutMerge.remapSetIds` maps preview ids to real ids by position, for entries whose `exerciseId`
   matches, and rewrites every queued `SET` row before it's sent. This is tested.

### Failure taxonomy

| Outcome | Examples | Behaviour |
|---|---|---|
| Transport failure | DNS, socket, timeout | `ApiException.Offline` → `Retry`. WorkManager backs off exponentially (10 s base) under a `CONNECTED` constraint. |
| Transient server | `5xx`, `429` | `Retry` |
| Auth | `401`, `403` (no premium) | `AuthRequired`. The queue is kept and the app routes to the key screen. |
| Bad write | `missing_set_input`, `invalid_set_input`, `set_not_found` | A batch is one transaction, so on a 4xx the batch is **re-sent row by row** to isolate the bad write. That row is parked `FAILED` ("needs attention") and the rest sync. |
| Workout gone | `no_active_workout` on a set | Finished or discarded on another device. That workout's rows are dropped and the local row cleared. |
| Conflict | `409 workout_already_active` on start | `Conflict(remote)`. A dialog asks: keep the other device's workout (`adoptRemote`) or replace it (`discardRemoteAndRetry`). Nothing is dropped while the lifter decides. |
| Start refused | `day_not_found` after a program edit | `Blocked(code)`. The queue **stalls on purpose**: draining on would 404 every set and lose the session. |
| Unknown 4xx | | The row is parked `FAILED` and the drain continues, so one bad row can't hold the finish hostage. |

### Background execution

* **Process death mid-workout.** Everything durable is in Room, including the rest deadline as an
  absolute wall-clock time. On relaunch the card resumes mid-countdown.
* **Screen off between sets.** `WorkoutSessionService` (foreground, type `specialUse`) runs only
  while a workout is live. It plays the 3-2-1 countdown ticks and the "rest over" pattern, and shows an
  ongoing `VISIBILITY_PUBLIC` notification with a count-down chronometer, a progress bar, and
  **−15s / +30s / Skip** actions. The lifter never unlocks the phone between sets.
* **Sync with the app killed.** `OutboxWorker` is unique (`APPEND_OR_REPLACE`) and expedited, so
  it runs as soon as the network constraint is met. `getForegroundInfo` is implemented for API < 31.
  The drain is mutex-guarded, so the in-app trigger and the worker never interleave.
* **Phone app took over.** On launch with an empty outbox, `reconcileWithServer()` adopts whatever
  `GET /workout/current` says is live, or clears a stale local row. Per the docs we never poll
  `current` more often than every 10 s. In practice we read it on launch and after errors only.

## Analytics without a per-exercise endpoint

The API has no per-exercise history endpoint. `GET /exercise-data` returns customizations only,
such as a stored `rm1`. So LiftoDroid pulls up to 5 × 200 records from `GET /history`, parses the
**Liftohistory** text on-device (`domain/Liftohistory.kt`), and computes:

* **e1RM per session**: Epley, best set of the day, sets above 12 reps excluded as noise
* **Volume per session**: Σ weight × reps, converted to the user's unit (`GET /settings`)
* **Rep PRs**: heaviest weight completed for each rep count
* **Live PR detection**: the instant a set is logged, before any server round-trip (gold glow and PR haptic)

Bodyweight comes from `GET /measurements/weight`. All of these are cached for offline viewing.

## Security & privacy

* The API key is encrypted at rest with AES-256-GCM using a non-exportable Keystore key, and `allowBackup="false"`.
* `X-Liftosaur-Device-Id` is a random UUID per installation, never a hardware id.
* There is no analytics SDK. The only host contacted is `www.liftosaur.com`.
