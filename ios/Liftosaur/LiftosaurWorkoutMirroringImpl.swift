import Foundation
import HealthKit
import OSLog

@objc public class LiftosaurWorkoutMirroringImpl: NSObject {
  @objc public static let shared = LiftosaurWorkoutMirroringImpl()

  private let healthStore = HKHealthStore()
  private var mirroredSession: HKWorkoutSession?

  private var eventEmitter: ((NSDictionary) -> Void)?
  private var pendingEvents: [NSDictionary] = []
  private let lock = NSLock()

  private var heartRate: Double?
  private var isWatchWorkoutActive: Bool = false
  private var didStartWatchWorkout: Bool = false

  private lazy var sessionDelegate: WorkoutSessionDelegateProxy = WorkoutSessionDelegateProxy(owner: self)
  private var builderDelegateStorage: NSObject?

  override init() {
    super.init()
    setupMirroringHandler()
  }

  // MARK: - Emitter

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

  @objc public func flushPendingEvents() {
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

  fileprivate func emit(_ event: [String: Any]) {
    let dict = event as NSDictionary
    lock.lock()
    if let emitter = eventEmitter {
      lock.unlock()
      emitter(dict)
    } else {
      pendingEvents.append(dict)
      if pendingEvents.count > 128 {
        pendingEvents.removeFirst(pendingEvents.count - 128)
      }
      lock.unlock()
    }
  }

  // MARK: - Mirroring handler

  private func setupMirroringHandler() {
    Logger.mirroring.info("Setting up workout session mirroring handler")
    healthStore.workoutSessionMirroringStartHandler = { [weak self] mirroredSession in
      Logger.mirroring.info("workoutSessionMirroringStartHandler CALLED!")
      DispatchQueue.main.async {
        self?.handleMirroredSession(mirroredSession)
      }
    }
    Logger.mirroring.info("Mirroring handler setup complete")
  }

  private func handleMirroredSession(_ session: HKWorkoutSession) {
    Logger.mirroring.info("Received mirrored session from watch, state: \(session.state.rawValue)")
    self.mirroredSession = session
    session.delegate = sessionDelegate
    self.isWatchWorkoutActive = true
    emitState()

    if #available(iOS 26.0, *) {
      let proxy = (builderDelegateStorage as? LiveWorkoutBuilderDelegateProxy)
        ?? LiveWorkoutBuilderDelegateProxy(owner: self)
      builderDelegateStorage = proxy
      let builder = session.associatedWorkoutBuilder()
      builder.delegate = proxy
      Logger.mirroring.info("Set up builder delegate for mirrored session")
    }
  }

  // MARK: - Status

  @objc public var isHealthKitAvailable: Bool {
    HKHealthStore.isHealthDataAvailable()
  }

  @objc public func isWatchWorkoutActiveObjC() -> Bool {
    return isWatchWorkoutActive
  }

  @objc public func didStartWatchWorkoutObjC() -> Bool {
    return didStartWatchWorkout
  }

