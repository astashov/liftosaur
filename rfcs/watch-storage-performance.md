# Watch Storage Performance Optimization

## Problem Statement

For accounts with large workout histories (e.g., 700+ workouts), the Apple Watch app experiences severe performance issues. JS calls take 15-20 seconds due to storage validation.

**Example from logs (700 workouts):**
```
[JS] [PERF] JSON.parse took 1120ms
[JS] [PERF] validateStorage took 17972ms
[JS] [PERF] parseStorageSync took 19189ms
JS eval took 19686.48ms
```

### Root Cause

1. **Full IStorage sent to watch** - Phone sends entire storage including all history, stats, all programs
2. **io-ts validation is slow** - `Storage.validateStorage()` recursively validates every nested structure
3. **Validation on every operation** - Each JS call validates the full storage (unless cached)

For 700 workouts with ~10 exercises each × ~5 sets = ~35,000 sets validated recursively by io-ts.

### What Watch Actually Needs vs. What It Receives

| Field | Watch Needs | Currently Receives |
|-------|-------------|-------------------|
| `history` | None (PRs dropped for now) | All 700+ records |
| `stats` | None | All measurements |
| `programs` | Only current program | All programs |
| `progress` | Current workout | ✓ |
| `settings` | Most fields | ✓ |

---

## Solution: Source-Side Filtering

Filter storage at the source (phone and server) so watch never receives unnecessary data. This avoids complex VersionTracker modifications.

### Data Flow

```
Phone → Watch:
  - programs: [currentProgram only]
  - history: []
  - stats: { weight: {}, length: {}, percentage: {} }
  - _versions: matches filtered data

Watch → Server (sync2):
  - Sends only changed fields (as before)
  - Includes isWatch: true flag

Server → Watch (dirty response):
  - programs: [currentProgram only, if changed]
  - history: excluded
  - stats: excluded
  - _versions: matches filtered data
```

---

## Why VersionTracker Doesn't Need Changes

We initially considered adding `skipFields` to VersionTracker, but source-side filtering makes this unnecessary.

### Key Insight 1: updateVersions Iterates Data, Not Versions

**Deletion Detection (versionTrackerUpdateVersions.ts:150-158):**
```typescript
if (Array.isArray(oldValue)) {
  for (const oldItem of oldValue) {  // ← iterates OLD DATA array
    if (oldItemId && !newValue.some(...)) {
      collectionVersions.deleted[oldItemId] = timestamp;
    }
  }
}
```

The deletion loop iterates through `oldValue` (the data array), NOT through `currentVersion.items` (the version entries). If watch has `history = []` (empty), the loop doesn't run - nothing gets marked as deleted.

**With source-side filtering:**
- Watch receives `history: []` with `_versions.history.items: {}`
- Watch finishes workout → `history: [{id: 701}]`
- `updateVersions`: old=[], new=[{id:701}] → creates version for 701
- Result: `_versions.history.items = {701: v701}`

No spurious deletions because old data is empty.

### Key Insight 2: mergeByVersions Iterates Incoming Versions, Not Merged

**Critical code in Storage.mergeStorage:**
```typescript
const updatedCleanedStorage = versionTracker.mergeByVersions(
  oldCleanedStorage,   // watch's current data
  oldVersions || {},   // watch's current versions
  newVersions || {},   // SERVER's incoming versions (not merged!)
  newCleanedStorage    // server's data
);
```

**In mergeByVersions.run():**
```typescript
for (const key in versionDiff) {  // versionDiff = newVersions (from server)
  // Only processes keys that SERVER sent in _versions
}
```

If server's filtered response doesn't include `history` in `_versions`, that key is never iterated. Watch's history data remains completely untouched.

### Key Insight 3: mergeCollectionByVersion Preserves Local Items

Even if server sends `history: []`, watch keeps its records:

