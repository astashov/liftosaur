# Apple Watch Implementation Plan

## Overview

**Status: Complete - Production Ready**

An autonomous Apple Watch app for Liftosaur that can complete workouts independently, execute Liftoscript progression logic, and sync with phone/server using the existing VersionTracker infrastructure.

The core workflow is fully functional with comprehensive features: workout logging, AMRAP/RPE support, unilateral exercises, Apple Health integration, rest timers, and optimized sync. The watch app is production-ready.

## Architecture

### Core Decision: JavaScript on Watch via QuickJS

**Important:** JavaScriptCore is NOT available on watchOS. We use **QuickJS** instead - a lightweight embeddable JavaScript engine.

We created a custom Swift package (`QuickJSCore`) that wraps the QuickJS C library, allowing us to run the same TypeScript/JavaScript code on the watch.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Apple Watch App                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌─────────────────────────────────┐  │
│  │   Swift UI       │      │  QuickJS (via QuickJSCore)      │  │
│  │   - HomeView     │ ←──► │  - getNextWorkout()             │  │
│  │   - WorkoutCard  │      │  - hasProgram()                 │  │
│  │   - Exercise List│      │  - prepareSync()                │  │
│  │   - Set Logger   │      │  - mergeStorage()               │  │
│  └──────────────────┘      └─────────────────────────────────┘  │
│           │                              │                       │
│           ▼                              ▼                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Local Storage (File-based)                   │   │
│  │  - liftosaur_storage.json (Documents directory)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │   Phone     │  ← WatchConnectivity (updateApplicationContext)
    └─────────────┘
```

### QuickJS Considerations

- **Stack Size:** Default QuickJS stack is too small for our bundle. Set to 4MB via `JS_SetMaxStackSize()`.
- **Synchronous Only:** QuickJS supports Promises, but handling them from Swift is complex. All watch bundle functions are synchronous.
- **Bundle Size:** ~2.6MB minified (larger than estimated due to io-ts validation).
- **Bundle Distribution:** Downloaded from server (`https://www.liftosaur.com/watch-bundle.js`) and cached locally by `WatchCacheManager`. Not bundled in the app binary.

### Memory Budget

- watchOS app limit: ~30MB (varies by model)
- JS bundle: ~2.6MB minified (includes io-ts validation)
- QuickJS runtime overhead: ~5-10MB (with 4MB stack)
- Workout data: ~100-200KB (after source-side filtering, down from ~2-5MB)
- **Total estimate: ~15-20MB** - within budget

Note: Storage filtering at source (phone/server) significantly reduced workout data size. See `rfcs/watch-storage-performance.md`.

## Data Sync Strategy

### Using Existing VersionTracker

The watch becomes another device in the distributed sync system:

```typescript
// Each device has unique ID for vector clocks
const watchDeviceId = "watch-" + UUID;

// Vector clock example after concurrent edits:
{
  vc: { "phone-abc": 5, "watch-xyz": 3 },
  t: 1702847000
}
```

### Sync Flow

```
1. Start Workout
   ├─► Fetch latest state from server (if online)
   └─► Fall back to local lastSyncedStorage (if offline)

2. During Workout (on each set completion)
   ├─► Update local currentStorage
   ├─► Update currentStorage._versions via updateVersions()
   ├─► Execute Liftoscript finish day script if workout complete
   └─► Queue sync (debounced)

3. Sync (when connectivity available)
   ├─► versionsDiff = diffVersions(lastSyncedStorage._versions, currentStorage._versions)
   ├─► storageDiff = extractByVersions(currentStorage, versionsDiff)
   ├─► POST { versions: versionsDiff, storage: storageDiff } to server
   ├─► Handle response:
   │   ├─► "clean": Update lastSyncedStorage = currentStorage
   │   └─► "dirty": mergeStorage(currentStorage, serverStorage)
   └─► Optionally notify phone via WatchConnectivity
```

### Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Watch logs sets, phone edits program structure | Vector clocks merge both changes (orthogonal) |
| Watch and phone both edit same field | Later timestamp wins (or concurrent → incoming wins) |
| Watch completes workout offline, phone starts new workout | Server merges both history records (different IDs) |

## JS Bundle for Watch

### Entry Point

Located at `src/watch/index.ts`. Exports 28+ functions organized by category:

