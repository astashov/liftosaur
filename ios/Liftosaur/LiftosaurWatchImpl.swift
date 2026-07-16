import Foundation
import OSLog
import WatchConnectivity

@objc public class LiftosaurWatchImpl: NSObject {
  @objc public static let shared = LiftosaurWatchImpl()

  private let pendingEventsKey = "liftosaur_pending_watch_events"
  private let session: WCSession? = WCSession.isSupported() ? WCSession.default : nil
  private var eventEmitter: ((NSDictionary) -> Void)?
  private var didActivate = false

  private var lastStorageSentToWatch: String?
  private var lastStorageReceivedFromWatch: String?
  private var pendingClearAuth = false

  private var pendingLogsCompletion: ((String?) -> Void)?

  // MARK: - Setup

  @objc public func setEventEmitter(_ block: @escaping (NSDictionary) -> Void) {
    eventEmitter = block
    activateIfNeeded()
    flushPendingEvents()
  }

  private lazy var sessionDelegate: WatchSessionDelegateProxy = WatchSessionDelegateProxy(owner: self)

  @objc public func activateIfNeeded() {
    guard let session = session else { return }
    if didActivate { return }
    session.delegate = sessionDelegate
    session.activate()
    didActivate = true
    Logger.wc.info("WCSession activate called")
  }

  // MARK: - Status

  @objc public func isWatchPaired() -> Bool {
    return session?.isPaired ?? false
  }

  @objc public func isWatchAppInstalled() -> Bool {
    return session?.isWatchAppInstalled ?? false
  }

  @objc public func isWatchReachable() -> Bool {
    return session?.isReachable ?? false
  }

  // MARK: - Outbound

  @objc public func sendStorage(_ filteredStorageJson: String) {
    guard let session = session, session.activationState == .activated else {
      Logger.wc.info("sendStorage: session not activated")
      return
    }
    guard session.isPaired && session.isWatchAppInstalled else {
      Logger.wc.info("sendStorage: watch not paired or not installed")
      return
    }
    if lastStorageSentToWatch == filteredStorageJson {
      Logger.wc.info("sendStorage: identical to last sent, skipping")
      return
    }

    var message: [String: Any] = [:]
    if let compressed = StoragePayloadCompression.compressIfLarge(filteredStorageJson) {
      Logger.wc.info("sendStorage: compressing payload \(filteredStorageJson.utf8.count) -> \(compressed.count) bytes")
      message["storageZ"] = compressed
    } else {
      message["storage"] = filteredStorageJson
    }
    if pendingClearAuth {
      pendingClearAuth = false
      message["clearAuth"] = true
    }

    if session.isReachable {
      session.sendMessage(message, replyHandler: nil, errorHandler: { error in
        Logger.wc.error("sendStorage: sendMessage failed: \(error)")
        Self.logPayloadTooLarge(error: error, storageJson: filteredStorageJson, path: "sendMessage")
      })
      Logger.wc.info("sendStorage: sendMessage (reachable)")
    } else {
      do {
        try session.updateApplicationContext(message)
        Logger.wc.info("sendStorage: updateApplicationContext")
      } catch {
        Self.logPayloadTooLarge(error: error, storageJson: filteredStorageJson, path: "applicationContext")
        if session.isPaired {
          session.transferUserInfo(message)
          Logger.wc.info("sendStorage: transferUserInfo fallback")
        } else {
          Logger.wc.info("sendStorage: not paired, dropping fallback")
        }
      }
    }
    lastStorageSentToWatch = filteredStorageJson
  }

  private static func logPayloadTooLarge(error: Error, storageJson: String, path: String) {
    guard (error as? WCError)?.code == .payloadTooLarge else { return }
    let size = storageJson.utf8.count
    let breakdown = StoragePayloadCompression.sizeBreakdown(storageJson)
    Logger.wc.info("sendStorage: payload too large via \(path): total=\(size) bytes, \(breakdown)")
    LiftosaurEventReporterImpl.shared.logTelemetry(name: "phone-storage-too-large", extra: [
      "path": path,
      "size": String(size),
      "breakdown": breakdown,
    ])
  }

  @objc public func sendAuth(token: String, expiresAt: Double, userId: String?) {
    guard let session = session, session.activationState == .activated else { return }
    guard session.isPaired && session.isWatchAppInstalled else { return }
    var authData: [String: Any] = [
      "type": "auth",
      "token": token,
      "expiresAt": expiresAt
    ]
    if let userId = userId { authData["userId"] = userId }
    if session.isReachable {
      session.sendMessage(authData, replyHandler: nil)
    } else {
      session.transferUserInfo(authData)
    }
  }

  @objc public func sendNoAuth() {
    guard let session = session, session.activationState == .activated, session.isReachable else { return }
    session.sendMessage(["type": "noAuth"], replyHandler: nil)
  }

