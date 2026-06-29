//
//  FinishWorkoutScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct FinishWorkoutScreen: View {
    let summary: WatchFinishWorkoutSummary
    let onClose: () -> Void

    private var formattedTime: String {
        let totalSeconds = Int(summary.timeMs / 1000)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                // Header
                VStack(alignment: .leading, spacing: 2) {
                    Text(summary.dayName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LiftosaurColor.textPrimary)
                    Text(summary.programName)
                        .font(.system(size: 12))
                        .foregroundColor(LiftosaurColor.textSecondary)
                }


                // Stats
                VStack(alignment: .leading, spacing: 4) {
                    StatBlock(emoji: "🕐", label: "TIME", value: formattedTime)
                    StatBlock(emoji: "🏋️", label: "VOLUME", value: formatWeight(summary.volume))
                    StatBlock(emoji: "💪", label: "SETS", value: "\(summary.totalSets)")
                    StatBlock(emoji: "🔄", label: "REPS", value: "\(summary.totalReps)")
                }

                // Exercises
                if !summary.exercises.isEmpty {
                    SectionHeader(title: "EXERCISES")
                    ForEach(summary.exercises) { exercise in
                        ExerciseCardView(exercise: exercise)
                    }
                }

                // Muscle Groups
                if !summary.muscleGroups.isEmpty {
                    SectionHeader(title: "SETS PER MUSCLE GROUP")
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(summary.muscleGroups) { mg in
                            HStack {
                                Text(mg.name)
                                    .font(.system(size: 12))
                                    .foregroundColor(LiftosaurColor.textSecondary)
                                Spacer()
                                Text(formatSets(mg.sets))
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(LiftosaurColor.textPrimary)
                            }
                        }
                    }
                    .padding(8)
                    .background(LiftosaurColor.backgroundCard)
                    .cornerRadius(12)
                }

                // Personal Records
                if !summary.personalRecords.maxWeight.isEmpty || !summary.personalRecords.estimated1RM.isEmpty {
                    SectionHeader(title: "PERSONAL RECORDS", icon: "trophy.fill", iconColor: .yellow)

                    if !summary.personalRecords.maxWeight.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Max Weight")
                                .font(.system(size: 11))
                                .foregroundColor(LiftosaurColor.textSecondary)
                            ForEach(summary.personalRecords.maxWeight) { pr in
                                HStack(alignment: .top, spacing: 4) {
                                    Text(pr.exerciseName + ":")
                                        .font(.system(size: 12))
                                        .foregroundColor(LiftosaurColor.textPrimary)
                                    Text(formatWeight(pr.weight))
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(LiftosaurColor.textSuccess)
                                    Text(", \(pr.reps) reps")
                                        .font(.system(size: 12))
                                        .foregroundColor(LiftosaurColor.textSecondary)
                                }
                            }
                        }
                        .padding(8)
                        .background(LiftosaurColor.backgroundCard)
                        .cornerRadius(12)
                    }

                    if !summary.personalRecords.estimated1RM.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Estimated One Rep Max")
                                .font(.system(size: 11))
                                .foregroundColor(LiftosaurColor.textSecondary)
                            ForEach(summary.personalRecords.estimated1RM) { pr in
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack(alignment: .top, spacing: 4) {
                                        Text(pr.exerciseName + ":")
                                            .font(.system(size: 12))
                                            .foregroundColor(LiftosaurColor.textPrimary)
                                        Text(formatWeight(pr.value))
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(LiftosaurColor.textSuccess)
                                    }
                                    Text("(\(pr.reps) × \(formatWeight(pr.weight)))")
                                        .font(.system(size: 10))
                                        .foregroundColor(LiftosaurColor.textSecondary)
                                }
                            }
                        }
                        .padding(8)
                        .background(LiftosaurColor.backgroundCard)
                        .cornerRadius(12)
                    }
                }

                // Done button
                Button(action: onClose) {
                    Text("Done")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                }
                .buttonStyle(.borderedProminent)
                .tint(LiftosaurColor.buttonPrimaryBackground)
                .padding(.top, 8)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(LiftosaurColor.textSecondary)
                }
                .buttonStyle(.plain)
            }
        }
        .navigationTitle("Summary")
        .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func formatWeight(_ weight: WatchWeight) -> String {
        "\(SetFormatters.formatNumber(weight.value)) \(weight.unit)"
    }

    private func formatSets(_ sets: Double) -> String {
        SetFormatters.formatNumber(sets)
    }
}

struct StatBlock: View {
    let emoji: String
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 4) {
                Text(emoji)
                    .font(.system(size: 11))
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(LiftosaurColor.textSecondary)
            }
            Text(value)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(LiftosaurColor.textPrimary)
        }
    }
}

struct SectionHeader: View {
    let title: String
    var icon: String? = nil
    var iconColor: Color = LiftosaurColor.textSecondary

    var body: some View {
        HStack(spacing: 4) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundColor(iconColor)
            }
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(LiftosaurColor.textSecondary)
        }
        .padding(.top, 4)
    }
}

#Preview {
    FinishWorkoutScreen(
        summary: WatchFinishWorkoutSummary(
            dayName: "Week 1 - Workout A",
            programName: "Basic Beginner Routine",
            timeMs: 2814000,
            volume: WatchWeight(value: 2336, unit: "lb"),
            totalSets: 9,
            totalReps: 46,
            exercises: [
                WatchExercise(
                    id: "benchPress_barbell",
                    name: "Bench Press",
                    imageUrl: nil,
                    sets: [
                        WatchSet(index: 0, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: nil, isAmrap: nil, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: true, completedReps: 5, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "success", plates: nil, isWarmup: false, isUnilateral: false),
                        WatchSet(index: 1, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: nil, isAmrap: nil, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: true, completedReps: 5, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "success", plates: nil, isWarmup: false, isUnilateral: false),
                        WatchSet(index: 2, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: nil, isAmrap: true, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: true, completedReps: 8, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "success", plates: nil, isWarmup: false, isUnilateral: false)
                    ]
                )
            ],
            muscleGroups: [
                WatchMuscleGroup(name: "Back", sets: 4.5),
                WatchMuscleGroup(name: "Glutes", sets: 3),
                WatchMuscleGroup(name: "Chest", sets: 3)
            ],
            personalRecords: WatchPersonalRecords(
                maxWeight: [
                    WatchMaxWeightRecord(exerciseName: "Bench Press", weight: WatchWeight(value: 95, unit: "lb"), reps: 5)
                ],
                estimated1RM: [
                    WatchEstimated1RMRecord(exerciseName: "Bench Press", value: WatchWeight(value: 109.8, unit: "lb"), reps: 5, weight: WatchWeight(value: 95, unit: "lb"))
                ]
            )
        ),
        onClose: {}
    )
}
