import Foundation
import ActivityKit
import OSLog
import UIKit

private let kAppGroup = "group.com.liftosaur.workout"

// A Live Activity "Complete Set" tap can't optimistically update the widget
// (next-set/exercise depends on JS-only logic: supersets, update scripts,
// AMRAP, etc.), so it round-trips through JS. The intent posts this Darwin
// notification to drain the request immediately instead of waiting for the
// 0.5s polling timer, and waits on `completeSetAckRequestId` (written below
// after the activity actually re-renders) so iOS keeps the process alive
// until the refresh lands.
private let kCompleteSetRequestedDarwinName = "com.liftosaur.workout.completeSetRequested"

private let liveActivityLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.liftosaur.www",
                                        category: "liveactivity")

@objc public class LiftosaurLiveActivityImpl: NSObject {
  @objc public static let shared = LiftosaurLiveActivityImpl()

  private var eventEmitter: ((NSDictionary) -> Void)?
  private var pollingTimer: Timer?
  private var cachedImageUrls = Set<String>()
  private var manager: LiveActivityManager? = {
    if #available(iOS 16.2, *) { return LiveActivityManager.shared }
    return nil
  }()

  override init() {
    super.init()
    // iOS only allows Activity.request from the foreground. When the watch
    // sends an updateLiveActivity while the phone app is backgrounded, the
    // start attempt fails with .visibility and the state is queued. Drain
    // that queue as soon as the app comes back to the foreground.
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    registerCompleteSetDarwinObserver()
  }

  @objc private func handleDidBecomeActive() {
    processPendingWorkout()
  }

  private func registerCompleteSetDarwinObserver() {
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterAddObserver(
      center,
      observer,
      { _, _, _, _, _ in
        DispatchQueue.main.async {
          LiftosaurLiveActivityImpl.shared.handleCompleteSetRequested()
        }
      },
      kCompleteSetRequestedDarwinName as CFString,
      nil,
      .deliverImmediately
    )
  }

  @objc private func handleCompleteSetRequested() {
    startPollingIfNeeded()
    tick()
  }

  @objc public func isSupported() -> Bool {
    if #available(iOS 16.2, *) { return true }
    return false
  }

  @objc public func setEventEmitter(_ block: @escaping (NSDictionary) -> Void) {
    eventEmitter = block
  }

  @objc public func start(state: NSDictionary) {
    update(state: state)
  }

  @objc public func update(state: NSDictionary) {
    guard #available(iOS 16.2, *) else { return }
    guard let contentState = Self.contentState(from: state) else {
      liveActivityLogger.error("LiftosaurLiveActivityImpl.update: failed to build content state")
      return
    }
    startPollingIfNeeded()
    cacheExerciseImageIfNeeded(contentState.historyEntryState?.exerciseImageUrl)
    let ackRequestId = state["completeSetRequestId"] as? String
    Task { await LiveActivityManager.shared.update(contentState: contentState, ackRequestId: ackRequestId) }
  }

  private func cacheExerciseImageIfNeeded(_ urlString: String?) {
    guard let urlString = urlString, !urlString.isEmpty else { return }
    guard !cachedImageUrls.contains(urlString) else { return }
    guard let url = URL(string: urlString) else { return }
    guard let sharedContainer = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: kAppGroup
    ) else { return }

