import AppIntents
import Foundation
import ActivityKit
import OSLog

private let kCompleteSetRequestedDarwinName = "com.liftosaur.workout.completeSetRequested"

@available(iOS 16.2, *)
func checkAndEndActivityIfAppKilled() async {
    guard let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") else {
        return
    }
    if let lastHeartbeat = sharedDefaults.object(forKey: "appHeartbeat") as? TimeInterval {
        let timeSinceHeartbeat = Date().timeIntervalSince1970 - lastHeartbeat
        if timeSinceHeartbeat > 5.0 {
            for activity in Activity<WorkoutAttributes>.activities {
                Logger.liveActivity.debug("Ending live activity by heartbeat")
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}

@available(iOS 16, *)
struct AdjustRestTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Adjust Rest Timer"

    @Parameter(title: "Action")
    var action: String
    
    @Parameter(title: "Entry Index")
    var entryIndex: Int

    @Parameter(title: "Set Index")
    var setIndex: Int
    
    @Parameter(title: "Rest Timer")
    var restTimer: Int
    
    @Parameter(title: "Rest Timer Since")
    var restTimerSince: Int

    init() {
        self.action = "increase"
        self.restTimer = 0
        self.restTimerSince = 0
        self.entryIndex = 0
        self.setIndex = 0
    }

    init(action: String, entryIndex: Int, setIndex: Int, restTimer: Int, restTimerSince: Int) {
        self.action = action
        self.entryIndex = entryIndex
        self.setIndex = setIndex
        self.restTimer = restTimer
        self.restTimerSince = restTimerSince
    }

    func perform() async throws -> some IntentResult {
        if #available(iOS 16.2, *) {
            await checkAndEndActivityIfAppKilled()

            let adjustment = (action == "increase") ? 15 : -15
            let newRestTimer = max(0, restTimer + adjustment)

            if let activity = Activity<WorkoutAttributes>.activities.first {
                var updatedState = activity.content.state
                updatedState.restTimer = LiveActivityRest(
                    restTimerSince: restTimerSince,
                    restTimer: newRestTimer,
                    isAuto: updatedState.restTimer?.isAuto ?? false
                )
                let targetTimestamp = Double(restTimerSince + newRestTimer * 1000) / 1000.0
                let staleDate = Date(timeIntervalSince1970: targetTimestamp)
                await activity.update(ActivityContent(state: updatedState, staleDate: staleDate))
                Logger.liveActivity.debug("Optimistic update: rest timer \(restTimer) -> \(newRestTimer)")
            }
        }

        if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
            sharedDefaults.set(action, forKey: "adjustRestTimerAction")
            sharedDefaults.set(entryIndex, forKey: "adjustRestTimerEntryIndex")
            sharedDefaults.set(setIndex, forKey: "adjustRestTimerSetIndex")
            sharedDefaults.set(restTimer, forKey: "adjustRestTimer")
            sharedDefaults.set(restTimerSince, forKey: "adjustRestTimerSince")
            Logger.liveActivity.debug("Syncing adjust rest timer (\(action), \(restTimer), \(formatTime(restTimerSince)))")
            sharedDefaults.synchronize()
        }
        return .result()
    }
    
    private func formatTime(_ milliseconds: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000.0)
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        formatter.timeZone = TimeZone.current  // Use local timezone
        return formatter.string(from: date)
    }
}

@available(iOS 16, *)
struct CompleteSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Complete Set"

    @Parameter(title: "Entry Index")
    var entryIndex: Int

    @Parameter(title: "Set Index")
    var setIndex: Int
    
    @Parameter(title: "Rest Timer")
    var restTimer: Int?

    @Parameter(title: "Rest Timer Since")
    var restTimerSince: Int?

    @Parameter(title: "State Version")
    var stateVersion: Int

    init() {
        self.entryIndex = 0
        self.setIndex = 0
        self.stateVersion = 0
    }

    init(entryIndex: Int, setIndex: Int, stateVersion: Int, restTimer: Int?, restTimerSince: Int?) {
        self.entryIndex = entryIndex
        self.setIndex = setIndex
        self.restTimer = restTimer
        self.restTimerSince = restTimerSince
        self.stateVersion = stateVersion
    }

    func perform() async throws -> some IntentResult {
        if #available(iOS 16.2, *) {
            await checkAndEndActivityIfAppKilled()
        }

        let requestId = "\(self.entryIndex)-\(self.setIndex)-\(Int(Date().timeIntervalSince1970 * 1000))"
        if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
            sharedDefaults.removeObject(forKey: "completeSetAckRequestId")
            sharedDefaults.set(self.entryIndex, forKey: "completeSetEntryIndex")
            sharedDefaults.set(self.setIndex, forKey: "completeSetSetIndex")
            sharedDefaults.set(self.restTimer, forKey: "completeSetRestTimer")
            sharedDefaults.set(self.restTimerSince, forKey: "completeSetRestTimerSince")
            sharedDefaults.set(self.stateVersion, forKey: "completeSetStateVersion")
            sharedDefaults.set(requestId, forKey: "completeSetRequestId")
            Logger.liveActivity.debug("Syncing complete set (\(self.entryIndex)/\(self.setIndex), version: \(self.stateVersion))")
            sharedDefaults.synchronize()
        }

        // Wake the app to drain the request now instead of waiting on its 0.5s
        // polling timer, then keep perform() suspended until the app reports it
        // re-rendered the Live Activity. As a LiveActivityIntent this runs in the
        // app's process, so awaiting here keeps the process scheduled long enough
        // for the JS round-trip + ActivityKit update to complete (otherwise iOS
        // suspends us mid-update and the lock-screen widget shows the stale set).
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterPostNotification(
            center,
            CFNotificationName(rawValue: kCompleteSetRequestedDarwinName as CFString),
            nil,
            nil,
            true
        )
        await Self.waitForCompleteSetAck(requestId: requestId, timeout: 5.0)

        return .result()
    }

    private static func waitForCompleteSetAck(requestId: String, timeout: TimeInterval) async {
        let defaults = UserDefaults(suiteName: "group.com.liftosaur.workout")
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if defaults?.string(forKey: "completeSetAckRequestId") == requestId {
                return
            }
            try? await Task.sleep(nanoseconds: 50_000_000)
        }
    }
}

