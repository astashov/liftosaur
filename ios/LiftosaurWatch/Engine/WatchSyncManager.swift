//
//  WatchSyncManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import Combine
import OSLog

@MainActor
class WatchSyncManager: ObservableObject {
    static let shared = WatchSyncManager()

    private let deviceIdKey = "watch_device_id"
    private let lastSyncedStorageKey = "liftosaur_last_synced_storage"
    private let currentStorageKey = "liftosaur_storage"
    private let pendingIncomingStorageKey = "liftosaur_pending_incoming_storage"

    @Published var syncStatus: SyncStatus = .synced

    // Track if sync is in progress to avoid concurrent syncs
    private var isSyncing = false

    // Track if incoming storage processing is in progress to prevent concurrent merges
    private var isProcessingIncoming = false
    // Queue the latest incoming storage if one arrives while processing
    private var queuedIncomingStorage: String?

    // Last storage received from phone - used for dedup of incoming messages
    private var lastStorageReceivedFromPhone: String?

    // Last storage sent to phone - used to detect if we have new changes to send
    // We track what we SENT (not received) because after merging phone storage,
    // watch's _versions differ from phone's even if content is identical.
    private var lastStorageSentToPhone: String?

    enum SyncStatus: Equatable {
        case synced
        case pending
        case syncing
        case error(String)
    }

    let deviceId: String

    private init() {
        // Generate or load persistent device ID
        if let saved = UserDefaults.standard.string(forKey: deviceIdKey) {
            deviceId = saved
        } else {
            deviceId = "watch-\(UUID().uuidString.prefix(8))"
            UserDefaults.standard.set(deviceId, forKey: deviceIdKey)
        }
        Logger.sync.info(" deviceId = \(deviceId)")
    }

    var currentStorage: String? {
        get { WatchStorageManager.shared.loadString(forKey: currentStorageKey) }
        set {
            if let value = newValue {
                WatchStorageManager.shared.saveString(value, forKey: currentStorageKey)
            } else {
                WatchStorageManager.shared.removeValue(forKey: currentStorageKey)
            }
        }
    }

    var lastSyncedStorage: String? {
        get { WatchStorageManager.shared.loadString(forKey: lastSyncedStorageKey) }
        set {
            if let value = newValue {
                WatchStorageManager.shared.saveString(value, forKey: lastSyncedStorageKey)
            } else {
                WatchStorageManager.shared.removeValue(forKey: lastSyncedStorageKey)
            }
        }
    }

    /// Returns the originalId (timestamp in ms) from current storage, or nil if not available
    var storageOriginalId: Double? {
        guard let storage = currentStorage,
              let data = storage.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let originalId = json["originalId"] as? Double else {
            return nil
        }
        return originalId
    }

    private var pendingIncomingStorage: String? {
        get { WatchStorageManager.shared.loadString(forKey: pendingIncomingStorageKey) }
        set {
            if let value = newValue {
                WatchStorageManager.shared.saveString(value, forKey: pendingIncomingStorageKey)
            } else {
                WatchStorageManager.shared.removeValue(forKey: pendingIncomingStorageKey)
            }
        }
    }

    // Called when watch makes a local change (e.g., completes a set)
    func recordLocalChange(newStorage: String) {
        currentStorage = newStorage

        guard lastSyncedStorage != nil else {
            // No last synced storage - this is first sync, just save as baseline
            Logger.sync.info(" no lastSyncedStorage, saving as initial")
            lastSyncedStorage = newStorage
            return
        }

        // Trigger sync
        syncStatus = .pending
        attemptSync()
    }