  private func authStatusString(_ status: HKAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .sharingDenied: return "denied"
    case .sharingAuthorized: return "authorized"
    @unknown default: return "unknown(\(status.rawValue))"
    }
  }

  private func requestAuthorization() async -> Bool {
    guard isHealthKitAvailable else {
      Logger.mirroring.warning("HealthKit not available on this device")
      return false
    }

    let typesToShare: Set<HKSampleType> = [
      HKObjectType.workoutType(),
      HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    ]

    let typesToRead: Set<HKObjectType> = [
      HKObjectType.quantityType(forIdentifier: .heartRate)!,
      HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    ]

    var statusBefore: [String: String] = ["ctx": "phone-mirroring-before"]
    for type in typesToShare {
      statusBefore["w-\(type.identifier)"] = authStatusString(healthStore.authorizationStatus(for: type))
    }
    LiftosaurEventReporterImpl.shared.logTelemetry(name: "hk-auth-status", extra: statusBefore)

    do {
      try await healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead)
      var statusAfter: [String: String] = ["ctx": "phone-mirroring-after"]
      for type in typesToShare {
        statusAfter["w-\(type.identifier)"] = authStatusString(healthStore.authorizationStatus(for: type))
      }
      LiftosaurEventReporterImpl.shared.logTelemetry(name: "hk-auth-status", extra: statusAfter)
      Logger.mirroring.info("HealthKit authorization granted")
      return true
    } catch {
      LiftosaurEventReporterImpl.shared.logTelemetry(
        name: "hk-auth-failed",
        extra: ["ctx": "phone-mirroring", "error": error.localizedDescription]
      )
      Logger.mirroring.error("HealthKit authorization failed: \(error.localizedDescription)")
      return false
    }
  }

  // MARK: - Public API

  @objc public func startWatchWorkout(completion: @escaping (Bool) -> Void) {
    Task { @MainActor in
      let result = await self.startWatchWorkoutAsync()
      completion(result)
    }
  }

  private func startWatchWorkoutAsync() async -> Bool {
    guard isHealthKitAvailable else {
      Logger.mirroring.warning("Cannot start watch workout: HealthKit not available")
      return false
    }

    let authorized = await requestAuthorization()
    guard authorized else {
      Logger.mirroring.warning("Cannot start watch workout: not authorized")
      return false
    }

    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .traditionalStrengthTraining
    configuration.locationType = .indoor

    do {
      try await healthStore.startWatchApp(toHandle: configuration)
      didStartWatchWorkout = true
      emitState()
      Logger.mirroring.info("Successfully requested watch app to start workout")
      return true
    } catch {
      Logger.mirroring.error("Failed to start watch workout: \(error.localizedDescription)")
      return false
    }
  }

  @objc public func resetWatchWorkoutState() {
    DispatchQueue.main.async {
      self.didStartWatchWorkout = false
      self.isWatchWorkoutActive = false
      self.heartRate = nil
      self.mirroredSession = nil
      self.emitState()
    }
  }

  @objc public func pauseWatchWorkout() {
    DispatchQueue.main.async {
      guard let session = self.mirroredSession else {
        Logger.mirroring.info("No mirrored session to pause")
        return
      }
      session.pause()
      Logger.mirroring.info("Paused mirrored workout session")
    }
  }

  @objc public func resumeWatchWorkout() {
    DispatchQueue.main.async {
      guard let session = self.mirroredSession else {
        Logger.mirroring.info("No mirrored session to resume")
        return
      }
      session.resume()
      Logger.mirroring.info("Resumed mirrored workout session")
    }
  }

  @objc public func endWatchWorkout() {
    DispatchQueue.main.async {
      guard let session = self.mirroredSession else {
        Logger.mirroring.info("No mirrored session to end")
        return
      }
      session.end()
      Logger.mirroring.info("Ended mirrored workout session")
      self.mirroredSession = nil
      self.isWatchWorkoutActive = false
      self.heartRate = nil
      self.emitState()
    }
  }

  // MARK: - Internal callbacks from proxies

  fileprivate func handleSessionStateChange(toState: HKWorkoutSessionState) {
    DispatchQueue.main.async {
      switch toState {
      case .running:
        self.isWatchWorkoutActive = true
        self.emitState()
        Logger.mirroring.info("Mirrored session state: running")
      case .paused:
        Logger.mirroring.info("Mirrored session state: paused")
      case .ended:
        self.isWatchWorkoutActive = false
        self.heartRate = nil
        self.mirroredSession = nil
        self.emitState()
        self.emit(["type": "ended"])
        Logger.mirroring.info("Mirrored session state: ended")
      default:
        break
      }
    }
  }

  fileprivate func handleSessionFailure(_ error: Error) {
    let description = error.localizedDescription
    Logger.mirroring.error("Mirrored workout session failed: \(description)")
    DispatchQueue.main.async {
      self.isWatchWorkoutActive = false
      self.heartRate = nil
      self.mirroredSession = nil
      self.emit(["type": "failed", "error": description])
      self.emitState()
    }
  }

  fileprivate func handleHeartRate(_ value: Double) {
    DispatchQueue.main.async {
      self.heartRate = value
      self.emit([
        "type": "heartRate",
        "heartRate": value,
      ])
    }
  }

  // MARK: - Emit helpers

  private func emitState() {
    emit([
      "type": "stateChanged",
      "isWatchWorkoutActive": isWatchWorkoutActive,
      "didStartWatchWorkout": didStartWatchWorkout,
    ])
  }
}

fileprivate final class WorkoutSessionDelegateProxy: NSObject, HKWorkoutSessionDelegate {
  private weak var owner: LiftosaurWorkoutMirroringImpl?

  init(owner: LiftosaurWorkoutMirroringImpl) {
    self.owner = owner
  }

  func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState,
    date: Date
  ) {
    owner?.handleSessionStateChange(toState: toState)
  }

  func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didFailWithError error: Error
  ) {
    owner?.handleSessionFailure(error)
  }
}

@available(iOS 26.0, *)
fileprivate final class LiveWorkoutBuilderDelegateProxy: NSObject, HKLiveWorkoutBuilderDelegate {
  private weak var owner: LiftosaurWorkoutMirroringImpl?

  init(owner: LiftosaurWorkoutMirroringImpl) {
    self.owner = owner
  }

  func workoutBuilder(
    _ workoutBuilder: HKLiveWorkoutBuilder,
    didCollectDataOf collectedTypes: Set<HKSampleType>
  ) {
    guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
      return
    }
    guard collectedTypes.contains(heartRateType) else { return }

    let statistics = workoutBuilder.statistics(for: heartRateType)
    let heartRateUnit = HKUnit.count().unitDivided(by: .minute())
    if let mostRecentQuantity = statistics?.mostRecentQuantity() {
      let heartRateValue = mostRecentQuantity.doubleValue(for: heartRateUnit)
      Logger.mirroring.info("Got heart rate from watch: \(heartRateValue)")
      owner?.handleHeartRate(heartRateValue)
    }
  }

  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
  }
}
