import Foundation
import HealthKit
import OSLog
import UIKit
import WatchConnectivity

@objc public class LiftosaurWorkoutMirroringImpl: NSObject {
  @objc public static let shared = LiftosaurWorkoutMirroringImpl()

  private enum Source: String {
    case watch
    case phone
  }

  private enum RunStatus: String {
    case running
    case paused
    case noWorkout = "none"
  }

  private struct DesiredWorkout: Equatable {
    let workoutId: Double
    let status: RunStatus
    let expectWatch: Bool
  }

  private enum Phase {
    case idle
    case pendingWatch(HKWorkoutSession)
    case waitingForWatch
    case startingPhone(generation: Int)
    case watch(HKWorkoutSession)
    case phone(HKWorkoutSession, HKWorkoutBuilder)

    var session: HKWorkoutSession? {
      switch self {
      case .pendingWatch(let session), .watch(let session), .phone(let session, _):
        return session
      case .idle, .waitingForWatch, .startingPhone:
        return nil
      }
    }

    var source: Source? {
      switch self {
      case .watch: return .watch
      case .phone: return .phone
      case .idle, .pendingWatch, .waitingForWatch, .startingPhone: return nil
      }
    }
  }

  private let healthStore = HKHealthStore()

  private var eventEmitter: ((NSDictionary) -> Void)?
  private var pendingEvents: [NSDictionary] = []
  private let lock = NSLock()

  private var phase: Phase = .idle
  private var desired: DesiredWorkout?
  private var generation = 0
  private var watchLaunchGeneration: Int?
  private var phoneStartsThisGeneration = 0
  private var releasedWatchSessions: [HKWorkoutSession] = []

  private static let maxPhoneStartsPerWorkout = 3
  private static let watchAvailabilityRecheck: TimeInterval = 2

  private lazy var sessionDelegate = WorkoutSessionDelegateProxy(owner: self)
  private var builderDelegateStorage: NSObject?