  @objc public func sendClearAuth() {
    guard let session = session, session.activationState == .activated else { return }
    guard session.isPaired && session.isWatchAppInstalled else { return }
    pendingClearAuth = true
    let payload: [String: Any] = ["type": "clearAuth"]
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil)
    }
    session.transferUserInfo(payload)
  }

  @objc public func clearStorage() {
    guard let session = session, session.activationState == .activated else { return }
    guard session.isPaired && session.isWatchAppInstalled else { return }
    let payload: [String: Any] = ["type": "clearStorage"]
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil)
    }
    session.transferUserInfo(payload)
    lastStorageSentToWatch = nil
  }

  @objc public func sendFinishWorkout(save: Bool, completion: @escaping (Bool) -> Void) {
    guard let session = session, session.activationState == .activated,
          session.isPaired && session.isWatchAppInstalled else {
      logFinishWorkoutTelemetry(save: save, watchSaved: false, reason: "not-paired", path: "unavailable")
      completion(false); return
    }
    let message: [String: Any] = ["type": "finishWorkout", "saveToHealth": save]
    if session.isReachable {
      var didComplete = false
      let done: (Bool, String?, String) -> Void = { watchSaved, reason, path in
        DispatchQueue.main.async {
          guard !didComplete else {
            // The 20s timeout closure always fires, so a second call here is normal — only a real
            // reply landing after the timeout completed is notable (the phone may have
            // double-saved); surface that in telemetry instead of dropping it silently.
            if path == "final-reply" || path == "legacy-ack" {
              self.logFinishWorkoutTelemetry(save: save, watchSaved: watchSaved, reason: reason, path: "late-\(path)")
            }
            return
          }
          didComplete = true
          let cleanup: [String: Any] = ["type": "finishWorkout", "phoneSaved": !watchSaved]
          session.transferUserInfo(cleanup)
          self.logFinishWorkoutTelemetry(save: save, watchSaved: watchSaved, reason: reason, path: path)
          completion(watchSaved)
        }
      }
      // The watch holds the reply until the HK session is actually ended and saved (typically
      // 2-8s); 20s stays under WCSession's own reply window while still bounding the fallback.
      DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
        done(false, "watch-result-timeout", "timeout")
      }
      session.sendMessage(message, replyHandler: { reply in
        let watchSaved = (reply["watchSaved"] as? Bool) ?? false
        // A reply without "final" comes from a watch build that still answers with an optimistic
        // prediction before ending the session — keep trusting it as before.
        let isFinal = (reply["final"] as? Bool) ?? false
        done(watchSaved, reply["reason"] as? String, isFinal ? "final-reply" : "legacy-ack")
      }, errorHandler: { error in
        let nsError = error as NSError
        done(false, "send-error:\(nsError.domain).\(nsError.code)", "error")
      })
    } else {
      let cleanup: [String: Any] = ["type": "finishWorkout", "phoneSaved": true]
      session.transferUserInfo(cleanup)
      logFinishWorkoutTelemetry(save: save, watchSaved: false, reason: "not-reachable", path: "unreachable")
      completion(false)
    }
  }

  private func logFinishWorkoutTelemetry(save: Bool, watchSaved: Bool, reason: String?, path: String) {
    var extra: [String: String] = [
      "result": watchSaved ? "watch-saved" : (save ? "phone-fallback" : "none"),
      "path": path,
    ]
    if let reason = reason { extra["reason"] = reason }
    LiftosaurEventReporterImpl.shared.logTelemetry(name: "phone-hk-finish", extra: extra)
  }

  @objc public func sendDiscardWorkout() {
    guard let session = session, session.activationState == .activated else { return }
    guard session.isPaired && session.isWatchAppInstalled else { return }
    let payload: [String: Any] = ["type": "discardWorkout"]
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil)
    }
    session.transferUserInfo(payload)
  }

  @objc public func requestLogs(completion: @escaping (String?) -> Void) {
    guard let session = session, session.activationState == .activated, session.isReachable else {
      completion(nil); return
    }
    session.sendMessage(["type": "requestLogs"], replyHandler: { reply in
      completion(reply["logs"] as? String)
    }, errorHandler: { _ in
      completion(nil)
    })
  }

  // MARK: - Pending events queue (persisted for backgrounded JS)

  @objc public func flushPendingEvents() {
    guard eventEmitter != nil else { return }
    let pending = loadPending()
    guard !pending.isEmpty else { return }
    clearPending()
    for item in pending { emit(item) }
  }

  private func enqueueEvent(_ event: [String: Any]) {
    if eventEmitter != nil {
      emit(event); return
    }
    var pending = loadPending()
    if let type = event["type"] as? String, ["watchStorageMerge", "reloadStorageFromDisk", "liveActivityStorage"].contains(type) {
      if let existing = pending.lastIndex(where: { ($0["type"] as? String) == type }) {
        pending[existing] = event
      } else {
        pending.append(event)
      }
    } else {
      pending.append(event)
    }
    savePending(pending)
  }

  private func emit(_ event: [String: Any]) {
    eventEmitter?(event as NSDictionary)
  }

  private func loadPending() -> [[String: Any]] {
    guard let data = UserDefaults.standard.data(forKey: pendingEventsKey),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
      return []
    }
    return arr
  }

  private func savePending(_ items: [[String: Any]]) {
    if let data = try? JSONSerialization.data(withJSONObject: items) {
      UserDefaults.standard.set(data, forKey: pendingEventsKey)
    }
  }

  private func clearPending() {
    UserDefaults.standard.removeObject(forKey: pendingEventsKey)
  }

  // ILiveActivityState (from watch JS) uses `restTimer`/`historyEntryState`;
  // LiftosaurLiveActivityImpl expects `rest`/`entry`. Map between them.
  fileprivate static func liveActivityNativeState(from jsState: [String: Any]) -> [String: Any] {
    var native: [String: Any] = [:]
    if let ts = jsState["workoutStartTimestamp"] { native["workoutStartTimestamp"] = ts }
    if let dnd = jsState["ignoreDoNotDisturb"] { native["ignoreDoNotDisturb"] = dnd }
    if let rest = jsState["restTimer"] { native["rest"] = rest }
    if let entry = jsState["historyEntryState"] { native["entry"] = entry }
    return native
  }
}