    // Called when receiving storage from phone or server
    // Runs heavy JS merge on background thread to avoid blocking UI
    func handleIncomingStorage(_ storageJson: String) async {
        WatchCrashReporter.shared.reportMemory("incoming_storage_start (\(storageJson.count) bytes)")

        // Skip if this is the same storage we just received (dedup multiple delivery methods)
        if lastStorageReceivedFromPhone == storageJson {
            Logger.sync.info(" skipping duplicate incoming storage")
            return
        }

        // If already processing, queue this one (keeping only the latest)
        // This prevents concurrent merges which can cause race conditions
        if isProcessingIncoming {
            Logger.sync.info(" already processing incoming storage, queuing for later")
            queuedIncomingStorage = storageJson
            return
        }

        isProcessingIncoming = true
        defer {
            isProcessingIncoming = false
            // Process queued storage if any arrived while we were processing
            if let queued = queuedIncomingStorage {
                queuedIncomingStorage = nil
                Logger.sync.info(" processing queued incoming storage")
                Task { await handleIncomingStorage(queued) }
            }
        }

        // Remember what phone sent - used to detect if we have new changes to send back
        lastStorageReceivedFromPhone = storageJson

        guard let engine = WorkoutManager.shared.engine else {
            // Engine not ready yet - store incoming for later merge
            // DON'T overwrite currentStorage - it may have local changes that need to be preserved
            Logger.sync.info(" engine not ready, queuing incoming storage for later merge")
            pendingIncomingStorage = storageJson
            return
        }

        // Show syncing indicator during merge
        syncStatus = .syncing

        // Invalidate cache since we're receiving external data (on background JS queue)
        await engine.invalidateStorageCache()

        Logger.sync.info(" === INCOMING STORAGE ===")
        logProgressEntries(storageJson, label: "INCOMING")

        if let current = currentStorage, !current.isEmpty {
            Logger.sync.info(" === WATCH CURRENT STORAGE ===")
            logProgressEntries(current, label: "WATCH")

            let storageBeforeMerge = current

            if let merged = await engine.mergeStorage(
                currentStorageJson: current,
                incomingStorageJson: storageJson,
                deviceId: deviceId
            ) {
                Logger.sync.info(" === MERGED RESULT ===")
                logProgressEntries(merged, label: "MERGED")
                Logger.sync.info(" merged incoming storage")

                // CRITICAL: Check if currentStorage changed during the async merge
                // This can happen if user completes a set while merge is running.
                // If changed, we need to re-merge to avoid losing those changes.
                if currentStorage != storageBeforeMerge, let latestStorage = currentStorage {
                    Logger.sync.info(" storage changed during merge, re-merging with latest changes")
                    logProgressEntries(latestStorage, label: "CHANGED_DURING_MERGE")

                    // Re-merge: merge the latest local changes with our merge result
                    // latestStorage has changes made during merge, merged has incoming changes applied
                    if let reMerged = await engine.mergeStorage(
                        currentStorageJson: latestStorage,
                        incomingStorageJson: merged,
                        deviceId: deviceId
                    ) {
                        Logger.sync.info(" === RE-MERGED RESULT ===")
                        logProgressEntries(reMerged, label: "RE-MERGED")
                        currentStorage = reMerged
                        lastSyncedStorage = reMerged
                    } else {
                        // Re-merge failed, use latest storage to preserve local changes
                        Logger.sync.info(" re-merge failed, keeping latest storage")
                        lastSyncedStorage = latestStorage
                    }
                } else {
                    currentStorage = merged
                    // CRITICAL: Use merged as the baseline, not incoming!
                    // Otherwise prepareSync will re-detect our own local changes as "new"
                    // and send them again, causing oscillation.
                    lastSyncedStorage = merged
                }
            } else {
                Logger.sync.info(" merge failed, using incoming")
                currentStorage = storageJson
                lastSyncedStorage = storageJson
            }
        } else {
            Logger.sync.info(" no current storage, using incoming directly")
            currentStorage = storageJson
            lastSyncedStorage = storageJson
        }

        WatchCrashReporter.shared.reportMemory("after_storage_merge")

        // Capture old workout state before reloading
        let oldWorkout = WorkoutManager.shared.activeWorkout

        // Reload subscription status and workouts to reflect storage changes in UI.
        // loadActiveWorkout fires reconcileHealth(.sync), which (re)starts a session for an active
        // workout and ends an orphaned session when there's none.
        await WorkoutManager.shared.checkSubscription()
        await WorkoutManager.shared.loadNextWorkout()
        await WorkoutManager.shared.loadActiveWorkout()

        // Check if any sets became complete during sync
        if let oldWorkout = oldWorkout, let newWorkout = WorkoutManager.shared.activeWorkout {
            var completedSetInfo: (exerciseIndex: Int, setIndex: Int)? = nil
            for (exerciseIndex, (oldEx, newEx)) in zip(oldWorkout.exercises, newWorkout.exercises).enumerated() {
                for (setIndex, (oldSet, newSet)) in zip(oldEx.sets, newEx.sets).enumerated() {
                    if oldSet.isCompleted != true && newSet.isCompleted == true {
                        completedSetInfo = (exerciseIndex, setIndex)
                        break
                    }
                }
                if completedSetInfo != nil { break }
            }
            if let info = completedSetInfo {
                Logger.sync.info(" detected set completion during sync: exercise \(info.exerciseIndex), set \(info.setIndex)")
                WorkoutManager.shared.setsCompletedDuringSync = CompletedSetInfo(entryIndex: info.exerciseIndex, setIndex: info.setIndex)
            }
        } else {
            Logger.sync.info(" skipped set completion check: oldWorkout=\(oldWorkout != nil), newWorkout=\(WorkoutManager.shared.activeWorkout != nil)")
        }

        // Send merged storage back to phone for bidirectional sync.
        // This ensures phone receives watch's changes that may have been discarded
        // while phone was in background. The hasChangesToSend check in notifyPhone()
        // prevents infinite echo loops - once both sides have identical data, no more
        // changes will be detected.
        Logger.sync.info(" sending merged storage back to phone")
        notifyPhone()

        // Mark sync complete
        syncStatus = .synced
    }

