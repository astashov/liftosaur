//
//  WorkoutManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import Combine
import OSLog
import WatchKit
import AVFoundation

struct CompletedSetInfo: Equatable {
    let entryIndex: Int
    let setIndex: Int
}

@MainActor
class WorkoutManager: NSObject, ObservableObject, AVAudioPlayerDelegate {
    static let shared = WorkoutManager()

    @Published var currentWorkout: WatchWorkout?
    @Published var activeWorkout: WatchWorkout?
    @Published var setsCompletedDuringSync: CompletedSetInfo? = nil
    @Published var workoutStartTime: Date?
    @Published var isLoading = false
    @Published var isStartingWorkout = false
    @Published var isFinishingWorkout = false
    @Published var isCompletingSet = false
    @Published var error: String?
    @Published var isPaused = false
    @Published var workoutTime: TimeInterval = 0
    @Published var restTimer: WatchRestTimer?
    @Published var heartRate: Double?
    @Published var hasSubscription: Bool = true  // Default to true to avoid flash of premium screen
    private var workoutIntervals: [[Double?]] = []  // [[startMs, endMs or nil]]
    private var heartRateCancellable: AnyCancellable?

    // Rest timer completion monitoring
    private var restTimerMonitor: Timer?
    private var hasPlayedRestTimerHaptic: Bool = false
    private var audioPlayer: AVAudioPlayer?
    private var cachedVolume: Double = 1.0

    private(set) var engine: LiftosaurEngine?
    private let storageKey = "liftosaur_storage"
    private let storage = WatchStorageManager.shared