@available(iOS 16, *)
struct RecordSetTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Record Set Timer"

    @Parameter(title: "Entry Index")
    var entryIndex: Int

    @Parameter(title: "Set Index")
    var setIndex: Int

    @Parameter(title: "Set Timer Since")
    var setTimerSince: Int

    @Parameter(title: "Keep Timing")
    var keepTiming: Bool

    init() {
        self.entryIndex = 0
        self.setIndex = 0
        self.setTimerSince = 0
        self.keepTiming = false
    }

    init(entryIndex: Int, setIndex: Int, setTimerSince: Int, keepTiming: Bool) {
        self.entryIndex = entryIndex
        self.setIndex = setIndex
        self.setTimerSince = setTimerSince
        self.keepTiming = keepTiming
    }

    func perform() async throws -> some IntentResult {
        if #available(iOS 16.2, *) {
            await checkAndEndActivityIfAppKilled()
        }

        let elapsedSeconds = max(0, Int((Date().timeIntervalSince1970 * 1000 - Double(setTimerSince)) / 1000.0))
        let requestId = "record-\(entryIndex)-\(setIndex)-\(Int(Date().timeIntervalSince1970 * 1000))"
        if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
            sharedDefaults.removeObject(forKey: "completeSetAckRequestId")
            sharedDefaults.set(entryIndex, forKey: "recordSetTimerEntryIndex")
            sharedDefaults.set(setIndex, forKey: "recordSetTimerSetIndex")
            sharedDefaults.set(elapsedSeconds, forKey: "recordSetTimerElapsedSeconds")
            sharedDefaults.set(keepTiming, forKey: "recordSetTimerKeepTiming")
            sharedDefaults.set(requestId, forKey: "completeSetRequestId")
            Logger.liveActivity.debug("Syncing record set timer (\(entryIndex)/\(setIndex), \(elapsedSeconds)s, keep: \(keepTiming))")
            sharedDefaults.synchronize()
        }

        // Same Darwin nudge + ack the complete-set button uses: drain the request now instead of waiting on
        // the 0.5s poll (which may not run after a background wake), and keep perform() alive until the app
        // re-rendered the activity — otherwise the tap can be dropped when the app is suspended.
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterPostNotification(
            center,
            CFNotificationName(rawValue: kCompleteSetRequestedDarwinName as CFString),
            nil,
            nil,
            true
        )
        await Self.waitForAck(requestId: requestId, timeout: 5.0)
        return .result()
    }

    private static func waitForAck(requestId: String, timeout: TimeInterval) async {
        let defaults = UserDefaults(suiteName: "group.com.liftosaur.workout")
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if defaults?.string(forKey: "completeSetAckRequestId") == requestId {
                return
            }
            try? await Task.sleep(nanoseconds: 50_000_000)
        }
    }
}

