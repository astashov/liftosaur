# 3 · API integration & repository layer

Base URL `https://www.liftosaur.com/api/v1`. The contract below was taken from the published
[API docs](https://www.liftosaur.com/doc/api). Field names in `data/remote/Dtos.kt` match them 1:1.

## Headers

Every request is authenticated, and every write carries the two identity headers the API requires.
A write missing either returns `400 invalid_input`. A Ktor client plugin
(`LiftosaurApi` → `createClientPlugin("LiftosaurHeaders")`) adds them, so no call site can forget:

```
Authorization:          Bearer lftsk_…                 (all requests)
X-Liftosaur-Device-Id:  <random UUID, per install>     (POST / PUT / DELETE)
X-Liftosaur-Client:     LiftoDroid/1.0.0               (POST / PUT / DELETE)
```

`WorkoutRepositoryTest.every write carries auth, device id and client headers` asserts this.

## Endpoints used

| Use | Endpoint | Notes |
|---|---|---|
| Up Next preview | `GET /workout/next` | Cached for offline start |
| Start | `POST /workout/start {programId, week, dayInWeek, startTime}` | `startTime` is chosen on the device and becomes the history id |
| Resume / reconcile | `GET /workout/current` | On launch and after set errors. Never polled faster than every 10 s. |
| Log one set | `POST /workout/set {setId, entryId, completed}` | `completed: null` un-completes |
| Append a set | `POST /workout/set {…, append: true}` | Client `setId` = six lowercase letters, so a replay is a no-op |
| Drain the queue | `POST /workout/sets {sets:[…]}` | Applied in order, in one transaction |
| Finish | `POST /workout/finish {startTime, endTime, notes, intervals?}` | Server runs progression and advances the day. Idempotent. |
| Discard | `DELETE /workout/current {startTime}` | |
| History | `GET /history?limit=200&cursor=…` | Liftohistory text, parsed on-device |
| Bodyweight | `GET /measurements/weight` | |
| Gyms | `GET /gyms`, `PUT /gyms/:id {setCurrent:true}` | |
| Plates for edited weights | `GET /gyms/:gymId/equipment` | `bar`, `multiplier`, `plates`, `fixed` |
| Units | `GET /settings` | |

## Sequence: a normal set

```
Lifter      Card/VM              WorkoutRepository           Room                  API
  │ tap ✓     │                         │                      │                     │
  ├──────────▶│ haptic click            │                      │                     │
  │           ├── logSet(setId, done) ─▶│ txn: snapshot+row ──▶│                     │
  │           │◀───── Flow: set ✓, rest deadline ──────────────┤  (card → REST)      │
  │           │                         ├── drain() ──────────────── POST /workout/set ─▶│
  │           │                         │◀───────────────────────────── whole workout ───┤
  │           │                         ├── ack + rebase(server, still-queued) ─▶│       │
  │           │◀──── Flow: server truth (e.g. update-script rewrote next sets) ┤         │
```

## Sequence: basement gym, no signal at all

```
 t0  Start      snapshot(preview ids aaaaaa,bbbbbb…) + START row            UI: lifting
 t1  Set 1 ✓    + SET(aaaaaa)                                               UI: rest 3:00
 t2  Set 2 ✓    + SET(bbbbbb)          drain → Offline → Retry (WorkManager parks on CONNECTED)
 …
 t9  Finish     + FINISH(endTime = t9)                                      UI: Up Next "syncing"
 t10 Car park, LTE returns → OutboxWorker:
       POST /workout/start   → workout with ids xxxxxx,yyyyyy…  → remap aaaaaa→xxxxxx … in queued rows
       POST /workout/sets    [xxxxxx ✓, yyyyyy ✓]               → adopt
       POST /workout/finish  {startTime: t0, endTime: t9}       → progression runs, day advances
       GET  /workout/next    → refresh the cached preview for next session
```

`WorkoutRepositoryTest` covers this end to end with Ktor's `MockEngine`.

## Kotlin models (excerpt)

```kotlin
@Serializable
data class SetDto(
    val setId: String, val index: Int, val isWarmup: Boolean = false,
    val reps: Int? = null, val minReps: Int? = null, val isAmrap: Boolean = false,
    val weight: String? = null,            // "100kg": already rounded to the current gym
    val originalWeight: String? = null,    // "80%": display only
    val plates: List<PlateDto>? = null,
    val rpe: Double? = null, val logRpe: Boolean = false, val askWeight: Boolean = false,
    val isUnilateral: Boolean = false, val timer: Int? = null, val setTimer: Int? = null,
    val completed: CompletedSet? = null,
)

@Serializable
data class CompletedSet(
    val reps: Int? = null, val repsLeft: Int? = null, val weight: String? = null, val rpe: Double? = null,
    val setTimer: Int? = null, val setTimerLeft: Int? = null, val userVars: JsonObject? = null,
)

@Serializable
data class SetWrite(
    val setId: String,
    val entryId: String? = null,
    // Always encoded, even as null: `"completed": null` means "un-complete".
    @EncodeDefault(EncodeDefault.Mode.ALWAYS) val completed: JsonElement = JsonNull,
    val append: Boolean? = null,
)
```

**A bug the tests caught.** The first draft configured the Json with `explicitNulls = false` to
keep request bodies lean. That silently dropped `"completed": null`, so an **undo would never reach
the server**. The fix keeps `explicitNulls` on, relies on `encodeDefaults = false` to omit unset
fields, and forces `completed` with `@EncodeDefault(ALWAYS)`.
`WorkoutRepositoryTest.un-completing sends an explicit null` guards it.

## Repository surface

```kotlin
class WorkoutRepository(api, dao, cache, scheduler, now) {
    val active: Flow<ActiveWorkout?>          // snapshot + queued count + rewrite flags + rest deadline
    val syncState: StateFlow<DrainResult>     // Done | Retry | AuthRequired | Conflict(remote) | Blocked(code)
    val failedWrites: Flow<List<OutboxEntity>>

    suspend fun next(): WorkoutDto?                           // network → cache
    suspend fun start(preview: WorkoutDto): WorkoutDto        // instant; queues START
    suspend fun logSet(setId, entryId, completed, restSec)    // instant; queues SET; starts rest
    suspend fun uncomplete(setId, entryId)                    // queues completed:null
    suspend fun appendSet(entryId, completed, restSec): String
    suspend fun adjustRest(deltaSec) / skipRest()
    suspend fun finish(notes, intervals?)                     // endTime captured at the tap
    suspend fun discard()
    suspend fun adoptRemote(remote) / discardRemoteAndRetry(remote)   // conflict resolution
    suspend fun reconcileWithServer()
    suspend fun drain(): DrainResult                          // mutex-guarded; worker + in-app
}
```

The full implementation is in `app/src/main/java/app/liftodroid/data/WorkoutRepository.kt`. The pure
merge logic is in `WorkoutMerge.kt`.

## Error mapping

```kotlin
sealed class ApiException {
    class Http(status, code, message)   // parsed from {"error":{"code","message"}}
    class Offline(cause)                 // any transport failure
}
```

The drain policy is in [01-architecture.md § Failure taxonomy](01-architecture.md#failure-taxonomy).
