//
//  WorkoutCardView.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct WorkoutCardView: View {
    let dayName: String
    let programName: String
    let exercises: [WatchExercise]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
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
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LiftosaurColor.backgroundCard)
        .cornerRadius(12)
    }
}

struct ExerciseImageView: View {
    let imageUrl: String?
    let exerciseName: String
    let baseUrl: String
    var size: CGFloat = 36

    @State private var cachedImage: Image?
    @State private var isLoading = false
    @State private var loadFailed = false

    private var imageSize: CGFloat { size }
    private let imageCache = ImageCacheManager.shared

    var body: some View {
        Group {
            if let image = cachedImage {
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: imageSize, height: imageSize)
                    .background(Color.white)
                    .cornerRadius(6)
            } else {
                textFallbackView
            }
        }
        .onAppear {
            loadImageIfNeeded()
        }
    }

    private func loadImageIfNeeded() {
        guard let relativePath = imageUrl, !loadFailed, cachedImage == nil else { return }

        // Try loading from disk cache first
        if let cached = imageCache.loadImage(for: relativePath) {
            cachedImage = cached
            return
        }

        // Fetch from network if not cached
        guard !isLoading, let baseUrlObj = URL(string: baseUrl) else { return }
        isLoading = true

        Task {
            let image = await imageCache.fetchAndCacheImage(relativePath: relativePath, baseUrl: baseUrlObj)
            await MainActor.run {
                isLoading = false
                if let image = image {
                    cachedImage = image
                } else {
                    loadFailed = true
                }
            }
        }
    }

    private var textFallbackView: some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(Color.white.opacity(0.9))
            .frame(width: imageSize, height: imageSize)
            .overlay(
                Text(exerciseInitials)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(LiftosaurColor.backgroundCard)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
            )
    }

    private var exerciseInitials: String {
        let words = exerciseName.split(separator: " ")
        if words.count >= 2 {
            let first = words[0].prefix(1)
            let second = words[1].prefix(1)
            return "\(first)\(second)".uppercased()
        } else if let first = words.first {
            return String(first.prefix(2)).uppercased()
        }
        return "?"
    }
}

#Preview {
    WorkoutCardView(
        dayName: "Week 1 - Workout A",
        programName: "Basic Beginner Routine",
        exercises: [
            WatchExercise(id: "benchPress_barbell", name: "Bench Press", imageUrl: "/externalimages/exercises/single/small/benchpress_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: false, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false),
                WatchSet(index: 1, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: false, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false),
                WatchSet(index: 2, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: true, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ]),
            WatchExercise(id: "squat_barbell", name: "Squat", imageUrl: "/externalimages/exercises/single/small/squat_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: false, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ]),
            WatchExercise(id: "bentOverRow_barbell", name: "Bent Over Row", imageUrl: "/externalimages/exercises/single/small/bentoverrow_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: false, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ]),
            WatchExercise(id: "overheadPress_barbell", name: "Overhead Press", imageUrl: "/externalimages/exercises/single/small/overheadpress_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: false, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ]),
            WatchExercise(id: "deadlift_barbell", name: "Deadlift", imageUrl: "/externalimages/exercises/single/small/deadlift_barbell_single_small.png", sets: [
                WatchSet(index: 0, reps: 5, minReps: nil, weight: nil, originalWeight: nil, isAmrap: false, askWeight: nil, rpe: nil, timer: nil, setTimer: nil, label: nil, isCompleted: false, completedReps: nil, completedRepsLeft: nil, completedWeight: nil, completedRpe: nil, completedSetTimer: nil, status: "not-finished", plates: nil, isWarmup: false, isUnilateral: false)
            ])
        ]
    )
    .padding()
}
