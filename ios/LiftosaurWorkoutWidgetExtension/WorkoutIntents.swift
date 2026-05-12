import AppIntents
import Foundation
import ActivityKit
import OSLog

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
                    restTimer: newRestTimer
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

        if let sharedDefaults = UserDefaults(suiteName: "group.com.liftosaur.workout") {
            sharedDefaults.set(self.entryIndex, forKey: "completeSetEntryIndex")
            sharedDefaults.set(self.setIndex, forKey: "completeSetSetIndex")
            sharedDefaults.set(self.restTimer, forKey: "completeSetRestTimer")
            sharedDefaults.set(self.restTimerSince, forKey: "completeSetRestTimerSince")
            sharedDefaults.set(self.stateVersion, forKey: "completeSetStateVersion")
            Logger.liveActivity.debug("Syncing complete set (\(self.entryIndex)/\(self.setIndex), version: \(self.stateVersion))")
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
