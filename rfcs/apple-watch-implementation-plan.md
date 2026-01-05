# Apple Watch Implementation Plan

## Overview

Build an autonomous Apple Watch app for Liftosaur that can complete workouts independently, execute Liftoscript progression logic, and sync with phone/server using the existing VersionTracker infrastructure.

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
│  │              Local Storage (UserDefaults)                 │   │
│  │  - liftosaur_storage (JSON string)                        │   │
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
- **Bundle Size:** ~1MB minified (larger than estimated due to io-ts validation).

### Memory Budget

- watchOS app limit: ~30MB (varies by model)
- JS bundle: ~1MB minified (includes io-ts validation)
- QuickJS runtime overhead: ~5-10MB (with 4MB stack)
- Workout data: ~1-2MB
- **Total estimate: ~15-20MB** - within budget

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

Located at `src/watch/index.ts`:

```typescript
import { Program } from "../models/program";
import { Exercise } from "../models/exercise";
import { Storage } from "../models/storage";
import { Sync } from "../utils/sync";

// All functions must be SYNCHRONOUS (QuickJS Promise handling is complex)

export function getNextWorkout(storageJson: string): string {
  const data = JSON.parse(storageJson);
  const result = Storage.validateStorage(data);  // Skip async migrations
  if (!result.success) {
    return JSON.stringify({ error: result.error.join(", ") });
  }
  // ... build workout from program
  return JSON.stringify(watchWorkout);
}

export function hasProgram(storageJson: string): string { ... }
export function prepareSync(current: string, lastSynced: string, deviceId: string): string { ... }
export function mergeStorage(current: string, incoming: string, deviceId: string): string { ... }

// Expose to global scope for QuickJS
declare const globalThis: Record<string, unknown>;
globalThis.Liftosaur = { getNextWorkout, hasProgram, prepareSync, mergeStorage };
```

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
| **Total** | **~1MB minified** |