```typescript
// All functions must be SYNCHRONOUS (QuickJS Promise handling is complex)

// Workout Management
startWorkout(storageJson: string): string
finishWorkout(storageJson: string): string
finishWorkoutContinue(storageJson: string): string  // For Apple Health integration
discardWorkout(storageJson: string): string
getProgress(storageJson: string): string

// Set Operations
completeSet(storageJson: string, entryIndex: number, setIndex: number): string
updateSetReps(storageJson: string, entryIndex: number, setIndex: number, reps: number): string
updateSetRepsLeft(storageJson: string, entryIndex: number, setIndex: number, reps: number): string
updateSetWeight(storageJson: string, entryIndex: number, setIndex: number, weight: number): string
getNextEntryAndSetIndex(storageJson: string): string
getValidWeights(storageJson: string, exerciseId: string, equipmentId: string): string

// AMRAP/RPE Modal
getAmrapModal(storageJson: string): string
completeSetWithAmrap(storageJson: string, entryIndex: number, setIndex: number, updates: object): string

// Rest Timer
getRestTimer(storageJson: string): string
adjustRestTimer(storageJson: string, delta: number): string
stopRestTimer(storageJson: string): string

// Workout Status
getWorkoutStatus(storageJson: string): string
pauseWorkout(storageJson: string): string
resumeWorkout(storageJson: string): string

// History & Summary
getNextHistoryRecord(storageJson: string): string
getFinishWorkoutSummary(storageJson: string): string

// Sync Operations
prepareSync(current: string, lastSynced: string, deviceId: string): string
mergeStorage(current: string, incoming: string, deviceId: string): string
invalidateStorageCache(): void

// Utility
hasProgram(storageJson: string): string
hasSubscription(storageJson: string): string
getVolume(storageJson: string): string
getHealthSettings(storageJson: string): string
getLatestMigrationVersion(): string

// Expose to global scope for QuickJS
globalThis.Liftosaur = { /* all above functions */ };
```

**Performance Optimizations in Bundle:**
- Storage caching with version tracking (avoids re-parsing)
- Single-session validation (io-ts validates once, then trusts cache)
- Program evaluation caching with plannerText key matching
- Performance logging for all major operations

### Build Configuration

Uses webpack (configured in `webpack.config.js` with a second entry for watch):

```javascript
// Second webpack config for watch bundle
{
  entry: { main: "./src/watch/index.ts" },
  output: {
    filename: "watch-bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  // ... standard webpack config
}
```

### Actual Bundle Size

| Component | Notes |
|-----------|-------|
| io-ts validation | Large - includes full type validation |
| Program/Exercise models | Workout calculation logic |
| Storage validation | Schema validation |
| **Total** | **~2.6MB minified** |

Note: Bundle is larger than originally estimated because we use `Storage.validateStorage()` which pulls in io-ts. Future optimization could create a lighter validation path for watch.

### Bundle Distribution

The watch bundle is **not** included in the app binary. Instead:

1. **Server hosting**: Bundle is deployed to `https://www.liftosaur.com/watch-bundle.js`
2. **On-demand download**: `WatchCacheManager` fetches the bundle on first launch
3. **Local caching**: Cached to iOS Documents directory at `watchCache/watch-bundle.js`
4. **Background updates**: After engine initialization, checks for bundle updates in background
5. **Validation**: Rejects HTML error pages and files <1000 bytes

This approach enables:
- Faster iteration without App Store review cycles
- Smaller app binary size
- Automatic bundle updates when users launch the app

## Swift ↔ JavaScript Bridge

### QuickJSCore Package

Custom Swift package at `Packages/QuickJSCore/` wrapping QuickJS C library:

```swift
// QJSRuntime.swift
public class QJSRuntime {
    let runtime: OpaquePointer

    public init?(stackSizeMB: Int = 4) {  // 4MB stack required for our bundle
        guard let rt = JS_NewRuntime() else { return nil }
        self.runtime = rt
        JS_SetMaxStackSize(rt, stackSizeMB * 1024 * 1024)
    }

    public func createContext() -> QJSContext? { ... }
}

// QJSContext.swift
public class QJSContext {
    public func eval(_ script: String) -> QJSValue { ... }
}

// QJSValue.swift
public class QJSValue {
    public var isException: Bool { ... }
    public var string: String? { ... }  // Also prints exception details
}
```

### LiftosaurEngine

