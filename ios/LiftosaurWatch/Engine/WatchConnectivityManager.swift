//
//  WatchConnectivityManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import WatchConnectivity
import Combine
import OSLog

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()

    private let session: WCSession? = WCSession.isSupported() ? WCSession.default : nil
    private var authRetryCount = 0
    private let maxAuthRetries = 3
    private var pendingCrashReport: [String: String]?

    #if DEBUG
    // Debug: set to true to simulate phone being unreachable
    @Published var debugForceUnreachable = false
    #endif

    // Use live value from WCSession instead of relying on callback
    var isReachable: Bool {
        #if DEBUG
        if debugForceUnreachable { return false }
        #endif
        return session?.isReachable ?? false
    }

    override init() {
        super.init()
        Logger.wc.info(" initializing")
        session?.delegate = self
        session?.activate()
    }

    func requestStorage() {
        guard let session = session else { return }
        Logger.wc.info(" requesting storage from phone (reachable: \(session.isReachable))")
        session.sendMessage(["type": "requestStorage"], replyHandler: nil) { error in
            Logger.wc.info(" requestStorage failed: \(error.localizedDescription)")
        }
    }

    func requestAuth() {
        guard let session = session else { return }
        Logger.wc.info(" requesting auth from phone (reachable: \(session.isReachable))")
        session.sendMessage(["type": "requestAuth"], replyHandler: nil) { error in
            Logger.wc.info(" requestAuth failed: \(error.localizedDescription)")
        }
    }

    /// Send full storage to phone for merging (simpler than deltas, self-healing)
    func sendStorage(_ storageJson: String, deviceId: String) {
        guard let session = session else {
            return
        }

        var message: [String: Any] = [
            "type": "watchStorage",
            "deviceId": deviceId
        ]
        if let compressed = StoragePayloadCompression.compressIfLarge(storageJson) {
            Logger.wc.info(" compressing storage payload: \(storageJson.utf8.count) -> \(compressed.count) bytes")
            message["storageZ"] = compressed
        } else {
            message["storage"] = storageJson
        }

        if self.isReachable {
            session.sendMessage(message, replyHandler: nil, errorHandler: { error in
                Logger.wc.info(" failed to send storage: \(error)")
                Self.logPayloadTooLarge(error: error, storageJson: storageJson, path: "sendMessage")
            })
        } else {
            // Use updateApplicationContext to keep only the latest (not transferUserInfo which queues all)
            // Since sync computes diffs from current state, only the latest matters
            Logger.wc.info(" phone not reachable, updating application context with latest storage")
            do {
                try session.updateApplicationContext(message)
            } catch {
                // Fall back to transferUserInfo if applicationContext fails (e.g., size limit)
                Logger.wc.info(" applicationContext failed (\(error)), falling back to transferUserInfo")
                Self.logPayloadTooLarge(error: error, storageJson: storageJson, path: "applicationContext")
                session.transferUserInfo(message)
            }
        }
    }

    /// The ~64KB WCSession payload cap silently kills the direct watch->phone sync channel once
    /// storage outgrows it, so log WHAT outgrew it (per-top-level-key sizes), not just that it did.
    private static func logPayloadTooLarge(error: Error, storageJson: String, path: String) {
        guard (error as? WCError)?.code == .payloadTooLarge else { return }
        let size = storageJson.utf8.count
        let breakdown = StoragePayloadCompression.sizeBreakdown(storageJson)
        Logger.wc.info(" storage payload too large via \(path): total=\(size) bytes, \(breakdown)")
        WatchEventManager.shared.logNativeEvent(name: "watch-storage-too-large", extra: [
            "path": path,
            "size": String(size),
            "breakdown": breakdown,
        ])
    }

    func sendLiveActivityUpdate(_ message: [String: String]) {
        guard let session = session else {
            Logger.wc.info(" sendLiveActivityUpdate: no session")
            return
        }

        var liveActivityMessage: [String: Any] = ["type": "updateLiveActivity"]
        for (key, value) in message {
            liveActivityMessage[key] = value
        }

        if self.isReachable {
            Logger.wc.info(" sending live activity update to phone")
            session.sendMessage(liveActivityMessage, replyHandler: nil, errorHandler: { error in
                Logger.wc.info(" failed to send live activity update: \(error)")
            })
        } else {
            // Queue for later via transferUserInfo so phone updates when it wakes
            Logger.wc.info(" phone not reachable, queuing live activity update")
            session.transferUserInfo(liveActivityMessage)
        }
    }

    func sendCrashReport(_ report: [String: String]) {
        guard let session = session else { return }
        guard session.activationState == .activated else {
            Logger.wc.info(" WCSession not activated yet, queuing crash report")
            pendingCrashReport = report
            return
        }
        var message: [String: Any] = ["type": "watchCrashReport"]
        for (key, value) in report {
            message[key] = value
        }
        Logger.wc.info(" sending crash report to phone via transferUserInfo")
        session.transferUserInfo(message)
    }

    func sendEndWorkout() {
        guard let session = session else {
            Logger.wc.info(" sendEndWorkout: no session")
            return
        }

        let message: [String: Any] = ["type": "endWorkout"]

        if self.isReachable {
            Logger.wc.info(" sending endWorkout to phone")
            session.sendMessage(message, replyHandler: nil, errorHandler: { error in
                Logger.wc.info(" failed to send endWorkout: \(error)")
            })
        } else {
            // Queue for later via transferUserInfo so phone ends live activity when it wakes
            Logger.wc.info(" phone not reachable, queuing endWorkout")
            session.transferUserInfo(message)
        }
    }
}

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Logger.wc.info(" activation completed with state: \(activationState.rawValue), error: \(String(describing: error)), isReachable: \(session.isReachable)")

        // Note: auth/storage requests are handled in sessionReachabilityDidChange when phone becomes reachable

        // Send any crash report that was queued before activation
        if activationState == .activated, let report = pendingCrashReport {
            pendingCrashReport = nil
            sendCrashReport(report)
        }

        // Check for received context AFTER activation completes
        if activationState == .activated {
            let context = session.receivedApplicationContext
            Logger.wc.info(" receivedApplicationContext has \(context.count) keys: \(context.keys)")
            if let storageJson = StoragePayloadCompression.extractStorageJson(context) {
                Logger.wc.info(" found storage in receivedApplicationContext (\(storageJson.count) bytes)")
                Task { @MainActor in
                    await WatchSyncManager.shared.handleIncomingStorage(storageJson)
                }
            } else {
                Logger.wc.info(" no storage in receivedApplicationContext")
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        Logger.wc.info(" reachability changed to \(session.isReachable), effective: \(self.isReachable)")

        // When phone becomes reachable, always request fresh auth and storage
        if self.isReachable {
            Logger.wc.info(" phone became reachable, requesting auth and storage")
            // Reset retry counter when phone becomes reachable (fresh start)
            authRetryCount = 0
            requestAuth()
            requestStorage()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Logger.wc.info(" didReceiveApplicationContext")
        handleIncomingData(applicationContext)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Logger.wc.info(" didReceiveMessage with keys: \(message.keys)")
        handleIncomingData(message)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        Logger.wc.info(" didReceiveMessage (with reply): \(message.keys)")
        if message["type"] as? String == "requestLogs" {
            Task { @MainActor in
                let logs = LogFileManager.shared.readLogs()
                Logger.wc.info(" sending logs to phone (\(logs.count) bytes)")
                replyHandler(["logs": logs])
            }
            return
        }
        if message["type"] as? String == "finishWorkout" {
            let saveToHealth = message["saveToHealth"] as? Bool ?? true
            Logger.wc.info(" received finishWorkout from phone (with reply), saveToHealth: \(saveToHealth)")
            Task { @MainActor in
                WorkoutManager.shared.clearWorkoutState()
                // Hold the reply until the session is ACTUALLY ended/saved, so the phone decides
                // its estimated-calories fallback on the real outcome instead of a prediction (the
                // old optimistic reply lost the workout entirely when the save later failed). The
                // phone waits 20s, well within WCSession's reply window; "final" marks the reply
                // as a real result vs the old protocol's prediction.
                let result = await WorkoutManager.shared.finishHealthSession(save: saveToHealth)
                let saved = saveToHealth && result.saved
                let reason = saveToHealth ? result.reason : "save-disabled"
                var reply: [String: Any] = ["watchSaved": saved, "final": true]
                if let reason = reason { reply["reason"] = reason }
                Logger.wc.info(" replying watchSaved=\(saved), reason=\(reason ?? "none")")
                replyHandler(reply)
                var extra = ["saved": String(saved), "trigger": "phone"]
                if let reason = reason { extra["reason"] = reason }
                WatchEventManager.shared.logNativeEvent(name: "watch-hk-finish", extra: extra)
            }
            return
        }
        handleIncomingData(message)
        replyHandler(["success": true])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        Logger.wc.info(" didReceiveUserInfo with keys: \(userInfo.keys)")
        handleIncomingData(userInfo)
    }

    private func handleIncomingData(_ data: [String: Any]) {
        // Handle auth token
        if data["type"] as? String == "auth",
           let token = data["token"] as? String {
            let expiresAt = data["expiresAt"] as? Double ?? 0
            let userId = data["userId"] as? String
            AuthManager.shared.updateAuth(token: token, expiresAt: expiresAt, userId: userId)
            // Invalidate storage cache when auth changes (new user may have different data)
            // Run on background JS queue to avoid blocking
            Task { @MainActor in
                await WorkoutManager.shared.engine?.invalidateStorageCache()
            }
            // Reset retry counter on successful auth
            authRetryCount = 0
        }

        // Handle clear auth (user explicitly logged out on phone)
        // Can come as type: "clearAuth" (standalone message) or clearAuth: true (bundled with storage)
        if data["type"] as? String == "clearAuth" || data["clearAuth"] as? Bool == true {
            Logger.wc.info(" received clearAuth, clearing local auth")
            AuthManager.shared.clearAuth()
            // Also invalidate storage cache when auth changes
            // Run on background JS queue to avoid blocking
            Task { @MainActor in
                await WorkoutManager.shared.engine?.invalidateStorageCache()
            }
        }

        // Handle noAuth (phone has no auth cookie yet - possibly race condition)
        // Watch keeps its current auth state; retry if we need auth
        if data["type"] as? String == "noAuth" {
            Logger.wc.info(" received noAuth - phone has no auth cookie yet (retry \(authRetryCount)/\(maxAuthRetries))")
            if !AuthManager.shared.isAuthenticated && authRetryCount < maxAuthRetries {
                // We don't have auth and phone doesn't either (yet)
                // Schedule a retry after a delay
                authRetryCount += 1
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                    if !AuthManager.shared.isAuthenticated && (self?.isReachable ?? false) {
                        Logger.wc.info(" retrying auth request after noAuth")
                        self?.requestAuth()
                    }
                }
            }
        }

        // Handle clear storage (user switched accounts on phone)
        if data["type"] as? String == "clearStorage" {
            Logger.wc.info(" received clearStorage, clearing local storage")
            DispatchQueue.main.async {
                WatchSyncManager.shared.clearAllStorage()
                WorkoutManager.shared.reloadAfterStorageClear()
            }
        }

        // Handle storage
        if let storageJson = StoragePayloadCompression.extractStorageJson(data) {
            Logger.wc.info(" received storage (\(storageJson.count) bytes)")
            Task { @MainActor in
                await WatchSyncManager.shared.handleIncomingStorage(storageJson)
            }
        }

        // Handle finish workout via transferUserInfo (guaranteed delivery backup)
        // phoneSaved=true means the phone already saved to HealthKit, so watch should not save
        if data["type"] as? String == "finishWorkout" {
            let phoneSaved = data["phoneSaved"] as? Bool ?? false
            Logger.wc.info(" received finishWorkout via transferUserInfo, phoneSaved: \(phoneSaved)")
            Task { @MainActor in
                WorkoutManager.shared.clearWorkoutState()
                await WorkoutManager.shared.reconcileHealth(.finish(save: !phoneSaved))
            }
        }

        // Handle discard workout (phone discarded workout, don't save HK session)
        if data["type"] as? String == "discardWorkout" {
            Logger.wc.info(" received discardWorkout from phone")
            Task { @MainActor in
                WorkoutManager.shared.clearWorkoutState()
                await WorkoutManager.shared.reconcileHealth(.discard)
            }
        }
    }
}