    override init() {
        super.init()
        heartRateCancellable = HealthKitManager.shared.$heartRate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] newHeartRate in
                self?.heartRate = newHeartRate
            }
        Task {
            await initialize()
        }
    }

    func initialize() async {
        WatchCrashReporter.shared.resetBreadcrumbs()
        WatchCrashReporter.shared.writeBreadcrumb("init_start")
        WatchCrashReporter.shared.reportMemory("init_start")

        isLoading = true
        error = nil
        engine = nil

        WatchCrashReporter.shared.writeBreadcrumb("checking_bundle")
        if !WatchCacheManager.shared.hasBundleAvailable() {
            Logger.workout.info(" no local bundle, fetching from network")
            _ = await WatchCacheManager.shared.fetchAndCacheBundle()
        }
        WatchCrashReporter.shared.reportMemory("before_engine")

        WatchCrashReporter.shared.writeBreadcrumb("creating_engine")
        engine = LiftosaurEngine()
        WatchCrashReporter.shared.reportMemory("after_engine")

        if engine == nil {
            WatchCrashReporter.shared.writeBreadcrumb("engine_failed_retrying")
            Logger.workout.info(" engine init failed, clearing cache and re-fetching bundle")
            WatchCacheManager.shared.clearCache()
            let result = await WatchCacheManager.shared.fetchAndCacheBundle()
            if result.success {
                engine = LiftosaurEngine()
                WatchCrashReporter.shared.reportMemory("after_engine_retry")
            }
        }

        if engine == nil {
            WatchCrashReporter.shared.writeBreadcrumb("engine_failed_final")
            error = "Failed to initialize JS engine"
            isLoading = false
            return
        }

        WatchCrashReporter.shared.writeBreadcrumb("processing_pending_storage")
        await WatchSyncManager.shared.processPendingIncomingStorage()
        WatchCrashReporter.shared.reportMemory("after_pending_storage")

        WatchCrashReporter.shared.writeBreadcrumb("checking_subscription")
        await checkSubscription()
        WatchCrashReporter.shared.reportMemory("after_subscription")

        WatchCrashReporter.shared.writeBreadcrumb("loading_workouts")
        await loadActiveWorkout()
        WatchCrashReporter.shared.reportMemory("after_active_workout")
        await loadNextWorkout()
        isLoading = false
        WatchCrashReporter.shared.reportMemory("init_complete")

        WatchCrashReporter.shared.writeBreadcrumb("init_complete")

        // Background tasks (non-blocking):
        Task { @MainActor [weak self] in

            // Fetch bundle update for next launch (if we have a local bundle already)
            if WatchCacheManager.shared.hasBundleAvailable() {
                let result = await WatchCacheManager.shared.fetchAndCacheBundle()
                if result.needsUpdate {
                    Logger.workout.info(" watch bundle updated, silently reinitializing engine")
                    await self?.initialize()
                }
            }

            // Sync with server if authenticated
            if AuthManager.shared.isAuthenticated {
                Logger.workout.info(" syncing with server in background")
                let fetched = await WatchSyncManager.shared.fetchStorageFromServer()
                if fetched {
                    await self?.checkSubscription()
                    await self?.loadActiveWorkout()
                    await self?.loadNextWorkout()
                }
                WatchSyncManager.shared.attemptSync()
            }
        }
    }

    func loadNextWorkout() async {
        let workout: WatchWorkout? = await withStorage({ engine, storageJson in
            await engine.getNextHistoryRecord(storageJson: storageJson)
        })
        currentWorkout = workout
        // "No current program" is not an error - it means storage exists but no program is selected
        if error == "No current program" {
            error = nil
        } else if workout != nil {
            error = nil
        }
    }

    func hasProgram() async -> Bool {
        guard let engine = engine,
              let storageJson = loadStorage() else {
            return false
        }
        return await engine.hasProgram(storageJson: storageJson)
    }

    func checkSubscription() async {
        guard let engine = engine,
              let storageJson = loadStorage() else {
            // No storage yet - keep default (true) to avoid showing premium screen
            // before we know the actual subscription status
            return
        }
        hasSubscription = await engine.hasSubscription(storageJson: storageJson)
    }

    func loadActiveWorkout() async {
        let workout: WatchWorkout? = await withStorageSilentOptional { engine, storageJson in
            await engine.getProgress(storageJson: storageJson)
        }
        activeWorkout = workout
        if workout != nil && workoutStartTime == nil {
            workoutStartTime = Date()
        } else if workout == nil {
            workoutStartTime = nil
            isPaused = false
            workoutTime = 0
            restTimer = nil
        }
        if workout != nil {
            await loadWorkoutStatus()
            await loadRestTimer()
            // Start HK session in background - don't block UI loading
            Logger.sync.info(">>> loadActiveWorkout: about to start HK session task")
            Task {
                let recovered = await HealthKitManager.shared.recoverActiveSession()
                Logger.sync.info(">>> loadActiveWorkout: recoverActiveSession returned \(recovered), isSessionActive=\(HealthKitManager.shared.isSessionActive)")
                if !recovered && !HealthKitManager.shared.isSessionActive {
                    Logger.sync.info(">>> loadActiveWorkout: calling startWorkoutSession")
                    await HealthKitManager.shared.startWorkoutSession()
                }
            }
        }
    }

    func startWorkout() async {
        isStartingWorkout = true
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.startWorkout(storageJson: storageJson, deviceId: deviceId)
            },
            operationName: "start workout"
        ) != nil else {
            isStartingWorkout = false
            return
        }
        workoutStartTime = Date()
        await loadActiveWorkout()
        isStartingWorkout = false
    }

    func discardWorkout() async {
        Logger.workout.info(" discardWorkout() called")
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.discardWorkout(storageJson: storageJson, deviceId: deviceId)
            },
            operationName: "discard workout"
        ) != nil else {
            Logger.workout.error(" discardWorkout: withStorageMutation returned nil")
            return
        }
        Logger.workout.info(" discardWorkout: storage mutation succeeded")
        // End HealthKit session in background - don't block navigation
        Task { await HealthKitManager.shared.endWorkoutSession(save: false) }
        WatchConnectivityManager.shared.sendEndWorkout()
        activeWorkout = nil
        workoutStartTime = nil
        restTimer = nil
        restTimerMonitor?.invalidate()
        restTimerMonitor = nil
        Logger.workout.info(" discardWorkout() completed")
    }

    /// Clears workout state when workout ends from another device (phone)
    func clearWorkoutState() {
        activeWorkout = nil
        workoutStartTime = nil
        isPaused = false
        workoutTime = 0
        restTimer = nil
        restTimerMonitor?.invalidate()
        restTimerMonitor = nil
    }

    func finishWorkout(saveToHealth: Bool) async -> WatchFinishWorkoutSummary? {
        Logger.workout.info(" finishWorkout() called, saveToHealth=\(saveToHealth)")
        isFinishingWorkout = true
        let updatedStorage = await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.finishWorkout(storageJson: storageJson, deviceId: deviceId)
            },
            operationName: "finish workout"
        )
        isFinishingWorkout = false

        guard updatedStorage != nil else {
            Logger.workout.error(" finishWorkout: withStorageMutation returned nil")
            return nil
        }
        Logger.workout.info(" finishWorkout: storage mutation succeeded, getting summary")

        // Get summary IMMEDIATELY while cache is valid, before any sync operations
        // that might receive phone storage (with empty history) and invalidate cache
        let summary = await getFinishWorkoutSummary()

        if let summary = summary {
            Logger.workout.info(" finishWorkout: got summary - dayName=\(summary.dayName), exercises=\(summary.exercises.count)")
        } else {
            Logger.workout.error(" finishWorkout: getFinishWorkoutSummary returned nil")
        }

        Task {
            await HealthKitManager.shared.endWorkoutSession(save: saveToHealth)
        }
        WatchConnectivityManager.shared.sendEndWorkout()
        activeWorkout = nil
        workoutStartTime = nil
        isPaused = false
        workoutTime = 0
        restTimer = nil
        restTimerMonitor?.invalidate()
        restTimerMonitor = nil
        Logger.workout.info(" finishWorkout: returning summary (nil=\(summary == nil))")
        return summary
    }

    func getFinishWorkoutSummary() async -> WatchFinishWorkoutSummary? {
        await withStorageSilentOptional { engine, storageJson in
            await engine.getFinishWorkoutSummary(storageJson: storageJson)
        }
    }

    func getHealthSettings() async -> WatchHealthSettings? {
        await withStorageSilent { engine, storageJson in
            await engine.getHealthSettings(storageJson: storageJson)
        }
    }

    func finishWorkoutContinue() async {
        guard let engine = engine,
              let storageJson = loadStorage() else {
            return
        }
        _ = await engine.finishWorkoutContinue(storageJson: storageJson)
    }

    func completeSet(entryIndex: Int, setIndex: Int) async {
        isCompletingSet = true
        let result = await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.completeSet(storageJson: storageJson, deviceId: deviceId, entryIndex: entryIndex, setIndex: setIndex)
            },
            operationName: "complete set"
        )
        isCompletingSet = false
        guard result != nil else { return }
        await loadActiveWorkout()

        // Send rest timer to phone so it can schedule notification
        if let timer = restTimer {
            WatchConnectivityManager.shared.sendSyncRestTimer(
                restTimerSince: Int64(timer.timerSince),
                restTimer: timer.timer
            )
        }
    }

    func getNextEntryAndSetIndex(entryIndex: Int, setIndex: Int) async -> WatchNextEntryAndSetIndex? {
        await withStorageSilentOptional { engine, storageJson in
            await engine.getNextEntryAndSetIndex(storageJson: storageJson, entryIndex: entryIndex, setIndex: setIndex)
        }
    }

    func getValidWeights(entryIndex: Int, currentWeight: Double, unit: String?) async -> WatchValidWeights? {
        await withStorageSilent { engine, storageJson in
            await engine.getValidWeights(
                storageJson: storageJson,
                entryIndex: entryIndex,
                currentWeight: currentWeight,
                unit: unit,
                countUp: 50,
                countDown: 50
            )
        }
    }

    func updateSetReps(entryIndex: Int, setIndex: Int, reps: Int) async {
        _ = await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.updateSetReps(storageJson: storageJson, deviceId: deviceId, entryIndex: entryIndex, setIndex: setIndex, reps: reps)
            },
            operationName: "update set reps"
        )
    }

    func updateSetRepsLeft(entryIndex: Int, setIndex: Int, repsLeft: Int) async {
        _ = await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.updateSetRepsLeft(storageJson: storageJson, deviceId: deviceId, entryIndex: entryIndex, setIndex: setIndex, repsLeft: repsLeft)
            },
            operationName: "update set reps left"
        )
    }

    func updateSetWeight(entryIndex: Int, setIndex: Int, weight: Double) async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.updateSetWeight(storageJson: storageJson, deviceId: deviceId, entryIndex: entryIndex, setIndex: setIndex, weightValue: weight)
            },
            operationName: "update set weight"
        ) != nil else { return }
        await loadActiveWorkout()
    }

    func getAmrapModal() async -> WatchAmrapModal? {
        await withStorageSilentOptional { engine, storageJson in
            await engine.getAmrapModal(storageJson: storageJson)
        }
    }

    func adjustRestTimer(adjustment: Int) async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.adjustRestTimer(storageJson: storageJson, deviceId: deviceId, adjustment: adjustment)
            },
            operationName: "adjust rest timer"
        ) != nil else { return }
        await loadRestTimer()

        // Send updated timer to phone to sync Live Activity
        if let timer = restTimer {
            WatchConnectivityManager.shared.sendSyncRestTimer(
                restTimerSince: Int64(timer.timerSince),
                restTimer: timer.timer
            )
        }
    }

    func stopRestTimer() async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.stopRestTimer(storageJson: storageJson, deviceId: deviceId)
            },
            operationName: "stop rest timer"
        ) != nil else { return }
        await loadRestTimer()

        // Notify phone to cancel notification
        WatchConnectivityManager.shared.sendStopRestTimer()
    }

    func loadWorkoutStatus() async {
        let status: WatchWorkoutStatus? = await withStorageSilentOptional { engine, storageJson in
            await engine.getWorkoutStatus(storageJson: storageJson)
        }
        if let status = status {
            isPaused = status.isPaused
            workoutIntervals = status.intervals
            refreshWorkoutTime()
        } else {
            isPaused = false
            workoutIntervals = []
            workoutTime = 0
        }
    }

    func refreshWorkoutTime() {
        let nowMs = Date().timeIntervalSince1970 * 1000
        var totalMs: Double = 0
        for interval in workoutIntervals {
            guard interval.count >= 2, let startMs = interval[0] else { continue }
            let endMs = interval[1] ?? nowMs
            totalMs += endMs - startMs
        }
        workoutTime = totalMs / 1000  // Convert to seconds
    }

    func loadRestTimer() async {
        let previousTimer = restTimer
        restTimer = await withStorageSilentOptional { engine, storageJson in
            await engine.getRestTimer(storageJson: storageJson)
        }
        // Load volume setting for rest timer sound
        if let volume = await withStorageSilentOptional({ engine, storageJson in
            await engine.getVolume(storageJson: storageJson)
        }) {
            cachedVolume = volume.volume
        }
        updateRestTimerMonitor(previousTimer: previousTimer)
    }

    private func updateRestTimerMonitor(previousTimer: WatchRestTimer?) {
        // If rest timer was cleared or is a new timer (different start time), reset haptic flag
        if restTimer == nil || restTimer?.timerSince != previousTimer?.timerSince {
            hasPlayedRestTimerHaptic = false
        }

        // If timer was adjusted and is no longer completed, reset haptic flag
        if let timer = restTimer, hasPlayedRestTimerHaptic {
            let timerSinceDate = Date(timeIntervalSince1970: timer.timerSince / 1000)
            let elapsed = Int(Date().timeIntervalSince(timerSinceDate))
            if elapsed < timer.timer {
                hasPlayedRestTimerHaptic = false
            }
        }

        // Stop existing monitor
        restTimerMonitor?.invalidate()
        restTimerMonitor = nil

        // Start new monitor if we have an active rest timer
        guard let timer = restTimer else { return }

        restTimerMonitor = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.checkRestTimerCompletion()
            }
        }
    }

    private func checkRestTimerCompletion() {
        guard let timer = restTimer, !hasPlayedRestTimerHaptic else { return }

        let timerSinceDate = Date(timeIntervalSince1970: timer.timerSince / 1000)
        let elapsed = Int(Date().timeIntervalSince(timerSinceDate))

        // Only chirp if within 5 seconds of timer completion
        // This prevents repeated chirps when storage syncs from another device
        // where the timer may already be well past the threshold
        let maxChirpWindow = 5
        if elapsed >= timer.timer && elapsed <= timer.timer + maxChirpWindow {
            hasPlayedRestTimerHaptic = true
            WKInterfaceDevice.current().play(.notification)
            playCompletionSound()
        } else if elapsed > timer.timer + maxChirpWindow {
            // Timer is past the window, mark as played to stop monitoring
            hasPlayedRestTimerHaptic = true
        }
    }

    private func playCompletionSound() {
        guard let url = Bundle.main.url(forResource: "notification", withExtension: "m4r") else {
            Logger.workout.warning("notification.m4r not found in bundle")
            return
        }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.ambient, options: .duckOthers)
            try session.setActive(true)
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.delegate = self
            audioPlayer?.volume = Float(cachedVolume)
            audioPlayer?.play()
        } catch {
            Logger.workout.error("Failed to play completion sound: \(error)")
        }
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            Logger.workout.error("Failed to deactivate audio session: \(error)")
        }
    }

    func pauseWorkout() async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.pauseWorkout(storageJson: storageJson, deviceId: deviceId)
            },
            operationName: "pause workout"
        ) != nil else { return }
        HealthKitManager.shared.pauseWorkoutSession()
        await loadWorkoutStatus()
    }

    func resumeWorkout() async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.resumeWorkout(storageJson: storageJson, deviceId: deviceId)
            },
            operationName: "resume workout"
        ) != nil else { return }
        HealthKitManager.shared.resumeWorkoutSession()
        await loadWorkoutStatus()
    }

    func togglePauseWorkout() async {
        if isPaused {
            await resumeWorkout()
        } else {
            await pauseWorkout()
        }
    }

    func addSet(entryIndex: Int) async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.addSet(storageJson: storageJson, deviceId: deviceId, entryIndex: entryIndex)
            },
            operationName: "add set"
        ) != nil else { return }
        await loadActiveWorkout()
    }

    func deleteSet(entryIndex: Int, setIndex: Int) async {
        guard await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.deleteSet(storageJson: storageJson, deviceId: deviceId, entryIndex: entryIndex, setIndex: setIndex)
            },
            operationName: "delete set"
        ) != nil else { return }
        await loadActiveWorkout()
    }

    func completeSetWithAmrap(
        completedReps: Int?,
        completedRepsLeft: Int?,
        completedWeight: Double?,
        completedRpe: Double?,
        userPromptedVars: [String: Any]?
    ) async {
        // Convert user vars to JSON string if present
        var userVarsJson: String? = nil
        if let userVars = userPromptedVars, !userVars.isEmpty {
            if let jsonData = try? JSONSerialization.data(withJSONObject: userVars),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                userVarsJson = jsonString
            }
        }

        isCompletingSet = true
        let result = await withStorageMutation(
            operation: { engine, storageJson, deviceId in
                await engine.completeSetWithAmrap(
                    storageJson: storageJson,
                    deviceId: deviceId,
                    completedReps: completedReps,
                    completedRepsLeft: completedRepsLeft,
                    completedWeight: completedWeight,
                    completedRpe: completedRpe,
                    userPromptedVarsJson: userVarsJson
                )
            },
            operationName: "complete set with amrap"
        )
        isCompletingSet = false
        guard result != nil else { return }
        await loadActiveWorkout()

        // Send rest timer to phone so it can schedule notification
        if let timer = restTimer {
            WatchConnectivityManager.shared.sendSyncRestTimer(
                restTimerSince: Int64(timer.timerSince),
                restTimer: timer.timer
            )
        }
    }

    // MARK: - Private Helpers

    private func loadStorage() -> String? {
        storage.loadString(forKey: storageKey)
    }

    private func withStorage<T>(
        _ operation: (LiftosaurEngine, String) async -> Result<T, EngineError>
    ) async -> T? {
        guard let engine = engine else {
            error = "Engine not initialized"
            return nil
        }
        guard let storageJson = loadStorage() else {
            error = "No storage found"
            return nil
        }

        let result = await operation(engine, storageJson)
        switch result {
        case .success(let value):
            return value
        case .failure(let err):
            error = errorMessage(from: err)
            return nil
        }
    }

    private func withStorageSilent<T>(
        _ operation: (LiftosaurEngine, String) async -> Result<T, EngineError>
    ) async -> T? {
        guard let engine = engine,
              let storageJson = loadStorage() else {
            return nil
        }

        let result = await operation(engine, storageJson)
        guard case .success(let value) = result else {
            return nil
        }
        return value
    }

    private func withStorageSilentOptional<T>(
        _ operation: (LiftosaurEngine, String) async -> Result<T?, EngineError>
    ) async -> T? {
        guard let engine = engine,
              let storageJson = loadStorage() else {
            return nil
        }

        let result = await operation(engine, storageJson)
        guard case .success(let value) = result else {
            return nil
        }
        return value
    }

    private func withStorageMutation(
        operation: (LiftosaurEngine, String, String) async -> Result<String, EngineError>,
        operationName: String
    ) async -> String? {
        guard let engine = engine else {
            error = "Engine not initialized"
            return nil
        }
        guard let storageJson = loadStorage() else {
            error = "No storage found"
            return nil
        }

        let deviceId = WatchSyncManager.shared.deviceId
        let result = await operation(engine, storageJson, deviceId)

        switch result {
        case .success(let updatedStorageJson):
            storage.saveString(updatedStorageJson, forKey: storageKey)
            Logger.workout.info(" \(operationName), saved updated storage")
            WatchSyncManager.shared.recordLocalChange(newStorage: updatedStorageJson)
            return updatedStorageJson
        case .failure(let err):
            error = errorMessage(from: err, defaultMessage: "Failed to \(operationName)")
            Logger.workout.info(" Error, \(String(describing: self.error))")
            return nil
        }
    }

    private func errorMessage(from err: EngineError, defaultMessage: String? = nil) -> String {
        switch err {
        case .evalFailed:
            return "Failed to evaluate script"
        case .dataConversion:
            return "Failed to convert data"
        case .jsError(let msg):
            return msg
        case .decodeFailed(let msg):
            Logger.engine.error("Decode failed: \(msg)")
            return defaultMessage ?? "Decode error: \(msg)"
        }
    }

    // MARK: - Storage Clear (for account switch)

    func reloadAfterStorageClear() {
        Logger.workout.info(" reloading after storage clear")

        // Invalidate engine's storage cache
        Task {
            await engine?.invalidateStorageCache()
        }

        // Clear workout state
        currentWorkout = nil
        activeWorkout = nil
        workoutStartTime = nil
        error = nil
        isPaused = false
        workoutTime = 0
        restTimer = nil
        workoutIntervals = []
        hasSubscription = true  // Reset to true until we know otherwise

        // Reload will show "no program" state until new storage arrives
        Task {
            await checkSubscription()
            await loadNextWorkout()
            await loadActiveWorkout()
        }
    }

    // MARK: - Manual Sync (pull-to-refresh)

    @Published var isSyncing = false

    /// Returns the date when storage was last updated (from originalId timestamp)
    var storageDate: Date? {
        guard let originalId = WatchSyncManager.shared.storageOriginalId else { return nil }
        return Date(timeIntervalSince1970: originalId / 1000)
    }

    func manualSync() async {
        guard !isSyncing else { return }

        Logger.workout.info(" manual sync requested")
        WatchCrashReporter.shared.reportMemory("sync_start")
        isSyncing = true

        // Request storage from phone (if reachable)
        if WatchConnectivityManager.shared.isReachable {
            Logger.workout.info(" requesting storage from phone")
            WatchConnectivityManager.shared.requestStorage()
        }

        // Fetch from server (if authenticated)
        if AuthManager.shared.isAuthenticated {
            Logger.workout.info(" fetching from server")
            let fetched = await WatchSyncManager.shared.fetchStorageFromServer()
            WatchCrashReporter.shared.reportMemory("after_server_fetch")
            if fetched {
                Logger.workout.info(" server fetch succeeded, reloading workouts")
                await checkSubscription()
                await loadActiveWorkout()
                await loadNextWorkout()
                WatchCrashReporter.shared.reportMemory("after_sync_reload")
            }
        }

        // Only attempt to push local changes if we have storage
        if WatchSyncManager.shared.currentStorage != nil {
            WatchSyncManager.shared.attemptSync()
        } else {
            // No storage to sync - reset status to synced
            WatchSyncManager.shared.syncStatus = .synced
        }

        isSyncing = false
        Logger.workout.info(" manual sync complete")
    }
}
