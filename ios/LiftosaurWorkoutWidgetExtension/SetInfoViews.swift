//
//  SetInfoViews.swift
//  Shared views for displaying set information with colors
//  Used by both LiftosaurWatch and LiftosaurWorkoutWidget
//

import SwiftUI

// MARK: - Colors

struct SetColors {
    static let reps = Color.orange
    static let weight = Color.green
    static let rpe = Color(red: 0, green: 0.75, blue: 0.85)  // cyan equivalent for iOS 14+
    static let timer = Color.purple
}

// MARK: - Formatting Helpers

struct SetFormatters {
    static func formatReps(reps: Int?, minReps: Int? = nil, isAmrap: Bool = false) -> String? {
        if let minReps = minReps, let reps = reps {
            return "\(minReps)-\(reps)"
        } else if let reps = reps {
            return isAmrap ? "\(reps)+" : "\(reps)"
        }
        return nil
    }

    static func formatNumber(_ val: Double) -> String {
        if val == floor(val) {
            return "\(Int(val))"
        } else if (val * 10) == floor(val * 10) {
            return String(format: "%.1f", val)
        } else {
            return String(format: "%.2f", val)
        }
    }

    static func formatWeight(value: Double, unit: String) -> String {
        return "\(formatNumber(value))\(unit)"
    }

    static func formatRpe(_ rpe: Double) -> String {
        return formatNumber(rpe)
    }

    static func formatTimer(_ timer: Int) -> String {
        return "\(timer)s"
    }
}

// MARK: - Colored Set Info View

@available(iOS 16.0, watchOS 9.0, *)
struct ColoredSetInfoView: View {
    let count: Int
    let setInfo: SetInfoProvider
    var useOriginalWeight: Bool = false

    var body: some View {
        FlowLayout(spacing: 0) {
            // Count × Reps (grouped together)
            HStack(spacing: 0) {
                Text("\(count)")
                    .foregroundColor(.secondary)
                Text(" \u{00D7} ")
                    .foregroundColor(.secondary)
                if let reps = setInfo.repsText {
                    Text(reps)
                        .foregroundColor(SetColors.reps)
                }
            }

            // Weight
            if let weight = useOriginalWeight ? setInfo.originalWeightText : setInfo.weightText {
                HStack(spacing: 0) {
                    Text(" \u{00D7} ")
                        .foregroundColor(.secondary)
                    Text(weight)
                        .foregroundColor(SetColors.weight)
                }
            }

            // RPE
            if let rpe = setInfo.rpeText {
                Text(" @\(rpe)")
                    .foregroundColor(SetColors.rpe)
            }

            // Timer
            if let timer = setInfo.timerText {
                Text(" \(timer)")
                    .foregroundColor(SetColors.timer)
            }
        }
    }
}

// MARK: - Target Info View (for single set display)

struct ColoredTargetInfoView: View {
    let setInfo: SetInfoProvider
    var isWarmup: Bool = false
    var useOriginalWeight: Bool = false
    var showPrefix: Bool = true
    var setCountText: String? = nil

    var body: some View {
        HStack(spacing: 0) {
            if let setCountText {
                Text("\(setCountText): ")
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            } else if showPrefix {
                Text(isWarmup ? "Warmup: " : "Target: ")
                    .foregroundColor(.secondary)
            }

            if let reps = setInfo.repsText {
                Text(reps)
                    .foregroundColor(SetColors.reps)
                Text(" \u{00D7} ")
                    .foregroundColor(.secondary)
            }

            if let weight = useOriginalWeight ? setInfo.originalWeightText : setInfo.weightText {
                Text(weight)
                    .foregroundColor(SetColors.weight)
            }

            if let rpe = setInfo.rpeText {
                Text(" @\(rpe)")
                    .foregroundColor(SetColors.rpe)
            }

            if let timer = setInfo.timerText {
                Text(" \(timer)")
                    .foregroundColor(SetColors.timer)
            }
        }
    }
}