  override init() {
    super.init()
    registerMirroringHandler()
    recoverPhoneSession()
    NotificationCenter.default.addObserver(
      forName: UIApplication.willEnterForegroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.registerMirroringHandlerIfDetached()
    }
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

  private func emit(_ event: [String: Any]) {
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

  private func emitHeartRate(_ bpm: Double, measuredAt: Date, from sourceOfReading: Source) {
    emit([
      "type": "heartRate",
      "heartRate": bpm,
      "measuredAt": measuredAt.timeIntervalSince1970 * 1000,
      "source": sourceOfReading.rawValue,
    ])
  }

  private func setPhase(_ next: Phase) {
    let previousSource = phase.source
    retainIfUnfinishedWatchSession(leaving: phase, for: next)
    phase = next
    if next.source != previousSource {
      emit(["type": "source", "source": next.source?.rawValue ?? "none"])
    }
  }

  private func retainIfUnfinishedWatchSession(leaving current: Phase, for next: Phase) {
    let leaving: HKWorkoutSession
    switch current {
    case .watch(let session), .pendingWatch(let session):
      leaving = session
    case .idle, .waitingForWatch, .startingPhone, .phone:
      return
    }
    guard leaving !== next.session, leaving.state != .ended else { return }
    // A mirrored session freed while still connected stops HealthKit from delivering later mirrored sessions.
    releasedWatchSessions.append(leaving)
  }

  private func forgetReleasedWatchSession(_ session: HKWorkoutSession) {
    releasedWatchSessions.removeAll { $0 === session }
  }

  private var isHealthKitAvailable: Bool {
    HKHealthStore.isHealthDataAvailable()
  }

  private enum WatchAvailability {
    case unknown
    case pairedWithApp
    case absent
  }

  private var watchAvailability: WatchAvailability {
    guard WCSession.isSupported() else { return .absent }
    let wcSession = WCSession.default
    guard wcSession.activationState == .activated else { return .unknown }
    return wcSession.isPaired && wcSession.isWatchAppInstalled ? .pairedWithApp : .absent
  }

  @objc public func setDesiredWorkout(workoutId: Double, status: String, expectWatch: Bool) {
    let next = DesiredWorkout(
      workoutId: workoutId,
      status: RunStatus(rawValue: status) ?? .noWorkout,
      expectWatch: expectWatch
    )
    DispatchQueue.main.async {
      self.applyDesired(next)
    }
  }

  private func applyDesired(_ next: DesiredWorkout) {
    guard next != desired else { return }
    let isNewWorkout = next.workoutId != desired?.workoutId
    desired = next
    Logger.mirroring.info("Desired workout \(next.workoutId): \(next.status.rawValue), expectWatch: \(next.expectWatch)")

    if next.status == .noWorkout {
      startNewGeneration()
      release()
      return
    }
    if isNewWorkout {
      startNewGeneration()
      cancelAcquiring()
    }
    reconcile()
  }

  private func startNewGeneration() {
    generation += 1
    watchLaunchGeneration = nil
    phoneStartsThisGeneration = 0
  }

  private func reconcile() {
    guard let desired = desired, desired.status != .noWorkout else { return }
    switch phase {
    case .watch(let session), .phone(let session, _):
      applyStatus(to: session)
    case .pendingWatch(let session):
      adoptWatchSession(session)
    case .idle:
      acquire()
    case .waitingForWatch:
      switch watchAvailability {
      case .absent:
        setPhase(.idle)
        startPhoneSession()
      case .unknown:
        scheduleWatchAvailabilityRecheck()
      case .pairedWithApp:
        launchWatchAppIfExpected()
      }
    case .startingPhone:
      break
    }
  }

  private func scheduleWatchAvailabilityRecheck() {
    let gen = generation
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.watchAvailabilityRecheck) { [weak self] in
      guard let self = self, gen == self.generation, case .waitingForWatch = self.phase else { return }
      self.reconcile()
    }
  }

  private func applyStatus(to session: HKWorkoutSession) {
    if desired?.status == .paused && session.state == .running {
      session.pause()
    } else if desired?.status == .running && session.state == .paused {
      session.resume()
    }
  }

  private func acquire() {
    guard case .idle = phase else { return }
    if watchAvailability == .absent {
      startPhoneSession()
      return
    }
    // A running phone session makes the watch's startMirroringToCompanionDevice fail without an error.
    setPhase(.waitingForWatch)
    reconcile()
  }

  private func launchWatchAppIfExpected() {
    guard desired?.expectWatch == true, watchLaunchGeneration != generation else { return }
    watchLaunchGeneration = generation
    launchWatchApp()
  }

  private func cancelAcquiring() {
    switch phase {
    case .waitingForWatch, .startingPhone:
      setPhase(.idle)
    case .idle, .pendingWatch, .watch, .phone:
      break
    }
  }

  private func release() {
    switch phase {
    case .phone(let session, let builder):
      setPhase(.idle)
      session.end()
      builder.endCollection(withEnd: Date()) { _, _ in
        builder.discardWorkout()
      }
      Logger.mirroring.info("Ended and discarded phone workout session")
    case .watch:
      setPhase(.idle)
      registerMirroringHandlerIfDetached()
      Logger.mirroring.info("Released mirrored watch session")
    case .waitingForWatch, .startingPhone:
      cancelAcquiring()
    case .idle, .pendingWatch:
      break
    }
  }

  private func registerMirroringHandlerIfDetached() {
    guard phase.session == nil else { return }
    registerMirroringHandler()
  }

  private func registerMirroringHandler() {
    healthStore.workoutSessionMirroringStartHandler = { [weak self] mirroredSession in
      DispatchQueue.main.async {
        self?.receiveWatchSession(mirroredSession)
      }
    }
  }

  private func isKnownWatchSession(_ candidate: HKWorkoutSession) -> Bool {
    var known = releasedWatchSessions
    if case .watch(let session) = phase { known.append(session) }
    if case .pendingWatch(let session) = phase { known.append(session) }
    return known.contains { session in
      session === candidate || (session.startDate != nil && session.startDate == candidate.startDate)
    }
  }

  private func receiveWatchSession(_ mirroredSession: HKWorkoutSession) {
    Logger.mirroring.info("Received mirrored session from watch, state: \(mirroredSession.state.rawValue)")
    // Assigning the start handler replays the latest mirrored session as a new object, even an ended one.
    guard mirroredSession.state != .ended, !isKnownWatchSession(mirroredSession) else {
      return
    }
    mirroredSession.delegate = sessionDelegate
    guard let desired = desired, desired.status != .noWorkout else {
      Logger.mirroring.info("Holding mirrored session until the phone has the watch's workout")
      release()
      setPhase(.pendingWatch(mirroredSession))
      return
    }
    adoptWatchSession(mirroredSession)
  }

  private func adoptWatchSession(_ mirroredSession: HKWorkoutSession) {
    if case .phone = phase {
      release()
    }
    cancelAcquiring()
    setPhase(.watch(mirroredSession))
    applyStatus(to: mirroredSession)
  }

  private func launchWatchApp() {
    Task { @MainActor in
      await self.startWatchWorkoutAsync()
    }
  }

  private func startWatchWorkoutAsync() async {
    guard isHealthKitAvailable, await requestAuthorization(context: "phone-mirroring") else {
      return
    }
    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .traditionalStrengthTraining
    configuration.locationType = .indoor
    do {
      try await healthStore.startWatchApp(toHandle: configuration)
      Logger.mirroring.info("Requested watch app to start workout")
    } catch {
      Logger.mirroring.error("Failed to start watch workout: \(error.localizedDescription)")
    }
  }

  private func startPhoneSession() {
    guard #available(iOS 26.0, *), phoneStartsThisGeneration < Self.maxPhoneStartsPerWorkout else {
      setPhase(.idle)
      return
    }
    phoneStartsThisGeneration += 1
    let gen = generation
    setPhase(.startingPhone(generation: gen))
    Task { @MainActor in
      let authorized = self.isHealthKitAvailable ? await self.requestAuthorization(context: "phone-session") : false
      guard case .startingPhone(let startingGen) = self.phase, startingGen == gen, gen == self.generation else {
        return
      }
      if authorized {
        self.beginPhoneSession()
      } else {
        self.setPhase(.idle)
      }
    }
  }

