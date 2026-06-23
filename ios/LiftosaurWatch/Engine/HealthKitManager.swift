//
//  HealthKitManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import HealthKit
import Combine
import OSLog

extension Logger {
    static let healthKit = Logger(subsystem: "com.liftosaur.watch", category: "HealthKit")
}

@MainActor
class HealthKitManager: NSObject, ObservableObject {
    static let shared = HealthKitManager()

    @Published var heartRate: Double?
    @Published var isSessionActive: Bool = false

    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    // Set only when HealthKit DEFINITIVELY reports no recoverable session (not on timeout/error),
    // so cleanup paths can retry recovery until they get a real answer. Reset when we start a
    // session (a session now exists, so the "no session" answer is stale).
    private var recoveryConfirmedNoSession = false

    // True when the current session came from recoverActiveWorkoutSession (started in a previous
    // launch). Lets the load/wake reconcile end a cross-launch orphan WITHOUT depending on
    // reading the session's metadata back after recovery.
    private var sessionWasRecovered = false

    // When the current session was started this launch. Used to protect a freshly started session
    // from a no-active-workout teardown before its workout's storage has had time to sync.
    private var sessionStartedAt: Date?

    override init() {
        super.init()
    }

    /// Attempt to recover an existing workout session that was running when the app was terminated.
    /// Returns true if a session was recovered, false otherwise.
    func recoverActiveSession() async -> Bool {
        // Already hold a session — nothing to recover.
        if session != nil {
            Logger.healthKit.info("Session already exists, no recovery needed")
            return true
        }
        // Only short-circuit on a DEFINITIVE prior answer ("HealthKit confirmed no session"). A
        // timeout/error is NOT cached, so later cleanup calls (.sync/.finish/.discard) can retry
        // and still find a cross-launch orphan — otherwise one bad first attempt would blind every
        // later teardown and leave the endless session this is meant to fix.
        if recoveryConfirmedNoSession {
            return false
        }

        guard isHealthKitAvailable else {
            Logger.healthKit.warning("Cannot recover session: HealthKit not available")
            return false
        }

        // Use timeout to prevent hanging if HealthKit callback never fires (known simulator issue)
        return await withCheckedContinuation { continuation in
            var hasResumed = false
            let lock = NSLock()

            // Timeout after 3 seconds - if HealthKit doesn't respond, retry on the next call.
            DispatchQueue.global().asyncAfter(deadline: .now() + 3) {
                lock.lock()
                if !hasResumed {
                    hasResumed = true
                    lock.unlock()
                    Logger.healthKit.warning("Session recovery timed out, will retry next call")
                    continuation.resume(returning: false)
                } else {
                    lock.unlock()
                }
            }

            healthStore.recoverActiveWorkoutSession { [weak self] recoveredSession, error in
                lock.lock()
                if hasResumed {
                    lock.unlock()
                    return
                }
                hasResumed = true
                lock.unlock()

                guard let self = self else {
                    continuation.resume(returning: false)
                    return
                }

                Task { @MainActor in
                    if let error = error {
                        // Error — don't cache, retry next call.
                        Logger.healthKit.error("Failed to recover workout session: \(error.localizedDescription)")
                        continuation.resume(returning: false)
                        return
                    }

                    guard let recoveredSession = recoveredSession else {
                        // Definitive: HealthKit has no recoverable session. Cache it — within a
                        // launch the only sessions after this are ones we create (and hold a ref to).
                        Logger.healthKit.info("No active workout session to recover")
                        self.recoveryConfirmedNoSession = true
                        continuation.resume(returning: false)
                        return
                    }

                    self.session = recoveredSession
                    self.builder = recoveredSession.associatedWorkoutBuilder()
                    self.sessionWasRecovered = true
                    recoveredSession.delegate = self
                    self.builder?.delegate = self

                    // Set up data source for heart rate collection on recovered builder
                    let configuration = HKWorkoutConfiguration()
                    configuration.activityType = .traditionalStrengthTraining
                    configuration.locationType = .indoor
                    self.builder?.dataSource = HKLiveWorkoutDataSource(
                        healthStore: self.healthStore,
                        workoutConfiguration: configuration
                    )

                    self.isSessionActive = recoveredSession.state == .running || recoveredSession.state == .paused
                    Logger.healthKit.info("Recovered existing workout session, state: \(String(describing: recoveredSession.state.rawValue))")
                    continuation.resume(returning: true)
                }
            }
        }
    }