    let cacheDir = sharedContainer.appendingPathComponent("imageCache")
    try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)

    let filename = urlString
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: ":", with: "_")
    let cacheFile = cacheDir.appendingPathComponent(filename)
    if FileManager.default.fileExists(atPath: cacheFile.path) {
      cachedImageUrls.insert(urlString)
      return
    }

    cachedImageUrls.insert(urlString)
    Task.detached { [weak self] in
      let config = URLSessionConfiguration.ephemeral
      config.timeoutIntervalForRequest = 5
      config.timeoutIntervalForResource = 10
      config.urlCache = nil
      config.requestCachePolicy = .reloadIgnoringLocalCacheData
      let session = URLSession(configuration: config)
      defer { session.finishTasksAndInvalidate() }

      do {
        let (data, response) = try await session.data(from: url)
        if let http = response as? HTTPURLResponse, http.statusCode == 200, !data.isEmpty {
          try data.write(to: cacheFile)
          liveActivityLogger.info("Cached exercise image at \(cacheFile.lastPathComponent)")
        } else {
          self?.cachedImageUrls.remove(urlString)
        }
      } catch {
        self?.cachedImageUrls.remove(urlString)
        liveActivityLogger.error("Failed to cache exercise image \(urlString): \(error.localizedDescription)")
      }
    }
  }

  @objc public func end() {
    stopPolling()
    if #available(iOS 16.2, *) {
      Task { await LiveActivityManager.shared.endWorkout() }
    }
  }

  @objc public func processPendingWorkout() {
    guard #available(iOS 16.2, *) else { return }
    Task { [weak self] in
      guard let self = self else { return }
      guard let pending = await LiveActivityManager.shared.takePendingState() else { return }
      // Route the replay through the impl wrapper so image caching and the
      // tick-polling timer get (re-)kicked. The background cache attempt may
      // have failed or been suspended, and polling is what delivers LA
      // button taps once the activity is back up.
      self.cacheExerciseImageIfNeeded(pending.historyEntryState?.exerciseImageUrl)
      self.startPollingIfNeeded()
      await LiveActivityManager.shared.update(contentState: pending)
    }
  }

  private func startPollingIfNeeded() {
    guard pollingTimer == nil else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self = self, self.pollingTimer == nil else { return }
      self.pollingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
        self?.tick()
      }
    }
  }

  private func stopPolling() {
    DispatchQueue.main.async { [weak self] in
      self?.pollingTimer?.invalidate()
      self?.pollingTimer = nil
    }
  }

  private func tick() {
    guard let sharedDefaults = UserDefaults(suiteName: kAppGroup) else { return }

    sharedDefaults.set(Date().timeIntervalSince1970, forKey: "appHeartbeat")

    if let entryIndex = sharedDefaults.object(forKey: "completeSetEntryIndex") as? Int,
       let setIndex = sharedDefaults.object(forKey: "completeSetSetIndex") as? Int {
      let requestId = sharedDefaults.string(forKey: "completeSetRequestId")
      sharedDefaults.removeObject(forKey: "completeSetEntryIndex")
      sharedDefaults.removeObject(forKey: "completeSetSetIndex")
      sharedDefaults.removeObject(forKey: "completeSetStateVersion")
      sharedDefaults.removeObject(forKey: "completeSetRestTimer")
      sharedDefaults.removeObject(forKey: "completeSetRestTimerSince")
      sharedDefaults.removeObject(forKey: "completeSetRequestId")
      var event: [String: Any] = ["action": "completeSet", "entryIndex": entryIndex, "setIndex": setIndex]
      if let requestId = requestId {
        event["completeSetRequestId"] = requestId
      }
      emit(event)
    }

    if let action = sharedDefaults.string(forKey: "adjustRestTimerAction") {
      let entryIndex = sharedDefaults.integer(forKey: "adjustRestTimerEntryIndex")
      let setIndex = sharedDefaults.integer(forKey: "adjustRestTimerSetIndex")
      sharedDefaults.removeObject(forKey: "adjustRestTimer")
      sharedDefaults.removeObject(forKey: "adjustRestTimerAction")
      sharedDefaults.removeObject(forKey: "adjustRestTimerSince")
      sharedDefaults.removeObject(forKey: "adjustRestTimerEntryIndex")
      sharedDefaults.removeObject(forKey: "adjustRestTimerSetIndex")
      let delta = action == "increase" ? 15 : -15
      emit(["action": "addRestTime",
            "entryIndex": entryIndex,
            "setIndex": setIndex,
            "addSeconds": delta])
    }
  }

  private func emit(_ event: [String: Any]) {
    eventEmitter?(event as NSDictionary)
  }

  // MARK: - NSDictionary → ContentState

  static func contentState(from dict: NSDictionary) -> WorkoutAttributes.ContentState? {
    let workoutStartTimestamp = (dict["workoutStartTimestamp"] as? NSNumber)?.intValue ?? 0
    var restTimer: LiveActivityRest?
    if let rest = dict["rest"] as? NSDictionary {
      let since = (rest["restTimerSince"] as? NSNumber)?.intValue ?? 0
      let timer = (rest["restTimer"] as? NSNumber)?.intValue ?? 0
      restTimer = LiveActivityRest(restTimerSince: since, restTimer: timer)
    }
    var entry: HistoryEntryState?
    if let e = dict["entry"] as? NSDictionary {
      let completedSetsRaw = e["completedSets"] as? [NSDictionary] ?? []
      let completedSets: [LiveActivitySet] = completedSetsRaw.compactMap { c in
        let statusString = (c["status"] as? String) ?? "not-finished"
        let isWarmup = (c["isWarmup"] as? NSNumber)?.boolValue ?? false
        let status = SetCompletionState(rawValue: statusString) ?? .incomplete
        return LiveActivitySet(status: status, isWarmup: isWarmup)
      }
      entry = HistoryEntryState(
        exerciseName: e["exerciseName"] as? String ?? "",
        currentSet: (e["currentSet"] as? NSNumber)?.intValue ?? 0,
        totalSets: (e["totalSets"] as? NSNumber)?.intValue ?? 0,
        completedSets: completedSets,
        canCompleteFromLiveActivity: (e["canCompleteFromLiveActivity"] as? NSNumber)?.boolValue ?? false,
        isWarmup: (e["isWarmup"] as? NSNumber)?.boolValue ?? false,
        entryIndex: (e["entryIndex"] as? NSNumber)?.intValue ?? 0,
        setIndex: (e["setIndex"] as? NSNumber)?.intValue ?? 0,
        exerciseImageUrl: e["exerciseImageUrl"] as? String,
        targetReps: e["targetReps"] as? String,
        targetWeight: e["targetWeight"] as? String,
        targetRPE: e["targetRPE"] as? String,
        targetTimer: e["targetTimer"] as? String,
        plates: e["plates"] as? String,
        currentWeight: e["currentWeight"] as? String,
        currentReps: e["currentReps"] as? String
      )
    }
    return WorkoutAttributes.ContentState(
      historyEntryState: entry,
      workoutStartTimestamp: workoutStartTimestamp,
      restTimer: restTimer,
      stateVersion: nil
    )
  }
}