```swift
class LiftosaurEngine {
    private let runtime: QJSRuntime
    private var context: QJSContext?
    private let jsQueue = DispatchQueue(label: "com.liftosaur.watch.jsengine")

    init?(jsCode: String) {  // Bundle loaded by WorkoutManager via WatchCacheManager
        guard let runtime = QJSRuntime() else { return nil }
        self.runtime = runtime
        guard let context = runtime.createContext() else { return nil }
        self.context = context

        let result = context.eval(jsCode)
        if result.isException {
            return nil
        }

        // Verify Liftosaur is defined
        let check = context.eval("typeof Liftosaur")
        if check.string == "undefined" {
            return nil
        }
    }

    func getNextWorkout(storageJson: String) -> Result<WatchWorkout, EngineError> {
        let escaped = escapeForJS(storageJson)
        let script = "Liftosaur.getNextWorkout('\(escaped)')"

        guard let resultString = context?.eval(script).string,
              let data = resultString.data(using: .utf8) else {
            return .failure(.evalFailed)
        }

        // Check for error response
        if let error = try? JSONDecoder().decode(WatchError.self, from: data) {
            return .failure(.jsError(error.error))
        }

        // Decode workout
        let workout = try JSONDecoder().decode(WatchWorkout.self, from: data)
        return .success(workout)
    }

    private func escapeForJS(_ string: String) -> String {
        string
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
    }
}
```

### Data Serialization

All data passes between Swift and JS as JSON:

```swift
struct WorkoutState: Codable {
    let programId: String
    let day: Int
    let entries: [ExerciseEntry]
    let state: [String: AnyCodable]  // IProgramState
}

struct ExerciseEntry: Codable {
    let index: Int
    let visibleSets: [VisibleSet]
    // ...
}
```

## Watch App Features

### MVP Scope ✅ ALL COMPLETE

1. **Start Workout**
   - Fetch current program day from storage
   - Display exercise list with sets
   - Home screen with workout preview and exercise thumbnails
   - Exercise image caching

2. **Log Sets**
   - Crown-controlled reps input (scroll to adjust)
   - Crown-controlled weight picker (valid plate increments only)
   - Checkmark button to complete set
   - Rest timer auto-triggered after set completion
   - AMRAP modal for reps/weight/RPE/custom variables
   - **Unilateral exercise support** (separate left/right rep tracking)

3. **Exercise Navigation**
   - Swipe vertically between exercises
   - Swipe horizontally between sets within an exercise
   - Crown rotation to navigate exercises
   - Visual completion status (dot indicators per set)
   - Auto-advance to next incomplete set
   - Discard workout option
   - **Pause/Resume workout** (accurate time tracking with intervals)

