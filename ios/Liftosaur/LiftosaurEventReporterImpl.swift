import Foundation
import UIKit
import MetricKit
import OSLog

private let kTombstoneSuiteName = "com.liftosaur.eventreporter.tombstone"
private let kKeyReason = "reason"
private let kKeyTimestamp = "timestamp"

private let kReasonKilled = "killed"
private let kReasonUserTerminated = "user_terminated"

@objc public class LiftosaurEventReporterImpl: NSObject {
  @objc public static let shared = LiftosaurEventReporterImpl()

  private var eventEmitter: ((NSDictionary) -> Void)?
  private var pendingEvents: [NSDictionary] = []
  private var pendingLastTermination: NSDictionary?
  private let lock = NSLock()
  private var memoryWarningObserver: NSObjectProtocol?

  private let tombstoneDefaults: UserDefaults?

  private lazy var metricSubscriber: MetricKitSubscriberProxy = MetricKitSubscriberProxy(owner: self)

  override init() {
    self.tombstoneDefaults = UserDefaults(suiteName: kTombstoneSuiteName)
    super.init()
    self.pendingLastTermination = consumeTombstoneAndArm()
    self.observeMemoryWarnings()
  }

  deinit {
    if let observer = memoryWarningObserver {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  @objc public func registerWithMetricKit() {
    MXMetricManager.shared.add(metricSubscriber)
  }

  @objc public func setEventEmitter(_ block: @escaping (NSDictionary) -> Void) {
    lock.lock()
    eventEmitter = block
    let toFlush = pendingEvents
    pendingEvents.removeAll()
    lock.unlock()
    for event in toFlush {
      block(event)
    }
  }

  @objc public func flushPending() {
    lock.lock()
    let emitter = eventEmitter
    let toFlush = pendingEvents
    pendingEvents.removeAll()
    lock.unlock()
    guard let emitter = emitter else {
      lock.lock()
      pendingEvents.insert(contentsOf: toFlush, at: 0)
      lock.unlock()
      return
    }
    for event in toFlush {
      emitter(event)
    }
  }

  @objc public func consumeLastTerminationInfo() -> NSDictionary? {
    lock.lock()
    let info = pendingLastTermination
    pendingLastTermination = nil
    lock.unlock()
    return info
  }

  @objc public func markGracefulTermination() {
    let defaults = tombstoneDefaults ?? UserDefaults.standard
    defaults.set(kReasonUserTerminated, forKey: kKeyReason)
    defaults.set(Int64(Date().timeIntervalSince1970 * 1000), forKey: kKeyTimestamp)
  }

  private func consumeTombstoneAndArm() -> NSDictionary? {
    let defaults = tombstoneDefaults ?? UserDefaults.standard
    let previousReason = defaults.string(forKey: kKeyReason)
    let previousTimestamp = defaults.object(forKey: kKeyTimestamp) as? Int64

    defaults.set(kReasonKilled, forKey: kKeyReason)
    defaults.removeObject(forKey: kKeyTimestamp)

    guard let reason = previousReason else { return nil }
    let timestamp = previousTimestamp ?? Int64(Date().timeIntervalSince1970 * 1000)
    return [
      "reason": reason,
      "timestamp": NSNumber(value: timestamp),
      "extra": [String: String](),
    ] as NSDictionary
  }

  fileprivate func emit(name: String, extra: [String: String], timestamp: Int64? = nil) {
    let event: NSDictionary = [
      "name": name,
      "timestamp": NSNumber(value: timestamp ?? Int64(Date().timeIntervalSince1970 * 1000)),
      "extra": extra,
    ]
    lock.lock()
    if let emitter = eventEmitter {
      lock.unlock()
      emitter(event)
    } else {
      pendingEvents.append(event)
      if pendingEvents.count > 256 {
        pendingEvents.removeFirst(pendingEvents.count - 256)
      }
      lock.unlock()
    }
  }

  private func observeMemoryWarnings() {
    memoryWarningObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification,
      object: nil,
      queue: nil
    ) { [weak self] _ in
      let memoryMB = Self.currentMemoryMB()
      self?.emit(name: "ios-memory-warning", extra: ["memory_mb": String(format: "%.2f", memoryMB)])
    }
  }

  private static func currentMemoryMB() -> Double {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4
    let result = withUnsafeMutablePointer(to: &info) {
      $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
        task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
      }
    }
    let bytes = result == KERN_SUCCESS ? info.resident_size : 0
    return Double(bytes) / 1024.0 / 1024.0
  }

  fileprivate func handleMetricPayload(_ payload: MXMetricPayload) {
    if let metrics = payload.applicationExitMetrics {
      let extra: [String: String] = [
        "foreground_exits": String(metrics.foregroundExitData.cumulativeNormalAppExitCount),
        "background_exits": String(metrics.backgroundExitData.cumulativeNormalAppExitCount),
        "memory_exits_fg": String(metrics.foregroundExitData.cumulativeMemoryResourceLimitExitCount),
        "memory_exits_bg": String(metrics.backgroundExitData.cumulativeMemoryResourceLimitExitCount),
        "cpu_exits_bg": String(metrics.backgroundExitData.cumulativeCPUResourceLimitExitCount),
        "suspended_exits": String(metrics.backgroundExitData.cumulativeSuspendedWithLockedFileExitCount),
      ]
      emit(name: "ios-exit-metrics", extra: extra)
    }
    if let memory = payload.memoryMetrics {
      let peakMB = Double(memory.peakMemoryUsage.value) / 1024.0 / 1024.0
      let avgSuspendedMB = Double(memory.averageSuspendedMemory.averageMeasurement.value) / 1024.0 / 1024.0
      emit(name: "ios-memory-metrics", extra: [
        "peak_mb": String(format: "%.2f", peakMB),
        "avg_suspended_mb": String(format: "%.2f", avgSuspendedMB),
      ])
    }
  }

  fileprivate func handleDiagnosticPayload(_ payload: MXDiagnosticPayload) {
    if let crashes = payload.crashDiagnostics {
      for crash in crashes {
        let extra: [String: String] = [
          "reason": crash.terminationReason ?? "unknown",
          "exception_type": String(describing: crash.exceptionType ?? 0),
          "signal": String(describing: crash.signal ?? 0),
        ]
        emit(name: "ios-crash-diagnostic", extra: extra)
      }
    }
    if let diskWrites = payload.diskWriteExceptionDiagnostics {
      for diskWrite in diskWrites {
        let writeMB = Double(diskWrite.totalWritesCaused.value) / 1024.0 / 1024.0
        emit(name: "ios-excessive-disk-write", extra: ["writes_mb": String(format: "%.2f", writeMB)])
      }
    }
  }
}

fileprivate final class MetricKitSubscriberProxy: NSObject, MXMetricManagerSubscriber {
  private weak var owner: LiftosaurEventReporterImpl?

  init(owner: LiftosaurEventReporterImpl) {
    self.owner = owner
  }

  func didReceive(_ payloads: [MXMetricPayload]) {
    for payload in payloads {
      owner?.handleMetricPayload(payload)
    }
  }

  func didReceive(_ payloads: [MXDiagnosticPayload]) {
    for payload in payloads {
      owner?.handleDiagnosticPayload(payload)
    }
  }
}