@available(iOS 16.2, *)
actor LiveActivityManager {
  static let shared = LiveActivityManager()

  private var restTimerTask: Task<Void, Never>?
  private var workoutTimerTask: Task<Void, Never>?

  private var currentState: WorkoutAttributes.ContentState?
  private(set) var stateVersion: Int = 0
  private var updateTask: Task<Void, Never>?
  private var currentActivityID: Activity<WorkoutAttributes>.ID?
  private var pendingState: WorkoutAttributes.ContentState?
  // Tombstone the most recently ended workout's start timestamp so a stale
  // updateLiveActivity (e.g., delivered out-of-order via transferUserInfo
  // after endWorkout) can't resurrect it.
  private var lastEndedWorkoutStartTimestamp: Int = 0

  private init() {}

  func takePendingState() -> WorkoutAttributes.ContentState? {
    let s = pendingState
    pendingState = nil
    return s
  }

  private var currentActivity: Activity<WorkoutAttributes>? {
    if let currentActivityID,
       let activity = Activity<WorkoutAttributes>.activities.first(where: { $0.id == currentActivityID }) {
      return activity
    }
    if let activity = Activity<WorkoutAttributes>.activities.first {
      currentActivityID = activity.id
      return activity
    }
    return nil
  }

  private func cleanupOrphanedActivities() async {
    let activities = Activity<WorkoutAttributes>.activities
    guard !activities.isEmpty else { return }

    if let currentActivityID,
       activities.contains(where: { $0.id == currentActivityID }) {
      for activity in activities where activity.id != currentActivityID {
        liveActivityLogger.info("Ending orphaned Live Activity (ID: \(activity.id))")
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    } else if let primary = activities.first {
      currentActivityID = primary.id
      for activity in activities where activity.id != primary.id {
        liveActivityLogger.info("Ending orphaned Live Activity (ID: \(activity.id))")
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }

  private func staleDate(for state: WorkoutAttributes.ContentState) -> Date {
    if let restTimer = state.restTimer {
      let target = Double(restTimer.restTimerSince + restTimer.restTimer * 1000) / 1000.0
      return Date(timeIntervalSince1970: target)
    }
    return Date().addingTimeInterval(60)
  }

  func update(contentState: WorkoutAttributes.ContentState, ackRequestId: String? = nil) async {
    if contentState.workoutStartTimestamp > 0,
       contentState.workoutStartTimestamp == lastEndedWorkoutStartTimestamp {
      liveActivityLogger.info("Ignoring update for ended workout (ts=\(contentState.workoutStartTimestamp))")
      return
    }
    updateTask?.cancel()
    await updateTask?.value

    updateTask = Task {
      await cleanupOrphanedActivities()

      restTimerTask?.cancel(); restTimerTask = nil
      workoutTimerTask?.cancel(); workoutTimerTask = nil

      stateVersion += 1
      let capturedVersion = stateVersion

      var versionedState = contentState
      versionedState.stateVersion = capturedVersion
      currentState = versionedState
      let stale = staleDate(for: versionedState)

      do {
        if let activity = currentActivity {
          currentActivityID = activity.id
          await activity.update(ActivityContent(state: versionedState, staleDate: stale))
          liveActivityLogger.info("Updated existing Live Activity (id=\(activity.id))")
        } else {
          let newActivity = try Activity.request(
            attributes: WorkoutAttributes(),
            content: ActivityContent(state: versionedState, staleDate: stale),
            pushType: nil
          )
          currentActivityID = newActivity.id
          liveActivityLogger.info("Created new Live Activity (id=\(newActivity.id))")
        }
        pendingState = nil
        // Ack only after the activity actually re-rendered, so the waiting
        // CompleteSetIntent keeps the app alive until the refresh is visible.
        if let ackRequestId = ackRequestId, let defaults = UserDefaults(suiteName: kAppGroup) {
          defaults.set(ackRequestId, forKey: "completeSetAckRequestId")
        }
      } catch {
        liveActivityLogger.error("Failed to update/create Live Activity: \(error.localizedDescription)")
        if let authError = error as? ActivityAuthorizationError, case .visibility = authError {
          pendingState = contentState
          liveActivityLogger.info("Queued Live Activity for retry (visibility error)")
        }
        return
      }

      if let restTimer = contentState.restTimer {
        scheduleRestTimerUpdate(restTimerSince: restTimer.restTimerSince,
                                restTimer: restTimer.restTimer,
                                expectedVersion: capturedVersion)
      }
      scheduleWorkoutTimeUpdates(expectedVersion: capturedVersion)
    }
    await updateTask?.value
  }

  private func scheduleRestTimerUpdate(restTimerSince: Int, restTimer: Int, expectedVersion: Int) {
    let target = Double(restTimerSince + restTimer * 1000) / 1000.0
    let delay = Date(timeIntervalSince1970: target).timeIntervalSince(Date())
    guard delay > 0 else { return }

    restTimerTask = Task {
      do { try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000)) }
      catch { return }

      guard stateVersion == expectedVersion else { return }

      if let activity = currentActivity, let state = currentState {
        let nextStale = Date().addingTimeInterval(60)
        await activity.update(ActivityContent(state: state, staleDate: nextStale))
        liveActivityLogger.info("Live Activity updated after rest timer expired")
      }
    }
  }

  private func scheduleWorkoutTimeUpdates(expectedVersion: Int) {
    guard workoutTimerTask == nil else { return }

    workoutTimerTask = Task {
      while true {
        do { try await Task.sleep(nanoseconds: 60_000_000_000) }
        catch { return }
        guard stateVersion == expectedVersion else { return }
        if let activity = currentActivity, let state = currentState {
          let nextStale = Date().addingTimeInterval(60)
          await activity.update(ActivityContent(state: state, staleDate: nextStale))
        }
      }
    }
  }

  func endWorkout() async {
    // Always clear local state — including pendingState — so a workout that
    // ended before the phone foregrounded doesn't get replayed as a ghost LA
    // by processPendingWorkout on the next didBecomeActive. Record the
    // ended workout's start timestamp so a late updateLiveActivity for the
    // same workout (e.g., delivered after endWorkout via transferUserInfo)
    // gets ignored instead of resurrecting it.
    let endedTs = currentState?.workoutStartTimestamp ?? pendingState?.workoutStartTimestamp ?? 0
    if endedTs > 0 {
      lastEndedWorkoutStartTimestamp = endedTs
    }
    pendingState = nil
    restTimerTask?.cancel(); restTimerTask = nil
    workoutTimerTask?.cancel(); workoutTimerTask = nil
    currentState = nil
    guard let activity = currentActivity else {
      currentActivityID = nil
      return
    }
    liveActivityLogger.info("Ending Live Activity (id=\(activity.id))")
    currentActivityID = nil
    await activity.end(nil, dismissalPolicy: .immediate)
  }
}