4. **Finish Workout**
   - Execute Liftoscript finish day script
   - Save to history
   - Comprehensive summary: time, volume, sets, reps
   - Exercise breakdown with completion status
   - Muscle group distribution
   - **Apple Health integration** (send workout to Health app via phone)
   - Personal records display (disabled - watch doesn't receive full history for performance)

5. **Offline Support**
   - Full workout completion without connectivity
   - Queue changes for later sync (pending updates queue)
   - Visual indicator of sync status
   - Direct server sync when authenticated (cellular watch support)

6. **Additional Features**
   - **Premium subscription gating** (checks hasSubscription)
   - **Heart rate monitoring** during workouts
   - **Haptic feedback** (crown rotation, button clicks)
   - **Sound volume control** for rest timer

### Future Scope

- Phone UI showing watch workout progress
- Superset support
- Workout notes
- Historical workout viewing
- Complications for next workout
- Re-enable PR display (pre-compute on phone/server)

## WatchConnectivity (Phone ↔ Watch)

### When to Use

| Use Case | Method | Notes |
|----------|--------|-------|
| Initial workout fetch | `transferUserInfo` | Queued, reliable |
| Real-time set updates | `sendMessage` | Only if phone reachable |
| Workout completion | `transferUserInfo` | Queued, reliable |
| Phone shows watch progress | Application context | Latest state only |

### Implementation

```swift
class WatchSyncManager: NSObject, WCSessionDelegate {
    func sendWorkoutUpdate(_ update: WorkoutUpdate) {
        let data = try! JSONEncoder().encode(update)

        if WCSession.default.isReachable {
            // Phone is active - send immediately
            WCSession.default.sendMessage(["workout": data], replyHandler: nil)
        }

        // Always queue for guaranteed delivery
        WCSession.default.transferUserInfo(["workoutUpdate": data])
    }
}
```

### Phone Handling

Phone receives watch updates and:
1. Merges into local storage via `mergeStorage()`
2. Updates UI if workout screen is open
3. Syncs to server on next sync cycle

## Server API

### Endpoint

The watch uses `/api/sync2` endpoint with Bearer token authentication:

```typescript
POST /api/sync2
Authorization: Bearer <jwt_token>

{
  deviceId: string,  // "watch-xyz"
  timestamp: number,
  storageUpdate: {
    version: string,      // Migration version like "20240720152051_fix_null_entries"
    originalId?: number,  // For fast-path consecutive updates check
    versions?: IVersions<IStorage>,
    storage?: Partial<IStorage>
  }
}

Response:
| { type: "clean" }
| { type: "dirty", storage: IStorage }
| { type: "error", error: string }
```

### Watch-Specific Implementation

- **Authentication**: Bearer token transferred from phone via WatchConnectivity
- **Uncompressed payloads**: Server accepts both compressed (with `data` field) and uncompressed JSON
- **Version matching**: Watch sends correct migration version via `getLatestMigrationVersion()` from JS bundle
- **originalId**: Included for fast-path check on consecutive updates from same device
- **Fallback**: If server unreachable, changes queued locally and synced when connectivity restored

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Create watch-bundle build pipeline (webpack)
- [x] Create QuickJSCore Swift package (JavaScriptCore not available on watchOS)
- [x] Create basic Swift ↔ JS bridge (LiftosaurEngine)
- [x] Set up watch app project structure
- [x] WatchConnectivity for phone → watch storage sync

### Phase 2: Core Workout ✅ COMPLETE
- [x] Implement workout state storage (file-based via WatchStorageManager)
- [x] Build home view with workout preview
- [x] Build exercise list UI (WorkoutExercisesScreen with swipeable cards)
- [x] Build set logging UI (ExerciseScreen with crown-controlled reps/weight inputs)
- [x] Implement rest timer (RestTimerScreen with +/-15s adjustments)
- [x] Execute Liftoscript on set/workout completion (completeSet, finishWorkout)
- [x] AMRAP modal with reps/weight/RPE/custom variables (AmrapModalView)
- [x] Finish workout summary screen (FinishWorkoutScreen with PRs, volume, muscle breakdown)

### Phase 3: Sync ✅ COMPLETE
- [x] Implement VersionTracker in watch bundle (prepareSync/mergeStorage via JS engine)
- [x] Server sync (watch ↔ server direct) - fetchStorageFromServer(), syncViaServer()
- [x] Offline queue and retry logic (pending updates queue)
- [x] Sync status indicator (syncStatus @Published property)

### Phase 4: Phone Integration ✅ COMPLETE
- [x] WatchConnectivity setup (basic)
- [x] Phone ↔ watch real-time sync (bidirectional)
- [x] Initial setup flow (auth token transfer)
- [ ] Phone UI showing watch workout progress (moved to Future Scope)

### Phase 5: Polish ✅ MOSTLY COMPLETE
- [x] Haptic feedback (crown rotation, button clicks)
- [x] Basic error handling with user-visible messages
- [x] Memory optimization (storage filtering at source - see `rfcs/watch-storage-performance.md`)
  - [x] Phone-side filtering in WatchConnectivityManager.swift
  - [x] Server-side filtering in lambda/index.ts (filterStorageForWatch)
  - [x] Single-session validation in watch bundle
  - [x] Storage caching with version tracking
- [x] Sound volume control
- [x] Heart rate monitoring
- [x] Premium subscription gating
- [x] Apple Health integration (send workouts to Health)
- [x] Unilateral exercise support
- [x] Pause/Resume workout with accurate time tracking
- [ ] Complications
- [ ] Advanced error recovery (storage corruption, network edge cases)

## Open Questions

1. **Auth flow**: ✅ RESOLVED - Token transferred from phone via WatchConnectivity. Phone sends auth on:
   - WCSession activation
   - Reachability change (phone app comes to foreground)
   - Web app login/logout (via `authChanged` postMessage → iOS → watch)
   - Watch also requests auth when phone becomes reachable
   - `clearAuth` message sent when user logs out on phone

2. **Program updates**: ✅ RESOLVED - If user edits program on phone mid-workout, vector clocks handle merging. Changes are orthogonal (workout progress vs program structure) and merge cleanly.

3. **Which storage fields on watch?**: ✅ RESOLVED - Filtered IStorage for performance. Phone and server filter to only: current program, empty history, empty stats. See `rfcs/watch-storage-performance.md`.

4. **Cellular watch support**: ✅ RESOLVED - Yes! Watch syncs directly with server using Bearer token auth when authenticated. Works independently of phone connectivity.

5. **Large account performance**: ✅ RESOLVED - Source-side filtering reduces storage from ~2-5MB to ~100-200KB. Single-session validation eliminates 18+ second io-ts overhead. See `rfcs/watch-storage-performance.md`.

## File Structure

```
LiftosauriOS/
├── Packages/
│   └── QuickJSCore/                    // Custom Swift package for QuickJS
│       ├── Package.swift
│       └── Sources/
│           ├── QuickJSC/               // C library (QuickJS source)
│           │   ├── include/
│           │   │   ├── quickjs.h
│           │   │   └── QuickJSC.h
│           │   └── *.c
│           └── QuickJSCore/            // Swift wrapper
│               ├── JSRuntime.swift
│               ├── JSContext.swift
│               └── JSValue.swift
│
└── src/
    ├── Liftosaur/                      // iOS app
    │   ├── WatchConnectivityManager.swift  // Sends filtered storage to watch
    │   └── ...
    │
    └── LiftosaurWatch/                 // Watch app
        ├── LiftosaurWatchApp.swift
        ├── ContentView.swift
        ├── WatchLayout.swift           // Layout utilities
        ├── Views/
        │   ├── HomeScreen.swift        // Workout preview with start button
        │   ├── WorkoutExercisesScreen.swift  // Exercise list with swipeable cards
        │   ├── ExerciseScreen.swift    // Main workout UI (~60KB - crown & set logging)
        │   ├── WorkoutCardView.swift   // Exercise card component
        │   ├── AmrapModalView.swift    // AMRAP/RPE/custom variable input
        │   ├── RestTimerScreen.swift   // Rest timer with adjustments
        │   ├── FinishWorkoutScreen.swift  // Summary with volume, muscles
        │   ├── ScrollableInputFields.swift  // Reusable crown-controlled inputs
        │   ├── HeartRateView.swift     // Heart rate display during workout
        │   └── PremiumRequiredScreen.swift  // Premium subscription gate
        ├── Models/
        │   └── WatchModels.swift       // WatchWorkout, WatchExercise, WatchSet
        └── Engine/
            ├── LiftosaurEngine.swift   // QuickJS wrapper (~14KB)
            ├── WorkoutManager.swift    // Workout state & orchestration (~25KB)
            ├── WatchCacheManager.swift // Bundle download & caching from server
            ├── WatchStorageManager.swift  // File-based persistence (>1MB limit on watchOS)
            ├── WatchConnectivityManager.swift  // Receives storage/auth from phone
            ├── WatchSyncManager.swift  // Server sync, pending updates queue (~23KB)
            ├── AuthManager.swift       // JWT token storage and validation
            ├── HealthKitManager.swift  // Apple Health integration (~14KB)
            └── ImageCacheManager.swift // Exercise image caching

liftosaur/                              // Main web project
├── src/
│   └── watch/
│       └── index.ts                    // Watch bundle entry point (28+ functions)
├── lambda/
│   └── index.ts                        // Contains filterStorageForWatch() for server-side optimization
└── rfcs/
    └── watch-storage-performance.md    // Detailed RFC for storage performance optimization
```

## Bootstrap Sequence

1. **App Launch**: `LiftosaurWatchApp` initializes, requests HealthKit authorization
2. **ContentView**: Shows loading spinner while engine initializes
3. **WorkoutManager.initialize()**:
   - Check if `watch-bundle.js` cached locally via `WatchCacheManager`
   - If not found, fetch from `https://www.liftosaur.com/watch-bundle.js`
   - Create `LiftosaurEngine` (loads bundle into QuickJS)
   - Process pending incoming storage (if arrived before engine ready)
   - Check subscription status
   - Load active workout from storage
   - Load next workout preview
   - Background: Fetch bundle updates, sync with server
4. **UI Ready**: Show HomeScreen or PremiumRequiredScreen based on subscription

## References

- [WatchConnectivity Framework](https://developer.apple.com/documentation/watchconnectivity)
- [QuickJS JavaScript Engine](https://bellard.org/quickjs/) - Used instead of JavaScriptCore (not available on watchOS)
- [Liftoscript Documentation](/llms/liftoscript.md)
- [VersionTracker Implementation](/src/models/versionTracker.ts)
- [Watch Storage Performance RFC](/rfcs/watch-storage-performance.md) - Detailed analysis of storage filtering optimization

## Lessons Learned

1. **JavaScriptCore is NOT available on watchOS** - Despite being a system framework on iOS/macOS, it's not included in watchOS. QuickJS is a viable alternative.

2. **QuickJS stack size matters** - Default stack is too small for large bundles. Use `JS_SetMaxStackSize()` with 4MB+ for complex bundles.

3. **Keep JS functions synchronous** - While QuickJS supports Promises, handling them from Swift requires running the event loop. Synchronous functions are much simpler.

4. **Storage format wrapper** - iOS app sends `{"storage": {...}, "progress": {...}}` but watch needs just the inner storage. Extract on the watch side.

5. **WatchConnectivity reliability** - Use multiple methods (`updateApplicationContext` + `transferUserInfo`) for reliable delivery. Check `receivedApplicationContext` after activation, not during init.

6. **isReachable is transient** - `WCSession.isReachable` only returns true when the paired iOS app is in the foreground. Use computed property checking live value, not cached @Published property.

7. **Auth sync timing** - Don't request auth/storage in `session(_:activationDidCompleteWith:)` - WCSession may not be fully ready. Use `sessionReachabilityDidChange` callback instead.

8. **3-way sync architecture** - Watch syncs to both phone (via WatchConnectivity) and server (direct HTTP). Always sync to server when authenticated; phone sync is secondary. This ensures data safety even with poor gym connectivity.

9. **Migration version required** - Server sync requires correct migration version string (not just `1`). Use `getLatestMigrationVersion()` from JS bundle to get the proper version.

10. **Crown gesture complexity** - Crown interactions require careful state management. Use focus modifiers to track which field is selected, and debounce rapid crown rotations to prevent UI lag.

11. **Weight picker needs valid increments** - Don't allow arbitrary weights. Use `getValidWeights()` to generate plate-compatible options based on user's equipment settings.

12. **AMRAP modal flexibility** - AMRAP modal needs to handle multiple input types: reps, weight, RPE, and custom user-prompted state variables. Design it as a dynamic form builder.

13. **Workout pause/resume** - Track workout time via intervals array `[[start, end], [start, end], ...]` rather than a single timestamp, to properly calculate elapsed time with pauses.

14. **Source-side storage filtering** - For large accounts (700+ workouts), filter storage at the source (phone and server) rather than on watch. This eliminates ~95% of data and avoids expensive io-ts validation. See `rfcs/watch-storage-performance.md` for detailed analysis.

15. **Single-session validation** - Validate storage once per session, then trust the cache. Use `hasValidatedOnceThisSession` flag to skip io-ts on subsequent operations.

16. **PR display trade-off** - Personal records require full workout history. For performance, disable PR display on watch and return empty arrays. Future: pre-compute PRs on phone/server.

17. **VersionTracker with filtered data** - VersionTracker works correctly with filtered data as long as both `storage` AND `_versions` are filtered together. It iterates data arrays, not version entries, so empty arrays don't cause spurious deletions.

18. **Apple Health integration** - Watch can't write directly to HealthKit during workout (mirrored session from phone). Use `finishWorkoutContinue()` to send workout data to phone, which handles the actual HealthKit write.

19. **Unilateral exercises** - Track `completedRepsLeft` separately from `completedReps`. Use `isUnilateral` flag to show two input fields in exercise screen.

20. **Bundle distribution via server** - Don't bundle watch-bundle.js in the app binary. Host on server and download/cache locally via `WatchCacheManager`. Benefits: faster iteration without App Store review, automatic updates, smaller app binary. Validate downloaded content to reject HTML error pages.

21. **File-based storage on watchOS** - UserDefaults has a ~1MB limit on watchOS. Use file-based storage (`WatchStorageManager`) for larger JSON storage data.

22. **Dedicated JS queue** - QuickJS is not thread-safe. Run all JS evaluations on a dedicated serial queue (`com.liftosaur.watch.jsengine`) to avoid concurrent access issues.

23. **Incoming storage deduplication** - Track `lastStorageReceivedFromPhone` to prevent duplicate merges when the same storage is received multiple times via WatchConnectivity.