  @available(iOS 26.0, *)
  private func beginPhoneSession() {
    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .traditionalStrengthTraining
    configuration.locationType = .indoor
    let newSession: HKWorkoutSession
    do {
      newSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
    } catch {
      Logger.mirroring.error("Failed to create phone workout session: \(error.localizedDescription)")
      setPhase(.idle)
      return
    }
    let builder = newSession.associatedWorkoutBuilder()
    builder.dataSource = heartRateOnlyDataSource(configuration: configuration)
    attach(phoneSession: newSession, builder: builder)

    let startDate = Date()
    newSession.startActivity(with: startDate)
    builder.beginCollection(withStart: startDate) { _, error in
      DispatchQueue.main.async {
        guard newSession === self.phase.session else { return }
        if let error = error {
          Logger.mirroring.error("Failed to begin phone workout collection: \(error.localizedDescription)")
          self.release()
        } else {
          self.applyStatus(to: newSession)
          Logger.mirroring.info("Phone workout session started")
        }
      }
    }
  }

  @available(iOS 26.0, *)
  private func attach(phoneSession: HKWorkoutSession, builder: HKLiveWorkoutBuilder) {
    let builderDelegate = (builderDelegateStorage as? LiveWorkoutBuilderDelegateProxy)
      ?? LiveWorkoutBuilderDelegateProxy(owner: self)
    builderDelegateStorage = builderDelegate
    phoneSession.delegate = sessionDelegate
    builder.delegate = builderDelegate
    setPhase(.phone(phoneSession, builder))
  }

