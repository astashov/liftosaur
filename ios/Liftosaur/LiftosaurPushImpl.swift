import Foundation
import UIKit

// iOS throttles background pushes when the fetch completion handler runs later than about 30 seconds.
private let kCompletionTimeout: TimeInterval = 25

@objc public class LiftosaurPushImpl: NSObject {
  @objc public static let shared = LiftosaurPushImpl()

  private var tokenEmitter: ((NSDictionary) -> Void)?
  private var pushEmitter: ((NSDictionary) -> Void)?
  private var jsReady = false
  private var pendingToken: NSDictionary?
  private var pendingPush: NSDictionary?
  private var completions: [String: (UIBackgroundFetchResult) -> Void] = [:]

  @objc public func setEmitters(token: @escaping (NSDictionary) -> Void, push: @escaping (NSDictionary) -> Void) {
    onMain {
      self.tokenEmitter = token
      self.pushEmitter = push
      self.jsReady = false
    }
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
