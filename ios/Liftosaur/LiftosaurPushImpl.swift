import Foundation
import UIKit
import UserNotifications

// iOS throttles background pushes when the fetch completion handler runs later than about 30 seconds.
private let kCompletionTimeout: TimeInterval = 25
private let kFriendReason = "friend"

// A separate fileprivate class keeps UserNotifications types out of Liftosaur-Swift.h,
// which ObjC files import without the UserNotifications framework.
fileprivate class FriendNotificationCenterDelegate: NSObject, UNUserNotificationCenterDelegate {
  weak var owner: LiftosaurPushImpl?

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    let isFriend = userInfo["reason"] as? String == kFriendReason
    if isFriend {
      owner?.didReceiveInForeground(userInfo: userInfo)
    }
    completionHandler(isFriend ? [.banner, .list, .sound] : [])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    owner?.didTap(userInfo: response.notification.request.content.userInfo)
    completionHandler()
  }
}

@objc public class LiftosaurPushImpl: NSObject {
  @objc public static let shared = LiftosaurPushImpl()

  private let centerDelegate = FriendNotificationCenterDelegate()

  private var tokenEmitter: ((NSDictionary) -> Void)?
  private var pushEmitter: ((NSDictionary) -> Void)?
  private var tapEmitter: ((NSDictionary) -> Void)?
  private var receivedEmitter: ((NSDictionary) -> Void)?
  private var jsReady = false
  private var pendingToken: NSDictionary?
  private var pendingPush: NSDictionary?
  private var pendingTap: NSDictionary?
  private var pendingReceived: NSDictionary?
  private var completions: [String: (UIBackgroundFetchResult) -> Void] = [:]

  @objc public func setEmitters(
    token: @escaping (NSDictionary) -> Void,
    push: @escaping (NSDictionary) -> Void,
    tap: @escaping (NSDictionary) -> Void,
    received: @escaping (NSDictionary) -> Void
  ) {
    onMain {
      self.tokenEmitter = token
      self.pushEmitter = push
      self.tapEmitter = tap
      self.receivedEmitter = received
      self.jsReady = false
    }
  }

  public func installNotificationDelegate() {
    centerDelegate.owner = self
    UNUserNotificationCenter.current().delegate = centerDelegate
  }

  fileprivate func didTap(userInfo: [AnyHashable: Any]) {
    guard let event = friendEvent(userInfo) else { return }
    onMain {
      self.pendingTap = event
      self.flush()
    }
  }

  fileprivate func didReceiveInForeground(userInfo: [AnyHashable: Any]) {
    guard let event = friendEvent(userInfo) else { return }
    onMain {
      self.pendingReceived = event
      self.flush()
    }
  }

  private func friendEvent(_ userInfo: [AnyHashable: Any]) -> NSDictionary? {
    guard userInfo["reason"] as? String == kFriendReason else { return nil }
    var fields: [String: String] = [:]
    for (key, value) in userInfo {
      if let key = key as? String, let value = value as? String {
        fields[key] = value
      }
    }
    guard let json = try? JSONSerialization.data(withJSONObject: fields),
      let text = String(data: json, encoding: .utf8)
    else { return nil }
    return ["data": text]
  }

  @objc public func start() {
    onMain {
      UIApplication.shared.registerForRemoteNotifications()
    }
  }

  @objc public func flushPending() {
    onMain {
      self.jsReady = true
      self.flush()
    }
  }

  @objc public func complete(deliveryId: String, newData: Bool) {
    onMain {
      self.finish(deliveryId, with: newData ? .newData : .noData)
    }
  }

  public func didRegister(deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02x", $0) }.joined()
    onMain {
      self.pendingToken = ["token": token]
      self.flush()
    }
  }

  public func didReceive(userInfo: [AnyHashable: Any], completion: @escaping (UIBackgroundFetchResult) -> Void) {
    let deliveryId = UUID().uuidString
    let event: NSDictionary = [
      "reason": userInfo["reason"] as? String ?? "",
      "originalId": originalIdString(userInfo["originalId"]),
      "deliveryId": deliveryId,
    ]
    onMain {
      self.completions[deliveryId] = completion
      DispatchQueue.main.asyncAfter(deadline: .now() + kCompletionTimeout) { [weak self] in
        self?.finish(deliveryId, with: .noData)
      }
      if let replaced = self.pendingPush?["deliveryId"] as? String {
        self.finish(replaced, with: .noData)
      }
      self.pendingPush = event
      self.flush()
    }
  }

  private func flush() {
    guard jsReady else { return }
    if let emitter = tokenEmitter, let token = pendingToken {
      pendingToken = nil
      emitter(token)
    }
    if let emitter = pushEmitter, let push = pendingPush {
      pendingPush = nil
      emitter(push)
    }
    if let emitter = tapEmitter, let tap = pendingTap {
      pendingTap = nil
      emitter(tap)
    }
    if let emitter = receivedEmitter, let received = pendingReceived {
      pendingReceived = nil
      emitter(received)
    }
  }

  private func finish(_ deliveryId: String, with result: UIBackgroundFetchResult) {
    if let completion = completions.removeValue(forKey: deliveryId) {
      completion(result)
    }
  }

  private func originalIdString(_ value: Any?) -> String {
    if let number = value as? NSNumber {
      return number.stringValue
    }
    return value as? String ?? ""
  }

  private func onMain(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.async(execute: block)
    }
  }
}