    var isHealthKitAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    // How long a freshly started session is protected from a no-active-workout teardown, giving
    // fresh active-workout storage time to sync (a phone-started session, or a stale incoming
    // merge, can briefly look like "no workout"). Bounded, so a session is never kept indefinitely.
    private let recentStartGrace: TimeInterval = 45

    /// Reconcile the session against the single source of truth (storage). MUST be called
    /// serialized (see WorkoutManager.reconcileHealth) so a start can't interleave with a stop.
    /// recoverActiveWorkoutSession is app-private: it only ever returns OUR session, so this can
    /// never touch another app's workout.
    func reconcileSession(hasActiveWorkout: Bool) async {
        _ = await recoverActiveSession()

        guard session != nil else {
            if hasActiveWorkout {
                Logger.sync.info(">>> reconcile: no session, active workout -> starting")
                await startWorkoutSession()
            }
            return
        }

        if hasActiveWorkout {
            // Session + active workout -> keep it. We don't try to match the session to the
            // workout: a leftover session from a previous workout is already prevented from
            // reaching here by the phone's guaranteed-delivery finish (which ends it on reconnect)
            // and by startWorkoutSessionFromPhone replacing any existing session on a mirrored
            // start. (Back-to-back A->B keeping A's session for B is a benign attribution edge.)
            return
        }

        // Session exists but storage has no active workout.
        if sessionWasRecovered {
            // From a prior launch -> its workout is long over -> orphan.
            Logger.sync.info(">>> reconcile: recovered session, no active workout -> ending orphan")
            await endWorkoutSession(save: false)
        } else if let startedAt = sessionStartedAt, Date().timeIntervalSince(startedAt) >= recentStartGrace {
            // Started this launch, old enough that fresh storage has had time to sync -> the
            // workout really ended.
            Logger.sync.info(">>> reconcile: session past grace, no active workout -> ending orphan")
            await endWorkoutSession(save: false)
        } else {
            // Young this-launch session: an incoming merge can be stale, or a phone-started
            // workout hasn't synced yet -> keep; it ages out.
            Logger.sync.info(">>> reconcile: session too young, no active workout -> keeping (grace)")
        }
    }

    private var writableTypes: Set<HKSampleType> {
        [
            HKObjectType.workoutType(),
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]
    }

    private var readableTypes: Set<HKObjectType> {
        [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]
    }