```typescript
// In mergeCollectionByVersion (lines 201-247)
if (Array.isArray(fullValue) && Array.isArray(extractedValue)) {
  const result: unknown[] = [];

  // First: process server's items (empty array = nothing)
  for (const extractedItem of extractedValue) { /* nothing */ }

  // Then: keep watch's items NOT in deletedKeys
  for (const fullItem of fullValue) {  // watch's [{id: 701}]
    if (itemId && !processedIds.has(itemId) && !deletedKeys.has(itemId)) {
      result.push(fullItem);  // Keeps 701!
    }
  }
  return result;  // [{id: 701}] preserved
}
```

Server would need to explicitly send `deleted: {701: timestamp}` to remove watch's record. Simply sending `history: []` doesn't delete anything.

### Operation-by-Operation Analysis

| Operation | What It Iterates | Risk | With Source Filtering |
|-----------|-----------------|------|----------------------|
| `updateVersions` (deletions) | OLD data array | Could mark deletions | ✓ Old data is empty |
| `updateVersions` (additions) | NEW data array | None | ✓ Creates versions for new items |
| `mergeByVersions` | Incoming `_versions` keys | Could add unwanted data | ✓ Server doesn't send history/stats keys |
| `mergeCollectionByVersion` | Both arrays + deletedKeys | Could delete local items | ✓ Server doesn't mark items deleted |
| `diffVersions` | Version keys | None | ✓ Only shows changes |
| `extractByVersions` | Data arrays | Could miss data | ✓ Only extracts what watch has |
| `fillVersions` | Data arrays | None | ✓ Only fills for data present |

### Critical Requirement

**Both `storage` AND `_versions` must be filtered** at the source:

```typescript
// ❌ BAD - server sends versions without data
{
  storage: { programs: [...] },           // no history
  _versions: { programs: {...}, history: { items: {1-700} } }  // has history versions!
}

// ✓ GOOD - server filters both
{
  storage: { programs: [...] },           // no history
  _versions: { programs: {...} }          // no history key at all
}
```

If server sends history in `_versions` but not in `storage`, mergeByVersions would still iterate the history key. While it wouldn't add data (extractedValue would be undefined), it's cleaner and safer to exclude the key entirely.

---

## Edge Cases

### 1. Watch Finishes Workout While Offline

**Scenario:**
1. Watch receives filtered storage: `history: []`, `_versions.history.items: {}`
2. Watch goes offline
3. User finishes workout → `history: [{id: 701}]`, `_versions.history.items: {701: v701}`
4. Watch syncs later

**Result:** Works correctly.
- `diffVersions`: detects new item 701
- Watch sends record 701 to server
- Server adds it to full history
- Server responds (filtered): no history in response
- Watch keeps its local record 701

### 2. Phone Modifies Current Program While Watch Works Out

**Scenario:**
1. Watch has program "abc"
2. Phone user edits program "abc" (changes exercise order)
3. Watch finishes workout, syncs
4. Server detects program conflict

**Result:** Works correctly.
- Server responds "dirty" with updated program "abc"
- Watch merges program changes
- Watch has updated program

### 3. Phone Adds New Workout While Watch Works Out

**Scenario:**
1. Watch working out (has record in progress)
2. Phone user completes a different workout → creates record 702
3. Watch finishes workout → creates record 701
4. Both sync to server

**Result:** Works correctly.
- Server has both records 701 and 702
- Server doesn't send history to watch (filtered)
- Watch only has record 701 locally
- Phone receives record 701 on next sync
- Full history preserved on phone and server

### 4. Watch Creates Multiple Workouts Before Syncing

**Scenario:**
1. Watch finishes workout → record 701
2. Watch starts and finishes another → record 702
3. Watch finally syncs

**Result:** Works correctly.
- Watch has `history: [{id: 702}, {id: 701}]`
- Watch has `_versions.history.items: {701: v701, 702: v702}`
- `diffVersions` vs empty lastSynced: both records in diff
- Watch sends both records
- Server adds both

### 5. Server Has Newer Program Version

**Scenario:**
1. Watch has program "abc" version v1
2. Server has program "abc" version v2 (updated via web)
3. Watch syncs