// "Go" during the get-ready countdown: skip the rest of the countdown and start the work clock now.
// Nothing is recorded — the set has not run yet — so unlike RecordSetTimerIntent there is no AMRAP
// variant to fall back to, and it is always safe to perform silently in the background.
@available(iOS 16, *)
struct StartSetTimerWorkIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Start Set Timer Work"

    @Parameter(title: "Entry Index")
    var entryIndex: Int

    @Parameter(title: "Set Index")
    var setIndex: Int

    // Identifies which countdown was on screen, not just which set: reopening the same set makes a new one.
    @Parameter(title: "Get Ready Since")
    var getReadySince: Int

    init() {
        self.entryIndex = 0
        self.setIndex = 0
        self.getReadySince = 0
    }

    init(entryIndex: Int, setIndex: Int, getReadySince: Int) {
        self.entryIndex = entryIndex
        self.setIndex = setIndex
        self.getReadySince = getReadySince
    }

    func perform() async throws -> some IntentResult {
        if #available(iOS 16.2, *) {
            await checkAndEndActivityIfAppKilled()
        }

        // Captured here, not when JS drains the queue: this can sit in the app group while the app is
        // suspended, and the work clock has to start when the user actually tapped.
        let tappedAt = Int(Date().timeIntervalSince1970 * 1000)
        let requestId = "startwork-\(tappedAt)"
        if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
            sharedDefaults.removeObject(forKey: "completeSetAckRequestId")
            sharedDefaults.set(true, forKey: "startSetTimerWork")
            sharedDefaults.set(entryIndex, forKey: "startSetTimerWorkEntryIndex")
            sharedDefaults.set(setIndex, forKey: "startSetTimerWorkSetIndex")
            sharedDefaults.set(tappedAt, forKey: "startSetTimerWorkTappedAt")
            sharedDefaults.set(getReadySince, forKey: "startSetTimerWorkGetReadySince")
            sharedDefaults.set(requestId, forKey: "completeSetRequestId")
            Logger.liveActivity.debug("Syncing start set timer work (\(entryIndex)/\(setIndex))")
            sharedDefaults.synchronize()
        }

        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterPostNotification(
            center,
            CFNotificationName(rawValue: kCompleteSetRequestedDarwinName as CFString),
            nil,
            nil,
            true
        )
        await Self.waitForAck(requestId: requestId, timeout: 5.0)
        return .result()
    }

    private static func waitForAck(requestId: String, timeout: TimeInterval) async {
        let defaults = UserDefaults(suiteName: "group.com.liftosaur.workout")
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if defaults?.string(forKey: "completeSetAckRequestId") == requestId {
                return
            }
            try? await Task.sleep(nanoseconds: 50_000_000)
        }
    }
}

// Used when recording the timed set would open the AMRAP modal (canCompleteFromLiveActivity == false):
// it can't be done silently in the background, so this opens the app and writes the same record keys the
// app polls — the in-app flow then records and shows the AMRAP modal (mirrors OpenWorkoutIntent).
@available(iOS 16, *)
struct OpenWorkoutRecordSetTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Workout and Record Set Timer"
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Entry Index")
    var entryIndex: Int

    @Parameter(title: "Set Index")
    var setIndex: Int

    @Parameter(title: "Set Timer Since")
    var setTimerSince: Int

    @Parameter(title: "Keep Timing")
    var keepTiming: Bool

    init() {
        self.entryIndex = 0
        self.setIndex = 0
        self.setTimerSince = 0
        self.keepTiming = false
    }

    init(entryIndex: Int, setIndex: Int, setTimerSince: Int, keepTiming: Bool) {
        self.entryIndex = entryIndex
        self.setIndex = setIndex
        self.setTimerSince = setTimerSince
        self.keepTiming = keepTiming
    }

    func perform() async throws -> some IntentResult {
        let elapsedSeconds = max(0, Int((Date().timeIntervalSince1970 * 1000 - Double(setTimerSince)) / 1000.0))
        if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
            sharedDefaults.set(entryIndex, forKey: "recordSetTimerEntryIndex")
            sharedDefaults.set(setIndex, forKey: "recordSetTimerSetIndex")
            sharedDefaults.set(elapsedSeconds, forKey: "recordSetTimerElapsedSeconds")
            sharedDefaults.set(keepTiming, forKey: "recordSetTimerKeepTiming")
            sharedDefaults.synchronize()
        }
        return .result()
    }
}

@available(iOS 16, *)
struct OpenWorkoutIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Workout"
    static var openAppWhenRun: Bool = true

    @Parameter(title: "CompleteSet")
    var completeSet: Bool

    @Parameter(title: "Entry Index")
    var entryIndex: Int
    
    @Parameter(title: "Set Index")
    var setIndex: Int
    
    @Parameter(title: "Rest Timer")
    var restTimer: Int?

    @Parameter(title: "Rest Timer Since")
    var restTimerSince: Int?
    
    @Parameter(title: "State Version")
    var stateVersion: Int
    
    init() {
        self.completeSet = false
        self.entryIndex = 0
        self.setIndex = 0
        self.stateVersion = 0
    }

    init(entryIndex: Int, setIndex: Int, stateVersion: Int, restTimer: Int?, restTimerSince: Int?) {
        self.completeSet = true
        self.entryIndex = entryIndex
        self.setIndex = setIndex
        self.stateVersion = stateVersion
        self.restTimer = restTimer
        self.restTimerSince = restTimerSince
    }

    func perform() async throws -> some IntentResult {
        Logger.liveActivity.debug("OpenWorkoutIntent.perform (completeSet=\(self.completeSet))")
        if completeSet {
            if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
                sharedDefaults.removeObject(forKey: "completeSetRequestId")
                sharedDefaults.set(entryIndex, forKey: "completeSetEntryIndex")
                sharedDefaults.set(setIndex, forKey: "completeSetSetIndex")
                sharedDefaults.set(restTimer, forKey: "completeSetRestTimer")
                sharedDefaults.set(restTimerSince, forKey: "completeSetRestTimerSince")
                sharedDefaults.set(stateVersion, forKey: "completeSetStateVersion")
                sharedDefaults.synchronize()
            }
        }
        return .result()
    }
}