    private static func authStatusString(_ status: HKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .sharingDenied: return "denied"
        case .sharingAuthorized: return "authorized"
        @unknown default: return "unknown(\(status.rawValue))"
        }
    }

    private func logAuthStatus(context: String) {
        let store = healthStore
        let types = writableTypes
        Task.detached {
            var extra: [String: String] = ["ctx": context]
            for type in types {
                extra["w-\(type.identifier)"] = await HealthKitManager.authStatusString(store.authorizationStatus(for: type))
            }
            await WatchEventManager.shared.logNativeEvent(name: "hk-auth-status", extra: extra)
        }
    }

    func needsAuthorization() async -> Bool {
        guard isHealthKitAvailable else { return false }

        let store = healthStore
        let types = writableTypes
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                for type in types {
                    if store.authorizationStatus(for: type) == .notDetermined {
                        continuation.resume(returning: true)
                        return
                    }
                }
                continuation.resume(returning: false)
            }
        }
    }

    func requestAuthorization() async -> Bool {
        guard isHealthKitAvailable else {
            Logger.healthKit.warning("HealthKit not available on this device")
            return false
        }

        logAuthStatus(context: "before-request")

        do {
            try await healthStore.requestAuthorization(toShare: writableTypes, read: readableTypes)
            logAuthStatus(context: "after-request")
            Logger.healthKit.info("HealthKit authorization granted")
            return true
        } catch {
            WatchEventManager.shared.logNativeEvent(
                name: "hk-auth-failed",
                extra: ["error": error.localizedDescription]
            )
            Logger.healthKit.error("HealthKit authorization failed: \(error.localizedDescription)")
            return false
        }
    }

    func requestAuthorizationIfNeeded() async -> Bool {
        guard await needsAuthorization() else {
            logAuthStatus(context: "already-determined")
            return true
        }
        return await requestAuthorization()
    }

    func startWorkoutSession() async {
        Logger.sync.info(">>> startWorkoutSession ENTERED, session=\(self.session != nil), isSessionActive=\(self.isSessionActive)")
        guard isHealthKitAvailable else {
            Logger.healthKit.warning("Cannot start workout session: HealthKit not available")
            return
        }

        // Don't start a new session if one already exists (even if beginCollection hasn't completed yet)
        if session != nil {
            Logger.healthKit.info("Workout session already exists, skipping start")
            return
        }

        // Ensure authorization before starting session to avoid implicit HK prompts
        _ = await requestAuthorizationIfNeeded()

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        configuration.locationType = .indoor

        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            builder = session?.associatedWorkoutBuilder()

            session?.delegate = self
            builder?.delegate = self

            builder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            let startDate = Date()
            session?.startActivity(with: startDate)
            try await builder?.beginCollection(at: startDate)

            sessionWasRecovered = false
            recoveryConfirmedNoSession = false
            sessionStartedAt = Date()
            isSessionActive = true
            Logger.healthKit.info("Workout session started")
        } catch {
            Logger.healthKit.error("Failed to start workout session: \(error.localizedDescription)")
            session = nil
            builder = nil
        }
    }

    /// Start a workout session based on configuration received from the paired iPhone.
    /// This is called when the phone initiates a workout via startWatchApp(toHandle:).
    func startWorkoutSessionFromPhone(configuration: HKWorkoutConfiguration) async {
        Logger.sync.info(">>> startWorkoutSessionFromPhone ENTERED, session=\(self.session != nil), isSessionActive=\(self.isSessionActive)")
        guard isHealthKitAvailable else {
            Logger.healthKit.warning("Cannot start workout session from phone: HealthKit not available")
            return
        }

        // If we already have a session (even if beginCollection hasn't finished), end it first
        if session != nil {
            Logger.healthKit.info("Ending existing session before starting phone-initiated session")
            await endWorkoutSession(save: false)
        }

        _ = await requestAuthorizationIfNeeded()

        do {
            session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            builder = session?.associatedWorkoutBuilder()

            session?.delegate = self
            builder?.delegate = self

            builder?.dataSource = HKLiveWorkoutDataSource(
                healthStore: healthStore,
                workoutConfiguration: configuration
            )

            let startDate = Date()
            session?.startActivity(with: startDate)
            try await builder?.beginCollection(at: startDate)

            sessionWasRecovered = false
            recoveryConfirmedNoSession = false
            sessionStartedAt = Date()
            isSessionActive = true
            Logger.healthKit.info("Workout session started from iPhone request")
        } catch {
            Logger.healthKit.error("Failed to start workout session from phone: \(error.localizedDescription)")
            session = nil
            builder = nil
        }
    }

    func endWorkoutSession(save: Bool) async {
        Logger.sync.info(">>> endWorkoutSession called, save: \(save), session=\(self.session != nil), builder=\(self.builder != nil), isSessionActive=\(self.isSessionActive)")
        guard let session = session else {
            Logger.sync.info(">>> endWorkoutSession: no active session to end")
            self.builder = nil
            sessionWasRecovered = false
            sessionStartedAt = nil
            heartRate = nil
            isSessionActive = false
            return
        }

        // Capture the builder BEFORE session.end(): ending can fire the .ended delegate which
        // clears self.builder, and we still need it to end collection / save / discard.
        let builder = self.builder

        Logger.sync.info(">>> endWorkoutSession: session.state=\(session.state.rawValue)")
        // Always end the session if it isn't already ended. A session caught mid-start
        // (.prepared/.notStarted) must still be ended — otherwise we drop our reference while
        // HealthKit keeps the workout running, which is exactly how energy leaks.
        let wasRunning = session.state == .running || session.state == .paused
        if session.state != .ended {
            Logger.sync.info(">>> endWorkoutSession: calling session.end()")
            session.end()
        }

        // Only finish (save) a session that was actually running; a mid-start session has no
        // meaningful data, so discard it regardless of `save` to avoid writing an empty workout.
        let shouldSave = save && wasRunning
        if let builder = builder {
            do {
                Logger.sync.info(">>> endWorkoutSession: ending collection...")
                try await builder.endCollection(at: Date())
                if shouldSave {
                    try await builder.finishWorkout()
                    Logger.sync.info(">>> endWorkoutSession: workout SAVED to HealthKit")
                } else {
                    builder.discardWorkout()
                    Logger.sync.info(">>> endWorkoutSession: workout DISCARDED (save=\(save), wasRunning=\(wasRunning))")
                }
            } catch {
                Logger.sync.error(">>> endWorkoutSession: FAILED: \(error.localizedDescription)")
                builder.discardWorkout()
            }
        }

        self.session = nil
        self.builder = nil
        sessionWasRecovered = false
        sessionStartedAt = nil
        heartRate = nil
        isSessionActive = false
        Logger.sync.info(">>> endWorkoutSession: completed")
    }

    func pauseWorkoutSession() {
        guard let session = session else {
            Logger.healthKit.info("No active session to pause")
            return
        }
        session.pause()
        Logger.healthKit.info("Workout session paused")
    }

    func resumeWorkoutSession() {
        guard let session = session else {
            Logger.healthKit.info("No active session to resume")
            return
        }
        session.resume()
        Logger.healthKit.info("Workout session resumed")
    }
}