    private func logProgressEntries(_ storageJson: String, label: String) {
        guard let data = storageJson.data(using: .utf8),
              let storage = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let progressArray = storage["progress"] as? [[String: Any]],
              let progress = progressArray.first,
              let entries = progress["entries"] as? [[String: Any]] else {
            Logger.sync.info(" [\(label)] no progress entries found")
            return
        }

        let dayName = progress["dayName"] as? String ?? "unknown"
        Logger.sync.info(" [\(label)] dayName: \(dayName)")

        // Extract version tree for sets: _versions.progress.items.<startTime>.entries.items.<entryId>.sets.items.<setId>
        let versions = storage["_versions"] as? [String: Any]
        let progressVersions = versions?["progress"] as? [String: Any]
        let progressItems = progressVersions?["items"] as? [String: Any]
        let startTime = progress["startTime"]
        let startTimeKey = startTime != nil ? "\(startTime!)" : nil
        let progressItemVersion = startTimeKey != nil ? progressItems?[startTimeKey!] as? [String: Any] : nil
        let entriesVersions = progressItemVersion?["entries"] as? [String: Any]
        let entriesItems = entriesVersions?["items"] as? [String: Any]

        for (index, entry) in entries.enumerated() {
            let exercise = entry["exercise"] as? [String: Any]
            let exerciseId = exercise?["id"] as? String ?? "unknown"
            let sets = entry["sets"] as? [[String: Any]] ?? []
            let entryId = entry["id"] as? String
            let entryVersionObj = entryId != nil ? entriesItems?[entryId!] as? [String: Any] : nil
            let setsVersions = entryVersionObj?["sets"] as? [String: Any]
            let setsItems = setsVersions?["items"] as? [String: Any]

            var setsInfo: [String] = []
            for (setIndex, set) in sets.enumerated() {
                let id = set["id"] as? String ?? "nil"
                let completedReps = set["completedReps"] as? Int
                let isCompleted = set["isCompleted"] as? Bool ?? false
                let repsStr = completedReps != nil ? "\(completedReps!)" : "nil"

                // Get version for this set
                var versionStr = "noVer"
                if let setVersion = setsItems?[id] {
                    if let vc = setVersion as? [String: Any], let vcMap = vc["vc"] as? [String: Any], let t = vc["t"] {
                        let vcPairs = vcMap.map { "\($0.key):\($0.value)" }.sorted().joined(separator: ",")
                        versionStr = "vc:{\(vcPairs)},t:\(t)"
                    } else if let ts = setVersion as? NSNumber {
                        versionStr = "t:\(ts)"
                    }
                }

                setsInfo.append("s\(setIndex):[\(id),\(repsStr),\(isCompleted),\(versionStr)]")
            }

            Logger.sync.info(" [\(label)] entry[\(index)]: \(exerciseId) - \(setsInfo.joined(separator: ", "))")
        }
    }

