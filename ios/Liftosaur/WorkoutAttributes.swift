import Foundation
import ActivityKit

enum SetCompletionState: String, Codable, Hashable {
    case incomplete = "not-finished"
    case successful = "success"
    case partial = "in-range"
    case failed = "failed"
}

struct LiveActivitySet: Codable, Hashable {
    var status: SetCompletionState
    var isWarmup: Bool
}

protocol SetInfoProvider {
    var repsText: String? { get }
    var weightText: String? { get }
    var originalWeightText: String? { get }
    var rpeText: String? { get }
    var timerText: String? { get }
}

struct HistoryEntryState: Codable, Hashable, SetInfoProvider {
    var exerciseName: String
    var currentSet: Int
    var totalSets: Int
    var completedSets: [LiveActivitySet]
    var canCompleteFromLiveActivity: Bool
    var isWarmup: Bool
    var entryIndex: Int
    var setIndex: Int

    var exerciseImageUrl: String?
    var targetReps: String?
    var targetWeight: String?
    var targetRPE: String?
    var targetTimer: String?
    var plates: String?
    var currentWeight: String?
    var currentReps: String?

    var repsText: String? { targetReps }
    var weightText: String? { targetWeight }
    var originalWeightText: String? { nil }
    var rpeText: String? { targetRPE }
    var timerText: String? { targetTimer.map { "\($0)s" } }
}

struct LiveActivityRest: Codable, Hashable {
    var restTimerSince: Int
    var restTimer: Int
    var isAuto: Bool
}

struct LiveActivitySetTimer: Codable, Hashable {
    var setTimerSince: Int
    var setTimer: Int
    var isOverflow: Bool
    var isCompleted: Bool
    var entryIndex: Int
    var setIndex: Int
    var restTimer: Int
}

struct WorkoutAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var historyEntryState: HistoryEntryState?
        var workoutStartTimestamp: Int
        var restTimer: LiveActivityRest?
        var setTimer: LiveActivitySetTimer?
        var stateVersion: Int?
    }
}
