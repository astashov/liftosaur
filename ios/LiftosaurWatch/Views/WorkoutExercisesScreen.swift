//
//  WorkoutExercisesScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI
import Combine

struct WorkoutExercisesScreen: View {
    let workout: WatchWorkout
    let isPaused: Bool
    let workoutTime: TimeInterval
    let heartRate: Double?
    let isFinishingWorkout: Bool
    let onFinish: () -> Void
    let onDiscard: () -> Void
    let onExerciseTap: (Int) -> Void
    let onPauseToggle: () -> Void
    let onRefreshTime: () -> Void
    let onRefresh: () async -> Void

    @Environment(\.navbarHeight) private var navbarHeight
    @Environment(\.screenWidth) private var screenWidth
    @State private var tick: Int = 0

    private var timer: Timer.TimerPublisher {
        Timer.publish(every: 1, on: .main, in: .common)
    }

    private func formattedTime(_ seconds: TimeInterval) -> String {
        let totalSeconds = Int(seconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        return String(format: "%02d:%02d", hours, minutes)
    }

    var body: some View {
        let contentTop = navbarHeight + 20  // Extra space for time header under navbar
        let heartRateTop = navbarHeight * 0.65

        ZStack(alignment: .topTrailing) {
            ScrollView {
                VStack(spacing: 8) {
                    // Workout time header
                    Button(action: onPauseToggle) {
                            HStack(spacing: 4) {
                                Text("Total time:")
                                    .font(.system(size: 13))
                                    .foregroundColor(LiftosaurColor.textSecondary)
                                    .fixedSize()

                                Image(systemName: isPaused ? "play.fill" : "pause.fill")
                                    .font(.system(size: 12))
                                    .foregroundColor(isPaused ? LiftosaurColor.textError : LiftosaurColor.textSuccess)
                                    .frame(width: 16, height: 16)

                                Text("\(formattedTime(workoutTime))h")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(isPaused ? LiftosaurColor.textError : LiftosaurColor.textSuccess)
                                    .fixedSize()

                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 4)
                        .onReceive(timer.autoconnect()) { _ in
                            if !isPaused {
                                tick += 1
                                onRefreshTime()
                            }
                        }

                        ForEach(Array(workout.exercises.enumerated()), id: \.offset) { index, exercise in
                            Button(action: { onExerciseTap(index) }) {
                                ExerciseCardView(exercise: exercise)
                            }
                            .buttonStyle(.plain)
                        }

                        // Finish button
                        Button(action: onFinish) {
                            if isFinishingWorkout {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: LiftosaurColor.buttonPrimaryLabel))
                                    .frame(maxWidth: .infinity)
                            } else {
                                Text("Finish")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(LiftosaurColor.buttonPrimaryBackground)
                        .padding(.top, 8)
                        .disabled(isFinishingWorkout)

                        // Discard button
                        Button(action: onDiscard) {
                            HStack(spacing: 4) {
                                Image(systemName: "trash")
                                    .font(.caption)
                                Text("Discard")
                                    .font(.caption)
                            }
                            .foregroundColor(LiftosaurColor.textSecondary)
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                    .padding(.horizontal, 0)
                    .padding(.top, contentTop)
                    .padding(.bottom, 8)
                }

                // Heart rate overlay under clock
            HeartRateView(heartRate: heartRate, fontSize: 12)
                .padding(.top, heartRateTop)
                .padding(.trailing, screenWidth * 0.07)
        }
        .ignoresSafeArea(edges: .top)
    }
}

struct ExerciseCardView: View {
    let exercise: WatchExercise

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            ExerciseImageView(
                imageUrl: exercise.imageUrl,
                exerciseName: exercise.name,
                baseUrl: baseImageUrl.absoluteString,
                size: 40
            )

            VStack(alignment: .leading, spacing: 4) {
                // Exercise name
                Text(exercise.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                // Completion dots
                FlowLayout(spacing: 2, maxLines: 2) {
                    ForEach(exercise.sets.indices, id: \.self) { index in
                        let set = exercise.sets[index]
                        Circle()
                            .fill(set.statusColor)
                            .frame(width: 8, height: 8)
                    }
                    Text("...")
                        .font(.system(size: 8))
                        .foregroundColor(.gray)
                }

                // Sets summary with colors
                ForEach(groupedSets(), id: \.id) { group in
                    ColoredSetInfoView(count: group.count, setInfo: group.representative, useOriginalWeight: true)
                        .font(.system(size: 12))
                }
            }

            Spacer(minLength: 0)
        }
        .padding(8)
        .background(LiftosaurColor.backgroundCard)
        .cornerRadius(12)
        .clipped()
    }

    private func groupedSets() -> [SetGroup] {
        guard !exercise.sets.isEmpty else { return [] }

        var result: [SetGroup] = []
        var currentGroup: [WatchSet] = []

        for set in exercise.sets {
            if let last = currentGroup.last,
               last.reps == set.reps,
               last.minReps == set.minReps,
               last.weight?.value == set.weight?.value,
               last.weight?.unit == set.weight?.unit,
               last.isAmrap == set.isAmrap,
               last.rpe == set.rpe,
               last.timer == set.timer {
                currentGroup.append(set)
            } else {
                if !currentGroup.isEmpty, let first = currentGroup.first {
                    result.append(SetGroup(count: currentGroup.count, representative: first))
                }
                currentGroup = [set]
            }
        }

        if !currentGroup.isEmpty, let first = currentGroup.first {
            result.append(SetGroup(count: currentGroup.count, representative: first))
        }

        return result
    }
}

struct SetGroup: Identifiable {
    let id = UUID()
    let count: Int
    let representative: WatchSet
}

#Preview {
    WorkoutExercisesScreen(
        workout: WatchWorkout(
            dayName: "Week 1 - Workout A",
            programName: "Basic Beginner Routine",
            exercises: [
                WatchExercise(id: "benchPress_barbell", name: "Bench Press", imageUrl: "/externalimages/exercises/single/small/benchpress_barbell_single_small.png", sets: [
                    WatchSet(index: 0, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: WatchWeight(value: 42.5, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: true, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "success", plates: "45", isWarmup: false, isUnilateral: false),
                    WatchSet(index: 1, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: WatchWeight(value: 42.5, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: true, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "in-range", plates: "45", isWarmup: false, isUnilateral: false),
                    WatchSet(index: 2, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: WatchWeight(value: 42.5, unit: "lb"), isAmrap: true, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "not-finished", plates: "45", isWarmup: false, isUnilateral: false)
                ]),
                WatchExercise(id: "overheadSquat_barbell", name: "Overhead Squat", imageUrl: "/externalimages/exercises/single/small/overheadsquat_barbell_single_small.png", sets: [
                    WatchSet(index: 0, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: WatchWeight(value: 77.5, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: true, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "failed", plates: nil, isWarmup: false, isUnilateral: false),
                    WatchSet(index: 1, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: WatchWeight(value: 77.5, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false),
                    WatchSet(index: 2, reps: 5, minReps: nil, weight: WatchWeight(value: 45, unit: "lb"), originalWeight: WatchWeight(value: 77.5, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
                ])
            ]
        ),
        isPaused: false,
        workoutTime: 2745,  // 45 minutes 45 seconds
        heartRate: 90.0,
        isFinishingWorkout: false,
        onFinish: {},
        onDiscard: {},
        onExerciseTap: { _ in },
        onPauseToggle: {},
        onRefreshTime: {},
        onRefresh: {}
    )
}