extension HealthKitManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        Task { @MainActor in
            // Delegate callbacks run outside the health lock, so an OLD session's late callback
            // (e.g. .ended for a session we already replaced) must not mutate state for the new
            // one. Ignore anything that isn't the current session.
            guard workoutSession === self.session else {
                Logger.healthKit.info("Ignoring state change for a stale session")
                return
            }
            switch toState {
            case .running:
                isSessionActive = true
                Logger.healthKit.info("Session state: running")
            case .paused:
                Logger.healthKit.info("Session state: paused")
            case .ended:
                isSessionActive = false
                heartRate = nil
                self.session = nil
                self.builder = nil
                sessionWasRecovered = false
                sessionStartedAt = nil
                Logger.healthKit.info("Session state: ended")
            default:
                break
            }
        }
    }

    nonisolated func workoutSession(
        _ workoutSession: HKWorkoutSession,
        didFailWithError error: Error
    ) {
        Logger.healthKit.error("Workout session failed: \(error.localizedDescription)")
        Task { @MainActor in
            guard workoutSession === self.session else { return }
            isSessionActive = false
            heartRate = nil
        }
    }
}

extension HealthKitManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
            Logger.healthKit.warning("Could not get heart rate type")
            return
        }

        if collectedTypes.contains(heartRateType) {
            let statistics = workoutBuilder.statistics(for: heartRateType)
            let heartRateUnit = HKUnit.count().unitDivided(by: .minute())

            if let mostRecentQuantity = statistics?.mostRecentQuantity() {
                let heartRateValue = mostRecentQuantity.doubleValue(for: heartRateUnit)

                Task { @MainActor in
                    self.heartRate = heartRateValue
                }
            } else {
                Logger.healthKit.warning("No most recent heart rate quantity available")
            }
        }
    }

    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {
        // Handle workout events if needed (pause, resume markers)
    }
}
