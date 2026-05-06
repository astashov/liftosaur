import Foundation

@objc class LiftosaurLiveActivityImpl: NSObject {
  @objc static let shared = LiftosaurLiveActivityImpl()

  @objc func isSupported() -> Bool {
    if #available(iOS 16.2, *) { return true }
    return false
  }

  @objc func start(state: NSDictionary) {
    // TODO: port from LiftosauriOS/src/LiveActivityManager.swift
    // - Define WorkoutAttributes (ActivityKit) in a separate file
    // - Build ContentState from state dict
    // - Activity.request(...) and store the activity reference
    // - Schedule stale-date update for rest timer expiry
  }

  @objc func update(state: NSDictionary) {
    // TODO: forward state to the running activity, refresh stale date if rest changed
  }

  @objc func end() {
    // TODO: Activity.end(..., dismissalPolicy: .immediate)
  }
}