  @available(iOS 26.0, *)
  private func heartRateOnlyDataSource(configuration: HKWorkoutConfiguration) -> HKLiveWorkoutDataSource {
    let dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)
    let heartRateType = HKQuantityType(.heartRate)
    for type in dataSource.typesToCollect where type != heartRateType {
      dataSource.disableCollection(for: type)
    }
    dataSource.enableCollection(for: heartRateType, predicate: nil)
    return dataSource
  }

  private func recoverPhoneSession() {
    guard #available(iOS 26.0, *), isHealthKitAvailable else { return }
    healthStore.recoverActiveWorkoutSession { [weak self] recovered, error in
      DispatchQueue.main.async {
        if let error = error {
          Logger.mirroring.error("Failed to recover phone workout session: \(error.localizedDescription)")
        }
        guard let self = self, let recovered = recovered else { return }
        let builder = recovered.associatedWorkoutBuilder()
        let isWanted = self.desired.map { $0.status != .noWorkout } ?? true
        guard isWanted, recovered.state != .ended, self.phase.session == nil, self.watchAvailability == .absent else {
          recovered.end()
          builder.discardWorkout()
          return
        }
        self.cancelAcquiring()
        builder.dataSource = self.heartRateOnlyDataSource(configuration: recovered.workoutConfiguration)
        self.attach(phoneSession: recovered, builder: builder)
        self.applyStatus(to: recovered)
        Logger.mirroring.info("Recovered phone workout session, state: \(recovered.state.rawValue)")
      }
    }
  }

  private func authStatusString(_ status: HKAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "notDetermined"
    case .sharingDenied: return "denied"
    case .sharingAuthorized: return "authorized"
    @unknown default: return "unknown(\(status.rawValue))"
    }
  }

  private func requestAuthorization(context: String) async -> Bool {
    let typesToShare: Set<HKSampleType> = [
      HKObjectType.workoutType(),
      HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    ]
    let typesToRead: Set<HKObjectType> = [
      HKObjectType.quantityType(forIdentifier: .heartRate)!,
      HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
    ]

    var statusBefore: [String: String] = ["ctx": "\(context)-before"]
    for type in typesToShare {
      statusBefore["w-\(type.identifier)"] = authStatusString(healthStore.authorizationStatus(for: type))
    }
    LiftosaurEventReporterImpl.shared.logTelemetry(name: "hk-auth-status", extra: statusBefore)

    do {
      try await healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead)
      var statusAfter: [String: String] = ["ctx": "\(context)-after"]
      for type in typesToShare {
        statusAfter["w-\(type.identifier)"] = authStatusString(healthStore.authorizationStatus(for: type))
      }
      LiftosaurEventReporterImpl.shared.logTelemetry(name: "hk-auth-status", extra: statusAfter)
      return true
    } catch {
      LiftosaurEventReporterImpl.shared.logTelemetry(
        name: "hk-auth-failed",
        extra: ["ctx": context, "error": error.localizedDescription]
      )
      Logger.mirroring.error("HealthKit authorization failed: \(error.localizedDescription)")
      return false
    }
  }

  fileprivate func handleSessionStateChange(_ changed: HKWorkoutSession, toState: HKWorkoutSessionState) {
    DispatchQueue.main.async {
      if changed === self.phase.session, toState == .ended || toState == .stopped {
        Logger.mirroring.info("\(self.phase.source?.rawValue ?? "pending") session ended")
        self.dropCurrentSession(changed)
      } else if toState == .ended {
        self.forgetReleasedWatchSession(changed)
        self.registerMirroringHandlerIfDetached()
      }
    }
  }

  fileprivate func handleSessionFailure(_ failed: HKWorkoutSession, error: Error) {
    DispatchQueue.main.async {
      guard failed === self.phase.session else {
        self.forgetReleasedWatchSession(failed)
        return
      }
      Logger.mirroring.error("Workout session failed: \(error.localizedDescription)")
      self.dropCurrentSession(failed)
    }
  }

  fileprivate func handleDisconnect(_ disconnected: HKWorkoutSession, error: Error?) {
    DispatchQueue.main.async {
      guard disconnected === self.phase.session else {
        self.forgetReleasedWatchSession(disconnected)
        return
      }
      Logger.mirroring.info("Mirrored session disconnected, waiting for the watch to reconnect: \(error?.localizedDescription ?? "no error")")
      self.dropCurrentSession(disconnected)
    }
  }

  private func dropCurrentSession(_ session: HKWorkoutSession) {
    setPhase(.idle)
    forgetReleasedWatchSession(session)
    registerMirroringHandlerIfDetached()
    reconcile()
  }

  fileprivate func handleRemoteData(_ from: HKWorkoutSession, data: [Data]) {
    DispatchQueue.main.async {
      guard case .watch(let session) = self.phase, session === from else { return }
      for item in data {
        guard let payload = try? JSONSerialization.jsonObject(with: item) as? [String: Double],
              let bpm = payload["bpm"],
              let measuredAtMs = payload["measuredAt"] else {
          continue
        }
        self.emitHeartRate(bpm, measuredAt: Date(timeIntervalSince1970: measuredAtMs / 1000), from: .watch)
      }
    }
  }

  fileprivate func handlePhoneHeartRate(_ from: HKWorkoutBuilder, bpm: Double, measuredAt: Date) {
    DispatchQueue.main.async {
      guard case .phone(_, let builder) = self.phase, builder === from else { return }
      self.emitHeartRate(bpm, measuredAt: measuredAt, from: .phone)
    }
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
    owner?.handleSessionStateChange(workoutSession, toState: toState)
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    owner?.handleSessionFailure(workoutSession, error: error)
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didReceiveDataFromRemoteWorkoutSession data: [Data]) {
    owner?.handleRemoteData(workoutSession, data: data)
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didDisconnectFromRemoteDeviceWithError error: Error?) {
    owner?.handleDisconnect(workoutSession, error: error)
  }
}

@available(iOS 26.0, *)
fileprivate final class LiveWorkoutBuilderDelegateProxy: NSObject, HKLiveWorkoutBuilderDelegate {
  private weak var owner: LiftosaurWorkoutMirroringImpl?

  init(owner: LiftosaurWorkoutMirroringImpl) {
    self.owner = owner
  }

  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
    let heartRateType = HKQuantityType(.heartRate)
    guard collectedTypes.contains(heartRateType),
          let statistics = workoutBuilder.statistics(for: heartRateType),
          let quantity = statistics.mostRecentQuantity() else {
      return
    }
    let bpm = quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
    let measuredAt = statistics.mostRecentQuantityDateInterval()?.end ?? Date()
    owner?.handlePhoneHeartRate(workoutBuilder, bpm: bpm, measuredAt: measuredAt)
  }

  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
}
