# WearOS Implementation Plan for Liftosaur

## Overview

Port the Apple Watch app to WearOS, reusing the same `watch-bundle.js` (no JS changes needed). The WearOS app will be a new Gradle module in the existing LiftosaurAndroid project.

**Key Decisions:**
- **JS Engine:** AndroidX JavaScriptEngine (`androidx.javascriptengine:javascriptengine:1.0.0`) - Official Jetpack library, uses V8, lower overhead than WebView. Fallback to WebView if not supported on device.
- **UI Framework:** Compose for Wear OS (modern, excellent rotary input support)
- **Phone Sync:** Wear Data Layer API (Google's recommended approach)
- **Health:** Health Services API for heart rate + Health Connect for workout saving

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WearOS Watch App                         │
├─────────────────────────────────────────────────────────────────┤
│  Compose for Wear OS UI                                         │
│  ├── HomeScreen, WorkoutExercisesScreen, ExerciseScreen         │
│  ├── AmrapModalScreen, RestTimerScreen, FinishWorkoutScreen     │
├─────────────────────────────────────────────────────────────────┤
│  ViewModel Layer (StateFlow-based)                              │
│  ├── WorkoutViewModel, SyncViewModel                            │
├─────────────────────────────────────────────────────────────────┤
│  Engine Layer                                                   │
│  ├── LiftosaurEngine (AndroidX JavaScriptEngine or WebView)     │
│  ├── WatchCacheManager (fetch & cache watch-bundle.js from CDN) │
│  ├── WatchStorageManager (file-based JSON)                      │
│  ├── WatchSyncManager (delta sync + version tracking)           │
│  └── WearDataLayerManager (phone ↔ watch)                       │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   Phone App (TWA)              Liftosaur Server
   via Data Layer               via /api/sync2
```

## Project Structure

```
LiftosaurAndroid/
├── app/                           # Existing phone app
│   └── src/main/java/.../
│       └── WearDataLayerService.kt  # NEW: Handle watch messages
│
├── wear/                          # NEW: WearOS module
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/com/liftosaur/wear/
│           ├── MainActivity.kt
│           ├── engine/
│           │   ├── LiftosaurEngine.kt
│           │   ├── WatchCacheManager.kt    # Fetch bundle from network, cache locally
│           │   ├── WatchStorageManager.kt
│           │   └── JsModels.kt
│           ├── sync/
│           │   ├── WatchSyncManager.kt
│           │   ├── WearDataLayerManager.kt
│           │   └── AuthManager.kt
│           ├── health/
│           │   └── HealthServicesManager.kt
│           ├── viewmodel/
│           │   └── WorkoutViewModel.kt
│           └── ui/
│               ├── theme/Theme.kt
│               ├── screens/
│               │   ├── HomeScreen.kt
│               │   ├── WorkoutExercisesScreen.kt
│               │   ├── ExerciseScreen.kt
│               │   ├── AmrapModalScreen.kt
│               │   ├── RestTimerScreen.kt
│               │   └── FinishWorkoutScreen.kt
│               └── components/
│                   └── ScrollableIntPicker.kt
│
└── shared/                        # NEW: Shared constants
    └── src/main/java/.../
        └── WearDataContract.kt
```

## Implementation Phases

### Phase 1: Foundation
- Create `wear` Gradle module with WearOS dependencies
- Add AndroidX JavaScriptEngine dependency
- Implement WatchCacheManager (fetch bundle from CDN, cache locally)
- Implement LiftosaurEngine using JavaScriptSandbox/JavaScriptIsolate
- Add WebView fallback for devices where JavaScriptEngine isn't supported
- Create WatchStorageManager (file-based storage)
- Fetch watch-bundle.js from network, cache, and verify `Liftosaur` object accessible
- Create Kotlin data models matching JS interfaces

### Phase 2: Core Workout Flow
- Implement WorkoutViewModel with state management
- Create HomeScreen (show next workout, start button)
- Create WorkoutExercisesScreen (exercise list)
- Create ExerciseScreen with set completion
- Implement rotary input for reps/weight (bezel/crown)
- Implement rest timer with haptic feedback
- Create FinishWorkoutScreen with summary

### Phase 3: Phone Sync
- Implement WearDataLayerManager (message/data client)
- Add WearDataLayerService to phone app
- Implement WatchSyncManager with merge logic
- Handle auth token relay from phone
- Test bidirectional sync

### Phase 4: Server Sync + Health
- Implement direct server sync (/api/sync2)
- Implement HealthServicesManager for heart rate
- Implement workout session tracking
- Add premium subscription gating
- Implement AMRAP modal
- Implement unilateral exercise support

### Phase 5: Polish + Release
- UI polish, animations, loading states
- Error handling and recovery
- Battery optimization
- Testing on multiple WearOS devices
- Play Store listing

## Key Technical Details

### Bundle Loading Strategy (like iOS WatchCacheManager)
The JS bundle is NOT shipped with the app. Instead:
1. Fetch from CDN: `https://www.liftosaur.com/watch-bundle.js`
2. Cache locally in app's files directory
3. Validate bundle (size > 1000 bytes, not HTML error page)
4. Load from cache on subsequent launches

```kotlin
class WatchCacheManager(private val context: Context) {
    private val cacheDir = context.filesDir.resolve("watchCache")
    private val bundleFile = cacheDir.resolve("watch-bundle.js")
    private val bundleUrl = "https://www.liftosaur.com/watch-bundle.js"

    suspend fun fetchAndCacheBundle(): Boolean {
        val response = httpClient.get(bundleUrl)
        if (!isValidJsBundle(response.body)) return false
        bundleFile.writeText(response.body)
        return true
    }

    fun loadBundle(): String? {
        if (!bundleFile.exists()) return null
        val content = bundleFile.readText()
        return if (isValidJsBundle(content)) content else null
    }

    private fun isValidJsBundle(content: String): Boolean {
        // Must be > 1000 bytes, not an HTML error page
        return content.length > 1000 &&
               !content.trimStart().startsWith("<!") &&
               !content.trimStart().startsWith("<html")
    }
}
```

### AndroidX JavaScriptEngine Integration
```kotlin
class LiftosaurEngine(context: Context, private val cacheManager: WatchCacheManager) {
    private var jsSandbox: JavaScriptSandbox? = null
    private var jsIsolate: JavaScriptIsolate? = null

    suspend fun initialize(): Boolean {
        // Load bundle from cache (fetched from network)
        val bundle = cacheManager.loadBundle() ?: return false

        // Check if JavaScriptEngine is supported
        if (!JavaScriptSandbox.isSupported()) {
            return initializeWebViewFallback(bundle)
        }

        jsSandbox = JavaScriptSandbox.createConnectedInstanceAsync(context).await()
        jsIsolate = jsSandbox!!.createIsolate()
        jsIsolate!!.evaluateJavaScriptAsync(bundle).await()
        return true
    }

    suspend fun <T> call(method: String, vararg args: String): Result<T> {
        val argsStr = args.joinToString(", ") { "'${escapeForJs(it)}'" }
        val code = "JSON.stringify(Liftosaur.$method($argsStr))"
        val result = jsIsolate!!.evaluateJavaScriptAsync(code).await()
        return parseResult(result)
    }
}
```

### Sync Strategy (matches iOS WatchSyncManager exactly)

The sync mechanism uses **VersionTracker** - a field-level version tracking system with timestamps.
All the complex logic is already in `watch-bundle.js`, WearOS just orchestrates the calls.

**Key JS functions (already in bundle):**
- `Liftosaur.prepareSync(current, lastSynced, deviceId)` → delta to send to server
- `Liftosaur.mergeStorage(current, incoming, deviceId)` → merged storage
- `Liftosaur.invalidateStorageCache()` → call before merge to clear JS-side cache

**Storage tracking (two copies like iOS):**
- `currentStorage` - User's live data, updated on every change
- `lastSyncedStorage` - Baseline for computing deltas

**Critical sync rules (from iOS WatchSyncManager):**
1. **After merge, set `lastSyncedStorage = merged`** (NOT incoming!)
   - Otherwise prepareSync will re-detect our changes as "new" → oscillation
2. **Handle changes during async merge** - Check if storage changed, re-merge if needed
3. **Prevent concurrent merges** - Queue incoming if already merging
4. **Deduplicate incoming** - Track lastStorageReceivedFromPhone
5. **Prevent echo** - Track lastStorageSentToPhone, skip if no real changes

**Sync flow:**
```
Local Change (e.g., complete set):
1. Update currentStorage with new storage from JS
2. Set syncStatus = pending
3. Send storage to phone (fire-and-forget via Data Layer)
   - Note: Watch storage is already "light" (never had history/stats)
4. If authenticated, sync to server:
   a. Call prepareSync(current, lastSynced, deviceId) → get delta
   b. If delta is empty, mark synced and return
   c. POST delta to /api/sync2
   d. Handle response:
      - "clean" → set lastSyncedStorage = current, mark synced
      - "dirty" → call handleIncomingStorage(serverStorage)
      - "error" → set syncStatus = error

Incoming Storage (from phone or server):
1. Skip if same as lastStorageReceivedFromPhone (dedup)
2. If already merging, queue this one
3. Call invalidateStorageCache()
4. Snapshot storageBeforeMerge = currentStorage
5. merged = mergeStorage(current, incoming, deviceId)
6. If currentStorage != storageBeforeMerge (changed during merge):
   a. Re-merge: reMerged = mergeStorage(currentStorage, merged, deviceId)
   b. currentStorage = reMerged
   c. lastSyncedStorage = reMerged
7. Else:
   a. currentStorage = merged
   b. lastSyncedStorage = merged  ← CRITICAL: not incoming!
8. Reload UI
9. Set syncStatus = synced
```

**Server API (/api/sync2):**
```kotlin
POST /api/sync2
Authorization: Bearer <token>

{
  "deviceId": "wear-abc123",
  "timestamp": 1706789000000,
  "isWatch": true,  // Server filters response (no history/stats)
  "storageUpdate": {
    "version": "20240720152051_fix_null_entries",
    "originalId": 1706788000000,  // For fast-path check
    "versions": { /* field-level version timestamps */ },
    "storage": { /* only changed fields */ }
  }
}

Response:
{ "type": "clean" }  // Server accepted our changes
{ "type": "dirty", "storage": {...} }  // Server has newer, merge needed
{ "type": "error", "error": "..." }  // Error occurred
```

### Rotary Input for Reps/Weight
```kotlin
Box(modifier = Modifier.rotaryScrollable(rotaryState)) {
    // When field selected, rotary adjusts value
    // Reps: increment/decrement by 1
    // Weight: move through validWeights array
}
```

### Phone-Side Handling (needs to be added to Android app)

**Storage is filtered for performance** (see `rfcs/watch-storage-performance.md`):
- Phone → Watch: Only current program, empty history, empty stats, filtered _versions
- Watch → Phone: Watch storage (already "light" - never received history/stats)
- Server → Watch: `isWatch: true` flag tells server to filter response

When watch sends storage to phone, the phone needs to:
1. Filter storage before sending TO watch (only current program, no history/stats)
2. Forward watch storage TO WebView for JS-side merging
3. Track lastSent/lastReceived for deduplication

```kotlin
// In new WearDataLayerService.kt (phone app)
class WearDataLayerService : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            "/liftosaur/storage" -> {
                val json = JSONObject(String(event.data))
                if (json.getString("type") == "watchStorage") {
                    val storage = json.getString("storage")
                    val deviceId = json.getString("deviceId")
                    // Forward to WebView for merging
                    sendToWebView("watchStorageMerge", storage, deviceId)
                }
            }
            "/liftosaur/requestStorage" -> sendCurrentStorageToWatch()
            "/liftosaur/requestAuth" -> sendAuthToWatch()
        }
    }

    private fun sendToWebView(type: String, storage: String, deviceId: String) {
        val script = """
            window.postMessage({
                type: '$type',
                storage: '${escapeForJs(storage)}',
                deviceId: '$deviceId'
            })
        """.trimIndent()
        // webView.evaluateJavascript(script, null)
    }

    private fun filterStorageForWatch(storage: String): String {
        // Only current program, empty history/stats, filter _versions to match
        // See iOS WatchConnectivityManager.filterStorageForWatch()
    }
}
```

## Critical Reference Files

| Purpose | File |
|---------|------|
| Watch bundle API | `liftosaur/src/watch/index.ts` |
| iOS bundle caching | `LiftosauriOS/src/LiftosaurWatch/Engine/WatchCacheManager.swift` |
| iOS engine wrapper | `LiftosauriOS/src/LiftosaurWatch/Engine/LiftosaurEngine.swift` |
| iOS watch sync manager | `LiftosauriOS/src/LiftosaurWatch/Engine/WatchSyncManager.swift` |
| iOS phone sync manager | `LiftosauriOS/src/WatchConnectivityManager.swift` |
| iOS exercise UI | `LiftosauriOS/src/LiftosaurWatch/Views/ExerciseScreen.swift` |
| Phone app (add service) | `LiftosaurAndroid/app/.../MainActivity.kt` |

## Verification Plan

1. **Unit Tests:** LiftosaurEngine JS calls, WatchSyncManager merge logic
2. **Integration:** Full workout flow, sync scenarios, auth relay
3. **Device Testing:**
   - Samsung Galaxy Watch 6 (WearOS 4, round)
   - Google Pixel Watch 2 (WearOS 4, round)
   - Samsung Galaxy Watch 4 (WearOS 3, min target)

## Potential Challenges

| Challenge | Mitigation |
|-----------|------------|
| JavaScriptEngine not supported on older WearOS | Check `isSupported()` at runtime, fall back to WebView |
| JS cold start delay | Load bundle in background during app init, show loading spinner |
| Data Layer reliability | Use DataItem for persistence, Message for real-time |
| Battery drain | Run JS only during interaction, batch syncs |
| Screen shape variety | Compose for Wear OS handles round/square |

## Dependencies

```kotlin
// AndroidX JavaScriptEngine (official Jetpack library)
implementation("androidx.javascriptengine:javascriptengine:1.0.0")

// Wear OS
implementation("androidx.wear.compose:compose-foundation:1.2.1")
implementation("androidx.wear.compose:compose-material:1.2.1")

// Wear Data Layer (phone sync)
implementation("com.google.android.gms:play-services-wearable:18.1.0")

// Health Services (heart rate)
implementation("androidx.health:health-services-client:1.0.0-rc02")
```
