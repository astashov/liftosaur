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

  private var pendingFinishWorkoutCompletion: ((Bool) -> Void)?
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

    var message: [String: Any] = ["storage": filteredStorageJson]
    if pendingClearAuth {
      pendingClearAuth = false
      message["clearAuth"] = true
    }

    if session.isReachable {
      session.sendMessage(message, replyHandler: nil)
      Logger.wc.info("sendStorage: sendMessage (reachable)")
    } else {
      do {
        try session.updateApplicationContext(message)
        Logger.wc.info("sendStorage: updateApplicationContext")
      } catch {
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

  @objc public func sendFinishWorkout(completion: @escaping (Bool) -> Void) {
    guard let session = session, session.activationState == .activated,
          session.isPaired && session.isWatchAppInstalled else {
      completion(false); return
    }
    let message: [String: Any] = ["type": "finishWorkout"]
    if session.isReachable {
      var didComplete = false
      let done: (Bool) -> Void = { watchSaved in
        DispatchQueue.main.async {
          guard !didComplete else { return }
          didComplete = true
          let cleanup: [String: Any] = ["type": "finishWorkout", "phoneSaved": !watchSaved]
          session.transferUserInfo(cleanup)
          completion(watchSaved)
        }
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
        done(false)
      }
      session.sendMessage(message, replyHandler: { reply in
        done((reply["watchSaved"] as? Bool) ?? false)
      }, errorHandler: { _ in
        done(false)
      })
    } else {
      let cleanup: [String: Any] = ["type": "finishWorkout", "phoneSaved": true]
      session.transferUserInfo(cleanup)
      completion(false)
    }
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
      if let storageJson = message["storage"] as? String {
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
      if let dataJson = message["data"] as? String {
        enqueueEvent(["type": "updateLiveActivity", "data": dataJson])
      }
      replyHandler?(["success": true])

    case "endWorkout":
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