**Result:** Works correctly.
- Server responds "dirty" with updated program
- `mergeByVersions`: server's v2 > watch's v1 → takes server version
- Watch has updated program

### 6. Watch and Phone Both Modify Same Program Field

**Scenario:**
1. Watch changes program state (via Liftoscript progression)
2. Phone user renames program
3. Both sync

**Result:** Works correctly.
- VersionTracker tracks field-level versions for controlled types
- Program name change and state change are different fields
- Both changes merged (orthogonal changes)

### 7. Defensive: Server Sends Versions Without Data (Improper Filtering)

**Scenario (shouldn't happen, but let's verify):**
Server incorrectly sends:
```typescript
{
  storage: { programs: [...] },  // no history
  _versions: { programs: {...}, history: { items: {1-700} } }  // has history versions!
}
```

**What happens:**
1. `mergeVersions`: watch's `{701}` merged with server's `{1-700}` → `{1-701}`
2. `mergeByVersions`: iterates `history` key (it's in incoming _versions)
   - `extractedValue` = undefined (no history in storage)
   - Since extractedValue is undefined, checks `isFieldVersion(diffVersion)`
   - history's diffVersion is `ICollectionVersions`, not `IFieldVersion`
   - So the else-if branch doesn't execute
   - History field untouched in result

**Result:** Watch keeps its local history, but now has extra versions.
```
history: [{id: 701}]  // data unchanged
_versions.history.items: {1-700, 701}  // bloated versions
```

**Subsequent operations:**
- `updateVersions`: only iterates data → won't mark 1-700 as deleted
- `diffVersions`: compares versions, but if lastSynced also has {1-700}, no diff
- `extractByVersions`: iterates data → only extracts records watch actually has

**Conclusion:** Even with improper filtering, watch data remains correct. Versions may bloat but don't cause functional issues. However, proper filtering of both `storage` AND `_versions` is still recommended for cleanliness.

### 8. Defensive: Server Sends Empty History Array

**Scenario:**
Server sends `history: []` explicitly instead of omitting the field:
```typescript
{
  storage: { programs: [...], history: [] },
  _versions: { programs: {...}, history: { items: {} } }
}
```

**What happens in mergeByVersions:**
- `fullValue` = watch's `[{id: 701}]`
- `extractedValue` = server's `[]`
- Calls `mergeCollectionByVersion`
- Server's empty array processed (nothing added)
- Watch's items preserved (701 not in `deletedKeys`)

**Result:** Watch keeps record 701. ✓

The only way to delete watch's record would be for server to send:
```typescript
_versions: { history: { items: {}, deleted: { 701: timestamp } } }
```

This won't happen with proper filtering.

---

## Implementation

### 1. Phone (Swift) - WatchConnectivityManager.swift

Filter storage before sending to watch:

```swift
func sendStorageToWatch(_ storageJson: String) {
    guard let data = storageJson.data(using: .utf8),
          var storage = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        return
    }

    // Extract inner storage if wrapped
    if let innerStorage = storage["storage"] as? [String: Any] {
        storage = innerStorage
    }

    // Filter to only current program
    if let currentProgramId = storage["currentProgramId"] as? String,
       let programs = storage["programs"] as? [[String: Any]] {
        storage["programs"] = programs.filter { $0["id"] as? String == currentProgramId }
    }

    // Clear history and stats
    storage["history"] = []
    storage["stats"] = ["weight": [:], "length": [:], "percentage": [:]]

    // Filter _versions to match
    if var versions = storage["_versions"] as? [String: Any] {
        versions["history"] = ["items": [:]]
        versions["stats"] = [:]  // or matching empty structure

        // Filter programs versions to only current program
        if let currentProgramId = storage["currentProgramId"] as? String,
           var programVersions = versions["programs"] as? [String: Any],
           var items = programVersions["items"] as? [String: Any] {
            programVersions["items"] = items.filter { $0.key == currentProgramId }
            versions["programs"] = programVersions
        }

        storage["_versions"] = versions
    }

    // Send filtered storage
    let filteredData = try? JSONSerialization.data(withJSONObject: storage)
    let filteredJson = String(data: filteredData!, encoding: .utf8)!

    // ... send via WatchConnectivity
}
```

### 2. Server (Lambda) - sync2 endpoint

Add `isWatch` flag handling:

```typescript
// In request type
interface ISync2Request {
  deviceId: string;
  timestamp: number;
  isWatch?: boolean;  // NEW
  storageUpdate: IStorageUpdate2;
}

// In handler, when preparing dirty response
function prepareDirtyResponse(
  storage: IStorage,
  isWatch: boolean,
  currentProgramId?: string
): Partial<IStorage> {
  if (!isWatch) {
    return storage;  // full storage for phone/web
  }

  // Filter for watch
  return {
    ...storage,
    history: [],
    stats: { weight: {}, length: {}, percentage: {} },
    programs: storage.programs.filter(p => p.id === currentProgramId),
    _versions: filterVersionsForWatch(storage._versions, currentProgramId),
  };
}

function filterVersionsForWatch(
  versions: IVersions<IStorage>,
  currentProgramId?: string
): IVersions<IStorage> {
  return {
    ...versions,
    history: { items: {} },
    stats: {},
    programs: {
      ...versions.programs,
      items: currentProgramId
        ? { [currentProgramId]: versions.programs?.items?.[currentProgramId] }
        : {}
    },
  };
}
```

### 3. Watch JS Bundle - src/watch/index.ts

Skip io-ts validation:

```typescript
function parseStorageSync(storageJson: string, forceRevalidate: boolean = false): IEither<IStorage, string[]> {
  if (cachedStorage !== null && !forceRevalidate) {
    return { success: true, data: cachedStorage };
  }

  const parseStart = Date.now();
  const data = JSON.parse(storageJson);
  console.log(`[PERF] JSON.parse took ${Date.now() - parseStart}ms`);

  // Skip io-ts validation - trust phone/server data
  // Optional: add lightweight structural check
  if (!data.settings || !data.programs || !Array.isArray(data.programs)) {
    return { success: false, error: ["Invalid storage structure"] };
  }

  cachedStorage = data as IStorage;
  cachedStorageVersion += 1;
  return { success: true, data: cachedStorage };
}
```

Remove PR display from `getFinishWorkoutSummary`:

```typescript
public static getFinishWorkoutSummary(storageJson: string): string {
  return this.getStorage<IWatchFinishWorkoutSummary | undefined>(storageJson, (storage) => {
    // ... existing code ...

    // Remove PR calculation (history is empty on watch)
    const personalRecords: IWatchPersonalRecords = {
      maxWeight: [],
      estimated1RM: [],
    };

    return {
      success: true,
      data: {
        // ... other fields ...
        personalRecords,  // always empty for now
      },
    };
  });
}
```

### 4. Watch Swift - WatchSyncManager.swift

Add `isWatch` flag to sync requests:

```swift
func syncViaServer() async {
    // ... existing code ...

    let requestBody: [String: Any] = [
        "deviceId": deviceId,
        "timestamp": Date().timeIntervalSince1970 * 1000,
        "isWatch": true,  // NEW
        "storageUpdate": [
            "version": version,
            "versions": versionsDiff,
            "storage": storageDiff,
        ]
    ]

    // ... send request ...
}
```

---

## Expected Performance Improvement

| Metric | Before | After |
|--------|--------|-------|
| Storage size | ~2-5 MB | ~100-200 KB |
| JSON.parse | ~1.1s | ~50-100ms |
| validateStorage | ~18s | ~0s (skipped) |
| **Total** | **~19s** | **~100ms** |

---

## Future Considerations

1. **PR Display**: Could be re-added by pre-computing PRs on phone/server and including in watch storage as a separate field

2. **Stats for 1RM**: If watch needs stats for initial weight calculation, could include just the latest values (not full history)

3. **Multiple Programs**: If watch needs to switch programs, could fetch on-demand rather than storing all

4. **Offline History**: If watch needs to display past workouts, could keep last N records instead of full history