Note: Bundle is larger than originally estimated because we use `Storage.validateStorage()` which pulls in io-ts. Future optimization could create a lighter validation path for watch.

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

    init?() {
        guard let runtime = QJSRuntime() else { return nil }
        self.runtime = runtime
        guard let context = runtime.createContext() else { return nil }
        self.context = context

        // Load bundled JS
        guard let jsCode = WatchCacheManager.shared.loadBundle() else {
            return nil
        }

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

### MVP Scope

1. **Start Workout**
   - Fetch current program day from storage
   - Display exercise list with sets

2. **Log Sets**
   - Tap to complete set (uses programmed reps)
   - Long press to enter actual reps
   - Weight display (from program)
   - Rest timer after set completion

3. **Exercise Navigation**
   - Swipe between exercises
   - See completion status
   - Skip exercise option

4. **Finish Workout**
   - Execute Liftoscript finish day script
   - Save to history
   - Sync to server

5. **Offline Support**
   - Full workout completion without connectivity
   - Queue changes for later sync
   - Visual indicator of sync status

### Future Scope

- Edit weights mid-workout
- Superset support
- Workout notes
- Historical workout viewing
- Complications for next workout

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

### Existing Endpoint

The watch uses the same `/api/sync` endpoint as the phone:

```typescript
POST /api/sync
{
  tempUserId: string,
  deviceId: string,  // "watch-xyz"
  storageUpdate: {
    version: number,
    originalId?: number,
    versions?: IVersions<IStorage>,
    storage?: Partial<IStorage>
  }
}

Response:
| { type: "clean", new_original_id: number, key: string, email: string, user_id: string }
| { type: "dirty", storage: IStorage, key: string, email: string, user_id: string }
| { type: "error", error: string, key: string }
```

### Watch-Specific Considerations

- Watch may have limited connectivity - server should handle partial/resumed syncs
- Authentication: Watch needs access to user's auth token (transferred from phone during setup)

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Create watch-bundle build pipeline (webpack)
- [x] Create QuickJSCore Swift package (JavaScriptCore not available on watchOS)
- [x] Create basic Swift ↔ JS bridge (LiftosaurEngine)
- [x] Set up watch app project structure
- [x] WatchConnectivity for phone → watch storage sync

### Phase 2: Core Workout (IN PROGRESS)
- [x] Implement workout state storage (UserDefaults)
- [x] Build home view with workout preview
- [ ] Build exercise list UI
- [ ] Build set logging UI
- [ ] Implement rest timer
- [ ] Execute Liftoscript on set/workout completion

### Phase 3: Sync
- [ ] Implement VersionTracker in watch bundle
- [ ] Server sync (watch ↔ server direct)
- [ ] Offline queue and retry logic
- [ ] Sync status indicator

### Phase 4: Phone Integration
- [x] WatchConnectivity setup (basic)
- [ ] Phone ↔ watch real-time sync (bidirectional)
- [ ] Phone UI showing watch workout progress
- [ ] Initial setup flow (auth token transfer)

### Phase 5: Polish
- [ ] Error handling and recovery
- [ ] Memory optimization
- [ ] Battery optimization
- [ ] Complications
- [ ] Haptic feedback

## Open Questions

1. **Auth flow**: How does watch get authenticated? Transfer token from phone during initial setup?

2. **Program updates**: If user edits program on phone mid-workout, how to handle on watch?
   - Option A: Lock phone editing during watch workout
   - Option B: Merge changes (may cause confusion)

3. **Which storage fields on watch?**: Full IStorage or minimal subset?
   - Minimal: current program, current workout, settings subset
   - Full: easier sync but more memory

4. **Cellular watch support**: Direct server sync when phone not nearby?

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
    │   ├── WatchConnectivityManager.swift  // Sends storage to watch
    │   └── ...
    │
    └── LiftosaurWatch/                 // Watch app
        ├── LiftosaurWatchApp.swift
        ├── ContentView.swift
        ├── LiftosaurColor.swift
        ├── watch-bundle.js             // Built JS bundle (copied from liftosaur/dist)
        ├── Views/
        │   ├── HomeView.swift
        │   └── WorkoutCardView.swift
        ├── Models/
        │   └── WatchModels.swift       // WatchWorkout, WatchExercise, WatchSet
        └── Engine/
            ├── LiftosaurEngine.swift   // QuickJS wrapper
            ├── WorkoutManager.swift    // Workout state
            ├── WatchCacheManager.swift // Bundle loading
            └── WatchConnectivityManager.swift  // Receives storage from phone

liftosaur/                              // Main web project
└── src/
    └── watch/
        └── index.ts                    // Watch bundle entry point
```

## References

- [WatchConnectivity Framework](https://developer.apple.com/documentation/watchconnectivity)
- [QuickJS JavaScript Engine](https://bellard.org/quickjs/) - Used instead of JavaScriptCore (not available on watchOS)
- [Liftoscript Documentation](/llms/liftoscript.md)
- [VersionTracker Implementation](/src/models/versionTracker.ts)

## Lessons Learned

1. **JavaScriptCore is NOT available on watchOS** - Despite being a system framework on iOS/macOS, it's not included in watchOS. QuickJS is a viable alternative.

2. **QuickJS stack size matters** - Default stack is too small for large bundles. Use `JS_SetMaxStackSize()` with 4MB+ for complex bundles.

3. **Keep JS functions synchronous** - While QuickJS supports Promises, handling them from Swift requires running the event loop. Synchronous functions are much simpler.

4. **Storage format wrapper** - iOS app sends `{"storage": {...}, "progress": {...}}` but watch needs just the inner storage. Extract on the watch side.

5. **WatchConnectivity reliability** - Use multiple methods (`updateApplicationContext` + `transferUserInfo`) for reliable delivery. Check `receivedApplicationContext` after activation, not during init.
