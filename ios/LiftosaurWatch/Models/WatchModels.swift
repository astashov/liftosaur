//
//  WatchModels.swift
//  LiftosaurWatch Watch App
//

import Foundation
import SwiftUI

struct WatchWorkout: Codable, Equatable {
    let dayName: String
    let programName: String
    let exercises: [WatchExercise]
}

struct WatchExercise: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let imageUrl: String?
    let sets: [WatchSet]
}

struct WatchSet: Codable, SetInfoProvider, Equatable {
    let index: Int
    let reps: Int?
    let minReps: Int?
    let weight: WatchWeight?
    let originalWeight: WatchWeight?
    let isAmrap: Bool?
    let askWeight: Bool?
    let rpe: Double?
    let timer: Int?
    let label: String?
    let isCompleted: Bool?
    let completedReps: Int?
    let completedRepsLeft: Int?
    let completedWeight: WatchWeight?
    let completedRpe: Double?
    let status: String
    let plates: String?
    let isWarmup: Bool
    let isUnilateral: Bool

    var statusColor: Color {
        let baseColor: Color
        switch status {
        case "success":
            baseColor = .green
        case "in-range":
            baseColor = .orange
        case "failed":
            baseColor = .red
        default:
            baseColor = .gray.opacity(0.5)
        }
        return isWarmup ? baseColor.opacity(0.5) : baseColor
    }

    // MARK: - SetInfoProvider

    var repsText: String? {
        SetFormatters.formatReps(reps: reps, minReps: minReps, isAmrap: isAmrap ?? false)
    }

    var weightText: String? {
        guard let weight = weight else { return nil }
        return SetFormatters.formatWeight(value: weight.value, unit: weight.unit)
    }

    var originalWeightText: String? {
        guard let weight = originalWeight else { return nil }
        return SetFormatters.formatWeight(value: weight.value, unit: weight.unit)
    }

    var rpeText: String? {
        guard let rpe = rpe else { return nil }
        return SetFormatters.formatRpe(rpe)
    }

    var timerText: String? {
        guard let timer = timer else { return nil }
        return SetFormatters.formatTimer(timer)
    }
}

struct WatchWeight: Codable, Equatable {
    let value: Double
    let unit: String
}

struct WatchError: Codable {
    let success: Bool
    let error: String
}

struct WatchResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: String?
}

struct WatchHasProgram: Codable {
    let hasProgram: Bool
}

struct WatchHasSubscription: Codable {
    let hasSubscription: Bool
}

struct WatchNextEntryAndSetIndex: Codable {
    let entryIndex: Int
    let setIndex: Int
}

struct WatchValidWeights: Codable {
    let weights: [Double]
    let currentIndex: Int
}

struct WatchUserPromptedStateVar: Codable {
    let name: String
    let value: Double
    let unit: String?
}

struct WatchAmrapModal: Codable, Identifiable {
    var id: String { "\(entryIndex)-\(setIndex)" }
    let entryIndex: Int
    let setIndex: Int
    let isAmrap: Bool
    let logRpe: Bool
    let askWeight: Bool
    let hasUserVars: Bool
    let isUnilateral: Bool
    let initialReps: Int?
    let initialRepsLeft: Int?
    let initialWeight: Double?
    let weightUnit: String
    let initialRpe: Double?
    let validWeights: [Double]?
    let validWeightIndex: Int?
    let userPromptedVars: [WatchUserPromptedStateVar]
}

struct WatchRestTimer: Codable, Equatable {
    let timerSince: Double  // timestamp in milliseconds
    let timer: Int  // total timer duration in seconds
}

struct WatchWorkoutStatus: Codable, Equatable {
    let isPaused: Bool
    let intervals: [[Double?]]  // [[startTime, endTime or null]]
    let startTime: Double  // timestamp in milliseconds
}

struct WatchFinishWorkoutSummary: Codable, Identifiable, Hashable {
    var id: String { "\(dayName)-\(timeMs)" }
    let dayName: String
    let programName: String
    let timeMs: Double
    let volume: WatchWeight
    let totalSets: Int
    let totalReps: Int
    let exercises: [WatchExercise]
    let muscleGroups: [WatchMuscleGroup]
    let personalRecords: WatchPersonalRecords

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: WatchFinishWorkoutSummary, rhs: WatchFinishWorkoutSummary) -> Bool {
        lhs.id == rhs.id
    }
}

struct WatchMuscleGroup: Codable, Identifiable {
    var id: String { name }
    let name: String
    let sets: Double
}

struct WatchPersonalRecords: Codable {
    let maxWeight: [WatchMaxWeightRecord]
    let estimated1RM: [WatchEstimated1RMRecord]
}

struct WatchMaxWeightRecord: Codable, Identifiable {
    var id: String { exerciseName }
    let exerciseName: String
    let weight: WatchWeight
    let reps: Int
}

struct WatchEstimated1RMRecord: Codable, Identifiable {
    var id: String { exerciseName }
    let exerciseName: String
    let value: WatchWeight
    let reps: Int
    let weight: WatchWeight
}

struct WatchFinishWorkoutContinueResult: Codable {
    let sent: Bool
}

struct WatchVolume: Codable {
    let volume: Double
}

struct WatchHealthSettings: Codable {
    let appleHealthSyncWorkout: Bool
    let healthConfirmation: Bool
}
