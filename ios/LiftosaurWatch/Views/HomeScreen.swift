//
//  HomeScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct HomeScreen: View {
    let dayName: String
    let programName: String
    let exercises: [WatchExercise]
    let isOngoing: Bool
    let isStartingWorkout: Bool
    let heartRate: Double?
    let isSyncing: Bool
    let storageDate: Date?
    let onStart: () async -> Void
    let onRefresh: () async -> Void

    @Environment(\.navbarHeight) private var navbarHeight
    @Environment(\.screenWidth) private var screenWidth

    private func formatRelativeDate(_ date: Date) -> String {
        let now = Date()
        let interval = now.timeIntervalSince(date)

        if interval < 60 {
            return "just now"
        } else if interval < 3600 {
            let minutes = Int(interval / 60)
            return "\(minutes)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    var body: some View {
        let contentTop = navbarHeight + 8  // Start content just below navbar
        let heartRateTop = navbarHeight * 0.65

        ZStack(alignment: .topTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    Text(isOngoing ? "Ongoing Workout" : "New Workout")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(LiftosaurColor.textPrimary)

                        Button {
                            Task { @MainActor in await onStart() }
                        } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                Text(dayName)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(LiftosaurColor.textPrimary)

                                Text(programName)
                                    .font(.system(size: 13))
                                    .foregroundColor(LiftosaurColor.textSecondary)

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 6) {
                                        ForEach(exercises) { exercise in
                                            ExerciseImageView(
                                                imageUrl: exercise.imageUrl,
                                                exerciseName: exercise.name,
                                                baseUrl: baseImageUrl.absoluteString
                                            )
                                        }
                                    }
                                }

                                Group {
                                    if isStartingWorkout {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                    } else {
                                        Text(isOngoing ? "Continue" : "Start")
                                            .font(.headline)
                                            .fontWeight(.semibold)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 20)
                                .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                                .padding(.vertical, 8)
                                .background(LiftosaurColor.buttonPrimaryBackground)
                                .clipShape(Capsule())
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(LiftosaurColor.backgroundCard)
                            .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                        .disabled(isStartingWorkout)

                        // Sync button
                        Button {
                            Task { @MainActor in await onRefresh() }
                        } label: {
                            VStack(spacing: 2) {
                                HStack(spacing: 4) {
                                    if isSyncing {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                            .frame(width: 14, height: 14)
                                    } else {
                                        Image(systemName: "arrow.triangle.2.circlepath")
                                            .font(.caption)
                                    }
                                    Text("Sync")
                                        .font(.caption)
                                }
                                if let date = storageDate {
                                    Text("Last change \(formatRelativeDate(date))")
                                        .font(.system(size: 10))
                                        .foregroundColor(LiftosaurColor.textSecondary.opacity(0.7))
                                }
                            }
                            .foregroundColor(LiftosaurColor.textSecondary)
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.plain)
                        .padding(.top, 4)
                    }
                    .padding(.top, contentTop)
                }

                // Heart rate overlay under clock (only when workout is ongoing)
            // Heart rate overlay under clock (only when workout is ongoing)
            if isOngoing {
                HeartRateView(heartRate: heartRate, fontSize: 12)
                    .padding(.top, heartRateTop)
                    .padding(.trailing, screenWidth * 0.07)
            }
        }
        .ignoresSafeArea(edges: .top)
    }
}

#Preview {
    HomeScreen(
        dayName: "Week 1 - Workout A",
        programName: "Basic Beginner Routine",
        exercises: [
            WatchExercise(id: "benchPress_barbell", name: "Bench Press", imageUrl: "/externalimages/exercises/single/small/benchpress_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: WatchWeight(value: 135, unit: "lb"), originalWeight: WatchWeight(value: 135, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ]),
            WatchExercise(id: "squat_barbell", name: "Squat", imageUrl: "/externalimages/exercises/single/small/squat_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: WatchWeight(value: 185, unit: "lb"), originalWeight: WatchWeight(value: 185, unit: "lb"), isAmrap: false, askWeight: nil, rpe: nil, timer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ])
        ],
        isOngoing: false,
        isStartingWorkout: false,
        heartRate: nil,
        isSyncing: false,
        storageDate: Date().addingTimeInterval(-3600),
        onStart: { },
        onRefresh: { }
    )
}
