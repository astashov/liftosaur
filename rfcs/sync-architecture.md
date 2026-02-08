# Liftosaur Sync Architecture

## Overview

Liftosaur uses a distributed sync system with three main participants:
- **Phone/Web App** (primary client)
- **Apple Watch** (secondary client)
- **Server** (source of truth for logged-in users)

The system uses **VersionTracker** - a vector clock-based conflict resolution system that tracks changes at the field level.

## Table of Contents

1. [VersionTracker: The Core Algorithm](#1-versiontracker-the-core-algorithm)
2. [Phone/Web Sync Flow](#2-phoneweb-sync-flow)
3. [Watch Sync Flow](#3-watch-sync-flow)
4. [Phone ↔ Watch Communication](#4-phone--watch-communication)
5. [Server Sync Protocol](#5-server-sync-protocol)
6. [Live Activity Set Completion](#6-live-activity-set-completion)
7. [Storage Filtering](#7-storage-filtering)
8. [Race Conditions & Edge Cases](#8-race-conditions--edge-cases)
9. [Debugging Sync Issues](#9-debugging-sync-issues)

---

## 1. VersionTracker: The Core Algorithm

### 1.1 Version Types

Each field in storage has a version that can be:

```typescript
// Simple timestamp
1704067200000

// Vector clock with timestamp
{ vc: { "phone-abc": 5, "watch-xyz": 3 }, t: 1704067200000 }

// ID version (for controlled objects like programs)
{ vc: { "phone-abc": 1 }, t: 1704067200000, value: "program-123" }
```

### 1.2 Storage Structure

```typescript
interface IStorage {
  // Actual data
  programs: IProgram[];
  history: IHistoryRecord[];
  progress: IHistoryRecord[];  // In-progress workout(s)
  settings: ISettings;
  // ... other fields

  // Version tracking metadata
  _versions: {
    programs: { items: { [programId]: {...} }, deleted: {...} },
    history: { items: { [recordId]: {...} }, deleted: {...} },
    progress: { items: { [recordId]: {...} } },
    settings: { theme: timestamp, units: timestamp, ... },
    // ... mirrors data structure with timestamps
  }
}
```

### 1.3 Object Types

| Type | Behavior | Example |
|------|----------|---------|
| **Atomic** | Entire object versioned as unit | `history_record` - all fields sync together |
| **Controlled** | Only specific fields tracked | `program` - only `name`, `nextDay` tracked individually |
| **Regular** | Each field versioned independently | `settings` - theme, units, etc. each have own version |

### 1.4 Key Functions

| Function | Purpose | When Used |
|----------|---------|-----------|
| `updateVersions()` | Compare old/new data, update version tree | After local mutation |
| `diffVersions()` | Compare two version trees, return delta | Before sending to server |
| `extractByVersions()` | Extract only changed fields from data | Building sync payload |
| `fillVersions()` | Create initial version tree for all fields | First sync, or ensuring all fields have versions |
| `mergeByVersions()` | Three-way merge using timestamps | Receiving remote changes |
| `mergeVersions()` | Merge two version trees | After successful sync |

### 1.5 fillVersions Details

`fillVersions` is used to ensure all fields in a storage object have corresponding version entries:

```typescript
fillVersions(
  fullObj: T,           // The data object
  versions: IVersions,  // Existing (potentially sparse) versions
  timestamp: number     // Default timestamp for missing versions
): IVersions
```

**Use Cases:**
1. **First-time sync**: When a device syncs for the first time, it may not have complete version coverage
2. **After extractByVersions**: The extracted delta needs full version coverage before transmission
3. **Migration**: After storage migration, ensure new fields have versions

**Algorithm:**
```
For each field in fullObj:
  If version already exists → keep it
  Else:
    If field is array/dict collection:
      → Create item versions for all items recursively
    If controlled type:
      → Create ID version and controlled field versions
    Else:
      → Create field version at current timestamp

Return filled version tree
```

### 1.6 Conflict Resolution

When two devices modify the same field concurrently:

```
Phone: { vc: { phone: 1 }, t: 1000 }  → value: "A"
Watch: { vc: { watch: 1 }, t: 2000 }  → value: "B"

Comparison: Neither has seen the other (concurrent)
Resolution: Higher timestamp wins → "B" (watch) wins
```

When one device has seen the other's changes:

```
Phone: { vc: { phone: 2, watch: 1 }, t: 3000 }  → value: "C"
Watch: { vc: { watch: 1 }, t: 2000 }             → value: "B"

Comparison: Phone has higher watch counter (1 >= 1) AND higher phone counter (2 > 0)
Resolution: Phone dominates → "C" wins
```

---

## 2. Phone/Web Sync Flow

### 2.1 When Sync is Triggered

| Event | Trigger Point | File |
|-------|--------------|------|
| Storage mutation | `dispatch(UpdateState(...))` | `src/ducks/reducer.ts` |
| App comes to foreground | `visibilitychange` event | `src/components/app.tsx` |
| Network reconnect | `online` event | `src/components/app.tsx` |
| Manual pull | User action | Various screens |

### 2.2 Sync to Server Flow

```
1. Local Change
   ↓
2. updateVersions(oldStorage, newStorage, currentVersions, deviceId)
   → Returns new version tree with incremented vector clocks
   ↓
3. Save to IndexedDB: { storage, lastSyncedStorage, _versions }
   ↓
4. Debounced sync trigger (500ms)
   ↓
5. prepareSync():
   a. versionsDiff = diffVersions(lastSynced._versions, current._versions)
   b. storageDiff = extractByVersions(current, versionsDiff)
   c. filledVersions = fillVersions(storageDiff, versionsDiff, timestamp)
   d. Return { storage: storageDiff, versions: filledVersions, originalId }
   ↓
6. POST /api/sync2 with delta
   ↓
7. Handle response:
   - "clean": Server accepted, update lastSyncedStorage = currentStorage
   - "dirty": Server has newer data, merge into current
```

### 2.3 Receiving Server Updates

```typescript
// In Thunk.handleServerSync()
const mergedStorage = Storage.mergeStorage(currentStorage, serverStorage, deviceId);
// mergeStorage internally calls:
// - versionTracker.mergeVersions(current._versions, server._versions)
// - versionTracker.mergeByVersions(current, current._versions, server._versions, server)
```

---

## 3. Watch Sync Flow

### 3.1 Watch Has Two Sync Channels

1. **Phone (via WatchConnectivity)** - Real-time, reliable
2. **Server (via HTTPS)** - Direct, independent of phone

### 3.2 Local Change on Watch

```
User completes set
  ↓
WorkoutManager.completeSet(entryIndex, setIndex)
  ↓
withStorageMutation():
  - engine.completeSet() → JS mutation on jsQueue
  - Returns new storageJson
  - storage.saveString(newStorageJson)
  ↓
WatchSyncManager.recordLocalChange(newStorage)
  - currentStorage = newStorage
  - syncStatus = .pending
  ↓
attemptSync():
  ├─ notifyPhone() → WatchConnectivity
  └─ (if authenticated) syncViaServer()
```

### 3.3 Sync to Server (Watch)

```swift
// WatchSyncManager.syncViaServer()
func syncViaServer() async {
    // 1. Snapshot current state
    let snapshotStorage = currentStorage
    let lastSynced = lastSyncedStorage

    // 2. Compute delta
    let updateJson = await engine.prepareSync(
        currentStorageJson: snapshotStorage,
        lastSyncedStorageJson: lastSynced,
        deviceId: deviceId
    )

    // 3. POST to server
    let response = POST /api/sync2 {
        storageUpdate: update,
        deviceId: "watch-xxx",
        isWatch: true,
        timestamp: Date.now()
    }

    // 4. Handle response
    switch response.type {
    case "clean":
        lastSyncedStorage = snapshotStorage
        syncStatus = .synced
    case "dirty":
        await handleIncomingStorage(response.storage)
    }
}
```

### 3.4 Receiving Incoming Storage (Watch)

The watch has sophisticated race condition handling:

```swift
// WatchSyncManager.handleIncomingStorage()
func handleIncomingStorage(_ storageJson: String) async {
    // 1. DEDUP: Skip if identical to last received
    if lastStorageReceivedFromPhone == storageJson { return }

    // 2. QUEUE: Prevent concurrent merges
    if isProcessingIncoming {
        queuedIncomingStorage = storageJson  // Keep only latest
        return
    }

    isProcessingIncoming = true
    let storageBeforeMerge = currentStorage  // Snapshot for race detection

    // 3. MERGE: Heavy JS operation
    let merged = await engine.mergeStorage(
        currentStorageJson: current,
        incomingStorageJson: storageJson,
        deviceId: deviceId
    )

    // 4. RACE DETECTION: Did storage change during merge?
    if currentStorage != storageBeforeMerge {
        // User completed a set while merge was happening!
        let reMerged = await engine.mergeStorage(
            currentStorageJson: currentStorage,  // Latest local
            incomingStorageJson: merged,          // Result of first merge
            deviceId: deviceId
        )
        currentStorage = reMerged
        lastSyncedStorage = reMerged
    } else {
        currentStorage = merged
        lastSyncedStorage = merged
    }

    // 5. Process any queued storage
    if let queued = queuedIncomingStorage {
        queuedIncomingStorage = nil
        await handleIncomingStorage(queued)
    }
}
```

---

## 4. Phone ↔ Watch Communication

### 4.1 WatchConnectivity Methods

| Method | Behavior | Use Case |
|--------|----------|----------|
| `sendMessage()` | Immediate, requires reachable | Real-time updates when phone active |
| `updateApplicationContext()` | Latest only, no queue | Background sync (keeps only newest) |
| `transferUserInfo()` | Queued, all delivered | Critical data like auth tokens |

### 4.2 Phone → Watch Data Flow

```
Phone storage changes
  ↓
WatchConnectivityManager.sendStorageToWatch(storage)
  ↓
Processing queue:
  1. Extract storage from wrapper (if wrapped)
  2. filterStorageForWatch() - remove history, stats, non-current programs
  3. LiftosaurEngine.validateStorage() - io-ts validation
  4. hasChangesToSend() - compare to lastStorageSentToWatch
     └─ If no changes → skip (prevents echo loops)
  ↓
doSendStorageToWatch():
  if session.isReachable:
    session.sendMessage(["storage": filtered])
  else:
    session.updateApplicationContext(["storage": filtered])
```

### 4.3 Watch → Phone Data Flow

```
Watch storage changes
  ↓
WatchSyncManager.notifyPhone()
  ↓
Check if changes vs lastStorageSentToPhone using prepareSync()
  └─ If no changes → skip
  ↓
WatchConnectivityManager.sendStorage(storageJson, deviceId)
  if session.isReachable:
    session.sendMessage(["type": "watchStorage", "storage": json])
  else:
    session.updateApplicationContext(["type": "watchStorage", ...])
  ↓
Phone receives (WatchConnectivityManager delegate):
  handleWatchStorage(storageJson, deviceId)
  ↓
1. FIRST: Merge to disk via StorageManager.modify()
   - Ensures Live Activity reads current data
   - Uses serial queue for thread safety
  ↓
2. THEN: Queue for WebView
   if isAppActive && isWebViewLoaded:
     Liftosaur.webView.evaluateJavaScript(
       "window.postMessage({type: 'watchStorageMerge', storage: '...'})"
     )
   else:
     queueStorageForWebView(item)  // Process when app becomes active
  ↓
Web app receives message:
  dispatch(Thunk.handleWatchStorageMerge(storageJson, deviceId))
  ↓
Storage.mergeStorage(phoneStorage, watchStorage, phoneDeviceId)
```

**Why merge to disk first?**

Live Activity reads directly from disk via `StorageManager.getValue()`. Previously, watch storage was only queued for WebView merge, leaving disk storage stale. If user tapped Live Activity before WebView processed the queue, the mutation would use outdated data and lose watch changes.

Now `mergeWatchStorageToDisk()` immediately merges incoming watch storage to disk using `StorageManager.modify()`, so Live Activity always reads current state.

### 4.4 Echo Prevention

Both sides track what they **sent** (not received) to prevent oscillation:

```swift
// Phone side
private var lastStorageSentToWatch: String?

// Before sending:
hasChangesToSend(currentStorage, lastReceived: lastStorageSentToWatch) { hasChanges in
    if !hasChanges { return }  // Skip - no new changes
    doSendStorageToWatch(...)
    lastStorageSentToWatch = currentStorage
}
```

```swift
// Watch side
private var lastStorageSentToPhone: String?

// Before sending:
let delta = await engine.prepareSync(current, lastSent, deviceId)
if delta.storage.isEmpty && delta.versions.isEmpty {
    return  // Skip - no new changes
}
sendStorage(current)
lastStorageSentToPhone = current
```

---

## 5. Server Sync Protocol

### 5.1 Endpoint: POST /api/sync2

**Request:**
```typescript
{
  deviceId: string,           // "phone-abc" or "watch-xyz"
  timestamp: number,          // Client timestamp
  isWatch?: boolean,          // Server filters response for watch
  storageUpdate: {
    version: string,          // Migration version like "20240720152051"
    originalId?: number,      // For fast-path check
    storage?: Partial<IStorage>,  // Only changed fields
    versions?: Partial<IVersions> // Only changed versions
  }
}
```

**Response:**
```typescript
// No conflicts - server accepted delta
{ type: "clean", new_original_id: number }

// Conflicts - server merged and returns result
{ type: "dirty", storage: IStorage }  // Filtered for watch if isWatch=true

// Error
{ type: "error", error: string }
```

### 5.2 Fast-Path vs Merge-Path

```typescript
// Server decision (lambda/index.ts)
if (storageUpdate.originalId != null &&
    serverStorage.originalId === storageUpdate.originalId) {
  // FAST PATH: No concurrent changes
  // Just apply delta, return "clean"
} else {
  // MERGE PATH: Concurrent changes detected
  // Full merge using VersionTracker, return "dirty" with merged storage
}
```

### 5.3 Server Merge Logic

```typescript
// lambda/dao/userDao.ts - applySafeSync2()

// 1. Merge version trees
const newVersions = versionTracker.mergeVersions(
  serverVersions,
  clientVersions
);

// 2. Merge data using versions
const mergedStorage = versionTracker.mergeByVersions(
  serverStorage,      // Full server data
  serverVersions,     // Server versions
  clientVersions,     // Client versions (incoming)
  clientStorage       // Client data (incoming)
);

// 3. Handle progress normalization (keep only latest)
if (mergedStorage.progress?.length > 1) {
  mergedStorage.progress.sort((a, b) => b.startTime - a.startTime);
  mergedStorage.progress = [mergedStorage.progress[0]];
}
```

---

## 6. Live Activity Set Completion

### 6.1 Architecture

Live Activity runs in a **separate process** (extension) and cannot directly call main app code. Communication uses:

1. **Shared UserDefaults** (`group.com.liftosaur.workout`) - Write intent data
2. **Polling Timer** (500ms interval) - Main app reads UserDefaults
3. **stateVersion** - Deduplication mechanism

### 6.2 Set Completion Flow

```
User taps "Complete" on Lock Screen
  ↓
CompleteSetIntent.perform() [Extension Process]
  - Writes to shared UserDefaults:
    - completeSetEntryIndex
    - completeSetSetIndex
    - completeSetStateVersion  ← CRITICAL
    - completeSetRestTimer
    - completeSetRestTimerSince
  - Returns immediately
  ↓
Main app timer fires (every 500ms) [Main App Process]
  ↓
Read from UserDefaults, clear keys
  ↓
VERSION CHECK:
  if (intentStateVersion != LiveActivityManager.stateVersion) {
    // STALE INTENT - ignore
    return
  }
  ↓
executeLiveActivityMutation() using StorageManager.modify()
  - Atomic read-modify-write on serial queue:
    1. Read storage from disk
    2. LiftosaurEngine mutation (e.g., completeSetLiveActivity())
    3. Write updated storage back to disk
  - queueLiveActivityStorage() → queues for MERGE (not reload!)
  - sendStorageToWatch()
```

**StorageManager.modify pattern:**

```swift
let success = await StorageManager.shared.modify(forKey: storageKey) { storageWrapper in
    guard let storageWrapper = storageWrapper,
          let extractedStorage = extractStorageFromWrapper(storageWrapper) else { return nil }

    let updatedStorage = await withCheckedContinuation { continuation in
        engineCall(extractedStorage) { result in continuation.resume(returning: result) }
    }

    guard let updatedStorage = updatedStorage else { return nil }
    return rewrapStorage(updatedStorage, originalWrapper: storageWrapper)
}
```

This ensures no other storage operation (e.g., incoming watch storage merge) can interleave between read and write.

### 6.3 Live Activity Storage Queue

When app is NOT active, Live Activity queues its storage for **merge** instead of reload:

```swift
// WatchConnectivityManager.swift
func queueLiveActivityStorage(_ storageJson: String) {
    if isAppTrulyActive && isWebViewLoaded {
        // App active: merge immediately
        sendWatchStorageToWebView(storageJson: storageJson, deviceId: "phone")
        return
    }
    // App not active: queue for merge when app wakes
    queuePendingUpdate(["type": "liveActivityStorage", "storage": storageJson, "deviceId": "phone"])
}
```

**Why merge instead of reload?**

The pending queue can have both watch storage and Live Activity storage:
1. Watch queues `{type: "storage", storage: "sets 1-5"}`
2. Live Activity queues `{type: "liveActivityStorage", storage: "sets 1,2,6"}`

When app wakes, both are processed as **merges**:
- Watch storage merges → web view has sets 1-5
- Live Activity storage merges → adds set 6
- Result: sets 1-6 preserved ✓

If Live Activity used `reloadStorage` instead, it would **replace** the merged state, losing watch changes.

**Disk vs WebView sync:**

Note that disk storage is updated **immediately** when watch storage arrives (via `mergeWatchStorageToDisk`), while WebView merge is queued. This ensures:
- Live Activity always reads current disk state
- WebView eventually catches up when app becomes active
- No data loss even if Live Activity acts before WebView processes queue

### 6.4 stateVersion Mechanism

```swift
// LiveActivityManager.swift (actor)
private(set) var stateVersion: Int = 0

func updateWorkout(data: [String: String]) async {
    // Increment version BEFORE updating Live Activity
    stateVersion += 1
    let capturedVersion = stateVersion

    // Include version in Live Activity state
    var versionedState = contentState
    versionedState.stateVersion = capturedVersion

    // Update Live Activity with new version
    await activity.update(ActivityContent(state: versionedState, ...))
}
```

**Why stateVersion exists:**
- Web sends new state → `stateVersion` increments → Live Activity shows new UI
- User taps "Complete" → Intent captures current `stateVersion`
- If web sends another update before intent is processed, `stateVersion` increments again
- Main app checks: `intentStateVersion != currentStateVersion` → ignores stale intent

### 6.5 Rest Timer Adjustment Flow

```
User taps +15s on Lock Screen
  ↓
AdjustRestTimerIntent.perform() [Extension Process]
  1. OPTIMISTIC UI UPDATE (immediate):
     let newRestTimer = restTimer + 15
     activity.update(state with newRestTimer)

  2. Write to shared UserDefaults:
     - adjustRestTimerAction ("increase" or "decrease")
     - adjustRestTimer
     - adjustRestTimerSince
  ↓
Main app polls (500ms)
  ↓
executeLiveActivityMutation("adjustRestTimer")
  - LiftosaurEngine.adjustTimerLiveActivity()
  - Save storage
  - Sync to watch
```

---

## 7. Storage Filtering

### 7.1 Why Filter?

| Unfiltered | Filtered | Reason |
|------------|----------|--------|
| ~2-5 MB | ~100-200 KB | Watch has limited memory |
| 18s validation | ~100ms | io-ts is slow on large data |
| All history | Empty | Watch doesn't need history |
| All programs | Current only | Only active program needed |

### 7.2 Phone-Side Filtering

```swift
// WatchConnectivityManager.swift - filterStorageForWatch()
func filterStorageForWatch(_ storage: [String: Any]) -> [String: Any] {
    var filtered = storage

    // 1. Programs: Keep only current
    let currentProgramId = storage["currentProgramId"]
    filtered["programs"] = programs.filter { $0["id"] == currentProgramId }

    // 2. History: Clear completely
    filtered["history"] = []

    // 3. Stats: Clear completely
    filtered["stats"] = ["weight": [:], "length": [:], "percentage": [:]]

    // 4. Progress: Remove UI state
    for i in progressArray.indices {
        progressArray[i].removeValue(forKey: "ui")
    }

    return filtered
}
```

### 7.3 Server-Side Filtering

```typescript
// lambda/index.ts - filterStorageForWatch()
function filterStorageForWatch(storage: IStorage): IStorage {
    return {
        ...storage,
        programs: storage.programs.filter(p => p.id === storage.currentProgramId),
        history: [],
        stats: { weight: {}, length: {}, percentage: {} },
        _versions: {
            ...storage._versions,
            history: { items: {} },
            stats: { weight: {}, length: {}, percentage: {} },
            programs: { items: { [currentProgramKey]: ... } }
        }
    };
}
```

### 7.4 Why Filtering Doesn't Break Sync

VersionTracker's `mergeByVersions` only iterates keys present in incoming `_versions`:
- If `history` isn't in versions, it's never processed
- Watch's local data preserved because empty array doesn't trigger deletion
- Deletion only happens with explicit `deleted` markers in versions

---

## 8. Race Conditions & Edge Cases

### 8.0 Storage Serialization Architecture

All storage operations go through `StorageManager`, which uses a **serial DispatchQueue** to prevent race conditions:

```swift
actor StorageManager {
    private static let storageQueue = DispatchQueue(label: "com.liftosaur.storage")

    // ALL operations execute on the same serial queue
    nonisolated func getValue(forKey key: String) async -> String? {
        await withCheckedContinuation { continuation in
            Self.storageQueue.async {
                let result = self.getValueSync(forKey: key)
                continuation.resume(returning: result)
            }
        }
    }

    nonisolated func setValue(_ value: String, forKey key: String) async -> Bool {
        await withCheckedContinuation { continuation in
            Self.storageQueue.async {
                let result = self.setValueSync(value, forKey: key)
                continuation.resume(returning: result)
            }
        }
    }

    // Atomic read-modify-write for complex operations
    nonisolated func modify(forKey key: String, operation: @escaping (String?) async -> String?) async -> Bool {
        await withCheckedContinuation { continuation in
            Self.storageQueue.async {
                Task {
                    let currentValue = self.getValueSync(forKey: key)
                    guard let newValue = await operation(currentValue) else {
                        continuation.resume(returning: false)
                        return
                    }
                    let success = self.setValueSync(newValue, forKey: key)
                    continuation.resume(returning: success)
                }
            }
        }
    }
}
```

**Key guarantees:**
1. All reads, writes, and modify operations are serialized
2. `modify()` holds the queue during the entire read-operation-write cycle
3. No interleaving between concurrent operations

### 8.1 User completes set on Live Activity while watch sync is happening

**Scenario:**
```
T1: Watch completes set, sends to phone
T2: Phone receives watch storage, starts mergeWatchStorageToDisk()
T3: User taps "Complete" on Live Activity
T4: Phone finishes merge, saves storage
T5: Main app processes Live Activity intent via executeLiveActivityMutation()
```

**Problem:** Previously, step T5 could load stale storage if T2-T4 hadn't completed

**Current Protection (Fixed):**
1. Both `mergeWatchStorageToDisk()` and `executeLiveActivityMutation()` use `StorageManager.modify()`
2. Both operations go through the same serial queue
3. If T5 starts while T2-T4 is in progress, it waits until T4 completes
4. T5 then reads the **merged** storage (with watch changes) and applies the Live Activity mutation
5. Result: Both watch changes and Live Activity changes are preserved

### 8.2 Watch and Live Activity both complete the same set

**Scenario:**
```
T1: User completes set on watch
T2: User completes same set on Live Activity (phone)
```

**Resolution:**
- Both will attempt to mark the same set as completed
- VersionTracker's field-level versioning handles this
- Higher timestamp wins, but result is the same (set completed)

### 8.3 Storage sent to watch while watch is mid-merge

**Scenario:**
```
T1: Phone sends storage A to watch
T2: Watch starts merging A with local B
T3: Phone sends storage C to watch (e.g., user completed another set)
T4: Watch finishes merge of A+B = D
T5: Watch receives C
```

**Protection in WatchSyncManager:**
```swift
if isProcessingIncoming {
    queuedIncomingStorage = storageJson  // Queue C, will process after D
    return
}
```

### 8.4 Echo loop potential

**Scenario:**
```
T1: Watch changes storage, sends to phone
T2: Phone merges, sends merged storage back to watch
T3: Watch merges, sends merged storage back to phone
... infinite loop
```

**Protection:**
- Phone tracks `lastStorageSentToWatch`
- Watch tracks `lastStorageSentToPhone`
- `hasChangesToSend()` / `prepareSync()` detects no new changes
- Skip sending if no new changes detected

### 8.5 Live Activity stateVersion race

**Scenario:**
```
T1: Web state version = 5, Live Activity shows set at index [0,3]
T2: User taps "Complete" on Live Activity, captures stateVersion=5
T3: Watch completes a different set, sends to phone
T4: Phone merges watch storage, triggers web update
T5: Web updates Live Activity, stateVersion becomes 6
T6: Main app processes intent with stateVersion=5
T7: Check: 5 != 6 → INTENT IGNORED (even though it was valid!)
```

**This is a potential bug:** The intent was valid when captured but becomes "stale" due to unrelated watch update.

---

## 9. Debugging Sync Issues

### 9.1 Logging Locations

| Component | Logger | Key Messages |
|-----------|--------|--------------|
| Phone WatchConnectivity | `Logger.wc` | "sending storage to watch", "received watchStorage" |
| Watch Sync | `Logger.sync` | "recordLocalChange", "attemptSync", "handleIncomingStorage" |
| Live Activity | `Logger.liveActivity` | "version mismatch", "completeSet succeeded" |
| Server | `di.log` | "Safe update", "Merging update" |

### 9.2 Common Issues

**1. Sets unchecked after sync**
- Check if `stateVersion` mismatch caused intent to be ignored
- Check if watch sent older storage that overwrote phone state
- Check version timestamps in `_versions`
- Verify `mergeWatchStorageToDisk` completed before Live Activity mutation

**2. Echo loops**
- Check `lastStorageSentToWatch` / `lastStorageSentToPhone` tracking
- Look for rapid back-and-forth sync messages

**3. Data loss after merge**
- Check version timestamps of lost field
- Compare device vector clocks to understand which version won

**4. Live Activity loses watch changes**
- Verify watch storage is being merged to disk (check `mergeWatchStorageToDisk` logs)
- Ensure `executeLiveActivityMutation` uses `StorageManager.modify()`, not separate get/set
- All storage operations should go through the serial queue

### 9.3 Key State to Inspect

```swift
// Watch side
WatchSyncManager.shared.currentStorage
WatchSyncManager.shared.lastSyncedStorage
WatchSyncManager.shared.lastStorageReceivedFromPhone
WatchSyncManager.shared.lastStorageSentToPhone

// Phone side
lastStorageSentToWatch
lastStorageReceivedFromWatch

// Live Activity
LiveActivityManager.shared.stateVersion

// Disk storage (read via StorageManager)
StorageManager.shared.getValue(forKey: "liftosaur_<account>")
// - All operations serialized on com.liftosaur.storage queue
// - Both watch merge and Live Activity mutations go through this
```

### 9.4 Diagnostic Questions

1. What was the `stateVersion` in the intent vs current?
2. What was the `_versions.progress` timestamp from each device?
3. Did watch send storage between intent capture and processing?
4. Was the merge "clean" or "dirty" on the server?
5. What was the `originalId` comparison result?

---

## Summary: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ACTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Phone App          Live Activity           Apple Watch                     │
│   (Web View)         (Lock Screen)           (watchOS)                       │
│       │                   │                      │                           │
│       │    ┌──────────────┴──────────────┐       │                           │
│       │    │ CompleteSetIntent           │       │                           │
│       │    │ stateVersion capture        │       │                           │
│       │    └──────────────┬──────────────┘       │                           │
│       │                   │                      │                           │
│       │    ┌──────────────▼──────────────┐       │                           │
│       │    │ Shared UserDefaults         │       │                           │
│       │    │ (group.com.liftosaur)       │       │                           │
│       │    └──────────────┬──────────────┘       │                           │
│       │                   │                      │                           │
│       ▼                   ▼                      ▼                           │
│   ┌───────────────────────────────────────────────────────────────┐         │
│   │              iOS Native Layer (Swift)                          │         │
│   │                                                                │         │
│   │  ViewController        LiveActivityManager    LiftosaurEngine  │         │
│   │  - 500ms polling       - stateVersion         - JS mutations   │         │
│   │  - version check       - update activity      - sync prep      │         │
│   │                                                                │         │
│   │  WatchConnectivityManager                                      │         │
│   │  - filterStorageForWatch()                                     │         │
│   │  - echo prevention (lastStorageSentToWatch)                    │         │
│   │  - handleWatchStorage()                                        │         │
│   └───────────────────────┬───────────────────────────────────────┘         │
│                           │                                                  │
│   ┌───────────────────────▼───────────────────────────────────────┐         │
│   │              Web Layer (TypeScript)                            │         │
│   │                                                                │         │
│   │  Redux State          VersionTracker          IndexedDB        │         │
│   │  - storage            - updateVersions()      - persistence    │         │
│   │  - _versions          - mergeByVersions()     - offline        │         │
│   │  - lastSyncedStorage  - diffVersions()                         │         │
│   │                       - fillVersions()                         │         │
│   └───────────────────────┬───────────────────────────────────────┘         │
│                           │                                                  │
└───────────────────────────┼──────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            SERVER (/api/sync2)                                 │
│                                                                                │
│  Request                    Decision                   Response                │
│  ────────                   ────────                   ────────                │
│  {                          if (originalId matches)    { type: "clean" }       │
│    storageUpdate: {...}       → Fast path              OR                      │
│    deviceId: "..."          else                       { type: "dirty",        │
│    isWatch: true              → Merge path               storage: merged }     │
│  }                                                                             │
│                                                                                │
│  For watch: filterStorageForWatch() before returning "dirty" response          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Version Tracking Configuration

```typescript
// src/types.ts - STORAGE_VERSION_TYPES
export const STORAGE_VERSION_TYPES = {
  atomicTypes: ["history_record", "subscription_receipt"],

  controlledTypes: ["program", "exercise"],

  typeIdMapping: {
    "program": "id",
    "exercise": "name",
    "history_record": "id"
  },

  controlledFields: {
    "program": ["name", "nextDay"],
    "exercise": ["sets", "reps"]
  },

  dictionaryFields: [
    "settings.exercises",
    "settings.exerciseData",
    "stats.weight",
    "stats.length",
    "stats.percentage"
  ]
};
```