    // Called after engine is initialized - request fresh storage from phone
    // (we no longer queue pending storage since stale storage can cause data loss)
    func processPendingIncomingStorage() async {
        // Clear any legacy pending storage that might exist
        if pendingIncomingStorage != nil {
            Logger.sync.info(" clearing legacy pending storage")
            pendingIncomingStorage = nil
        }

        WatchCrashReporter.shared.writeBreadcrumb("migrate_storage_start")
        await migrateStorageIfNeeded()
        WatchCrashReporter.shared.writeBreadcrumb("migrate_storage_done")

        // Request fresh storage from phone now that engine is ready
        Logger.sync.info(" engine ready, requesting fresh storage from phone")
        WatchConnectivityManager.shared.requestStorage()
    }

    private func migrateStorageIfNeeded() async {
        guard let engine = WorkoutManager.shared.engine,
              let storage = currentStorage else {
            return
        }

        guard let resultJson = await engine.runMigrations(storageJson: storage),
              let resultData = resultJson.data(using: .utf8),
              let result = try? JSONSerialization.jsonObject(with: resultData) as? [String: Any],
              let success = result["success"] as? Bool, success,
              let migratedData = result["data"] else {
            return
        }

        // data is null when no migrations were needed
        if migratedData is NSNull {
            return
        }

        guard let migratedStorageData = try? JSONSerialization.data(withJSONObject: migratedData),
              let migratedJson = String(data: migratedStorageData, encoding: .utf8) else {
            return
        }

        Logger.sync.info(" migrated on-disk storage to latest version")
        currentStorage = migratedJson
    }

    func attemptSync() {
        // Avoid concurrent syncs
        guard !isSyncing else {
            return
        }

        // Always send full storage to phone (fire-and-forget)
        notifyPhone()

        // Server sync is authoritative when authenticated
        // Use slight delay to let UI operations complete first (they share the JS queue)
        if AuthManager.shared.isAuthenticated {
            Task {
                try? await Task.sleep(nanoseconds: 100_000_000) // 100ms delay
                await syncViaServer()
            }
        } else {
            // Not authenticated - rely on phone sync only
            // Mark as synced since phone sync is fire-and-forget and we can't do more without auth
            Logger.sync.info(" not authenticated, relying on phone sync only")
            syncStatus = .synced
        }
    }