extension LiftosaurWatchImpl {
  fileprivate func handleMessage(_ message: [String: Any], replyHandler: (([String: Any]) -> Void)? = nil) {
    if message["request"] as? String == "storage" {
      enqueueEvent(["type": "requestStorage"])
      replyHandler?(["success": true])
      return
    }

    guard let type = message["type"] as? String else {
      replyHandler?(["success": false, "error": "missing type"])
      return
    }

    switch type {
    case "requestStorage":
      enqueueEvent(["type": "requestStorage"])
      replyHandler?(["success": true])

    case "requestAuth":
      enqueueEvent(["type": "requestAuth"])
      replyHandler?(["success": true])

    case "watchStorage":
      if let storageJson = StoragePayloadCompression.extractStorageJson(message) {
        if lastStorageReceivedFromWatch == storageJson {
          replyHandler?(["success": true])
          return
        }
        lastStorageReceivedFromWatch = storageJson
        let deviceId = (message["deviceId"] as? String) ?? ""
        enqueueEvent(["type": "watchStorageMerge", "storage": storageJson, "deviceId": deviceId])
      }
      replyHandler?(["success": true])

    case "updateLiveActivity":
      // Apply directly via the native LA impl so the lock-screen widget refreshes
      // even when the JS runtime is suspended (backgrounded phone).
      if let dataJson = message["data"] as? String,
         let data = dataJson.data(using: .utf8),
         let jsState = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        let nativeState = Self.liveActivityNativeState(from: jsState)
        DispatchQueue.main.async {
          LiftosaurLiveActivityImpl.shared.update(state: nativeState as NSDictionary)
        }
      }
      replyHandler?(["success": true])

    case "endWorkout":
      // Native side: end LA + cancel timer/reminder immediately so cleanup
      // happens even when the JS runtime is suspended.
      DispatchQueue.main.async {
        LiftosaurLiveActivityImpl.shared.end()
        LiftosaurTimerImpl.shared.stopTimer()
        LiftosaurTimerImpl.shared.cancelReminder()
      }
      // JS side: enqueue an event so JS module state (e.g. currentReminderDuration
      // in nativeWorkoutBridge) gets cleared. This is independent of the storage
      // merge, which isn't guaranteed in every code path on the watch.
      enqueueEvent(["type": "endWorkout"])
      replyHandler?(["success": true])

    case "watchCrashReport":
      var payload: [String: Any] = ["type": "watchCrashReport"]
      for key in ["crashType", "lastBreadcrumb", "breadcrumbs", "exceptionInfo", "deviceModel", "watchOSVersion", "bundleVersion", "lastLogs"] {
        if let v = message[key] as? String { payload[key] = v }
      }
      enqueueEvent(payload)
      replyHandler?(["success": true])

    default:
      Logger.wc.info("Unknown WCSession message type: \(type)")
      replyHandler?(["success": false, "error": "unknown type"])
    }
  }
}

fileprivate final class WatchSessionDelegateProxy: NSObject, WCSessionDelegate {
  private weak var owner: LiftosaurWatchImpl?

  init(owner: LiftosaurWatchImpl) {
    self.owner = owner
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if activationState == .activated {
      Logger.wc.info("WCSession activated")
    } else if let error = error {
      Logger.wc.error("WCSession activation failed: \(error.localizedDescription)")
    }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    owner?.handleMessage(userInfo)
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    owner?.handleMessage(applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    owner?.handleMessage(message)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    owner?.handleMessage(message, replyHandler: replyHandler)
  }
}