    // Send full storage to phone for merging (simpler than deltas, self-healing)
    private func notifyPhone() {
        guard let storage = currentStorage else { return }

        // Skip if no meaningful changes compared to what we last sent
        // This prevents echo: after merging phone data, if we send back and phone echoes,
        // the next merge should be idempotent, so current == lastSent, and we stop.
        if let lastSent = lastStorageSentToPhone,
           let engine = WorkoutManager.shared.engine {
            Task {
                // Small delay to let UI operations complete first (they share the JS queue)
                try? await Task.sleep(nanoseconds: 50_000_000) // 50ms delay
                if let updateJson = await engine.prepareSync(
                    currentStorageJson: storage,
                    lastSyncedStorageJson: lastSent,
                    deviceId: deviceId
                ),
                   let data = updateJson.data(using: .utf8),
                   let update = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let storageFields = update["storage"] as? [String: Any] ?? [:]
                    let versions = update["versions"] as? [String: Any] ?? [:]

                    if storageFields.isEmpty && versions.isEmpty {
                        Logger.sync.info(" skipping send to phone - no new changes compared to last sent")
                        return
                    }
                }

                // Has changes, send to phone
                Logger.sync.info(" sending full storage to phone")
                WatchConnectivityManager.shared.sendStorage(storage, deviceId: self.deviceId)
                self.lastStorageSentToPhone = storage
            }
        } else {
            // No last sent storage or no engine, just send
            Logger.sync.info(" sending full storage to phone")
            WatchConnectivityManager.shared.sendStorage(storage, deviceId: deviceId)
            lastStorageSentToPhone = storage
        }
    }

    // Fetch full storage from server using sync2 (for initial sync when phone unavailable)
    func fetchStorageFromServer() async -> Bool {
        guard AuthManager.shared.isAuthenticated,
              let token = AuthManager.shared.token else {
            Logger.sync.info(" not authenticated for storage fetch")
            return false
        }

        guard let engine = WorkoutManager.shared.engine else {
            Logger.sync.info(" engine not available for storage fetch")
            return false
        }

        // Get the correct migration version from the JS engine
        guard let version = await engine.getLatestMigrationVersion() else {
            Logger.sync.info(" failed to get migration version")
            return false
        }

        // Build the API URL
        var components = URLComponents(url: baseApiUrl, resolvingAgainstBaseURL: false)!
        components.path = "/api/sync2"
        guard let url = components.url else {
            Logger.sync.info(" invalid API URL for storage fetch")
            return false
        }

        // Build storageUpdate with version and originalId (if we have existing storage)
        var storageUpdate: [String: Any] = ["version": version]

        // Include originalId from current storage if available (for fast path check)
        if let current = currentStorage,
           let currentData = current.data(using: .utf8),
           let currentJson = try? JSONSerialization.jsonObject(with: currentData) as? [String: Any],
           let originalId = currentJson["originalId"] {
            storageUpdate["originalId"] = originalId
        }

        let body: [String: Any] = [
            "storageUpdate": storageUpdate,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "deviceId": deviceId,
            "isWatch": true  // Server filters response for watch (no history/stats)
        ]

        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            Logger.sync.info(" failed to encode fetch request")
            return false
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = bodyData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        Logger.sync.info(" fetching storage from server via sync2")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                Logger.sync.info(" invalid response")
                return false
            }

            Logger.sync.info(" fetch response status: \(httpResponse.statusCode)")

            guard httpResponse.statusCode == 200 else {
                Logger.sync.info(" fetch failed with status: \(httpResponse.statusCode)")
                return false
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else {
                Logger.sync.info(" invalid response format")
                return false
            }

            if type == "dirty",
               let storage = json["storage"],
               let storageData = try? JSONSerialization.data(withJSONObject: storage),
               let storageJson = String(data: storageData, encoding: .utf8) {
                Logger.sync.info(" fetched storage from server (\(storageJson.count) bytes)")
                // Use handleIncomingStorage to properly merge with any local changes
                await handleIncomingStorage(storageJson)
                return true
            } else if type == "clean" {
                Logger.sync.info(" server has no storage for user")
                return false
            } else if type == "error" {
                let errorMsg = json["error"] as? String ?? "Unknown error"
                Logger.sync.info(" fetch error: \(errorMsg)")
                return false
            }

            return false

        } catch {
            Logger.sync.info(" fetch failed: \(error)")
            return false
        }
    }

    private func syncViaServer() async {
        guard !isSyncing else {
            Logger.sync.info(" sync already in progress")
            return
        }

        isSyncing = true

        // Snapshot storage before sync to detect if changes happen during sync
        let storageBeforeSync = currentStorage

        defer {
            isSyncing = false

            // Check if storage changed during sync - if so, trigger another sync
            // This catches changes that were skipped because isSyncing was true
            if currentStorage != storageBeforeSync {
                Logger.sync.info(" storage changed during sync, triggering re-sync")
                Task { @MainActor in
                    self.attemptSync()
                }
            }
        }

        syncStatus = .syncing

        guard let token = AuthManager.shared.token else {
            Logger.sync.info(" no auth token for server sync")
            syncStatus = .error("Not authenticated")
            return
        }

        guard let engine = WorkoutManager.shared.engine else {
            Logger.sync.info(" engine not available for sync")
            syncStatus = .error("Engine not ready")
            return
        }

        // Snapshot current storage before sync - this is what we'll send
        guard let snapshotStorage = currentStorage,
              let lastSynced = lastSyncedStorage else {
            Logger.sync.info(" no storage to sync")
            syncStatus = .synced
            return
        }

        // Validate that storage belongs to the authenticated user
        if let authUserId = AuthManager.shared.userId,
           let storageData = snapshotStorage.data(using: .utf8),
           let storageJson = try? JSONSerialization.jsonObject(with: storageData) as? [String: Any],
           let storageTempUserId = storageJson["tempUserId"] as? String {
            if authUserId != storageTempUserId {
                Logger.sync.info(" userId mismatch: auth=\(authUserId), storage=\(storageTempUserId)")
                syncStatus = .error("Account mismatch")
                return
            }
        }

        // Compute delta on the fly (no pre-computed queue)
        guard let updateJson = await engine.prepareSync(
            currentStorageJson: snapshotStorage,
            lastSyncedStorageJson: lastSynced,
            deviceId: deviceId
        ) else {
            Logger.sync.info(" prepareSync failed")
            syncStatus = .error("Failed to prepare sync")
            return
        }

        // Check if there are actual changes
        guard let updateData = updateJson.data(using: .utf8),
              let update = try? JSONSerialization.jsonObject(with: updateData) as? [String: Any] else {
            Logger.sync.info(" failed to parse update")
            syncStatus = .synced
            return
        }

        let storage = update["storage"] as? [String: Any] ?? [:]
        let versions = update["versions"] as? [String: Any] ?? [:]

        if storage.isEmpty && versions.isEmpty {
            Logger.sync.info(" no changes to sync")
            syncStatus = .synced
            return
        }

        Logger.sync.info(" syncing \(storage.keys.count) storage fields, \(versions.keys.count) version fields")

        // Build the API URL
        var components = URLComponents(url: baseApiUrl, resolvingAgainstBaseURL: false)!
        components.path = "/api/sync2"
        guard let url = components.url else {
            syncStatus = .error("Invalid API URL")
            return
        }

        // Build request body
        let body: [String: Any] = [
            "storageUpdate": update,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "deviceId": deviceId,
            "isWatch": true  // Server filters response for watch (no history/stats)
        ]

        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
            syncStatus = .error("Failed to encode request")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = bodyData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        Logger.sync.info(" sending sync to server at \(url)")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                syncStatus = .error("Invalid response")
                return
            }

            Logger.sync.info(" server response status: \(httpResponse.statusCode)")

            guard httpResponse.statusCode == 200 else {
                syncStatus = .error("Server error: \(httpResponse.statusCode)")
                return
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else {
                syncStatus = .error("Invalid response format")
                return
            }

            switch type {
            case "clean":
                Logger.sync.info(" server sync clean")
                // Use snapshot as the new baseline (not currentStorage which may have changed)
                lastSyncedStorage = snapshotStorage
                syncStatus = .synced
                // Note: defer block handles re-sync if storage changed during sync

            case "dirty":
                Logger.sync.info(" server has newer data, merging")
                if let serverStorageData = try? JSONSerialization.data(withJSONObject: json["storage"] ?? [:]),
                   let serverStorageJson = String(data: serverStorageData, encoding: .utf8) {
                    await handleIncomingStorage(serverStorageJson)
                    syncStatus = .synced
                } else {
                    syncStatus = .error("Failed to parse server storage")
                }

            case "error":
                let errorMsg = json["error"] as? String ?? "Unknown error"
                Logger.sync.info(" server sync error: \(errorMsg)")
                syncStatus = .error(errorMsg)

            default:
                Logger.sync.info(" unknown response type: \(type)")
                syncStatus = .error("Unknown response")
            }

        } catch {
            Logger.sync.info(" server sync failed: \(error)")
            syncStatus = .error("Network error")
        }
    }

    // MARK: - Clear Storage (for account switch)

    func clearAllStorage() {
        Logger.sync.info(" clearing all storage for account switch")

        // Clear current and last synced storage
        currentStorage = nil
        lastSyncedStorage = nil

        // Clear pending incoming storage
        pendingIncomingStorage = nil

        // Reset sync status
        syncStatus = .synced

        Logger.sync.info(" storage cleared")
    }
}
