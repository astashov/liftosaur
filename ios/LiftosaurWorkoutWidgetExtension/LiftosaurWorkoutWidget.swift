import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents
import OSLog

struct LiftosaurWorkoutWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutAttributes.self) { context in
            if #available(iOS 26, *) {
                LockScreenLiveActivityView(context: context)
            } else {
                LockScreenLiveActivityView(context: context)
                    .activityBackgroundTint(.black.opacity(0.75))
                    .environment(\.colorScheme, .dark)
            }
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading, priority: 2.0) {
                    if let entry = context.state.historyEntryState {
                        HStack(alignment: .top, spacing: 16) {
                            if let exerciseImageUrl = entry.exerciseImageUrl {
                                DynamicIslandExerciseImage(urlString: exerciseImageUrl, size: 40)
                            } else {
                                Image(systemName: "figure.strengthtraining.traditional")
                                    .font(.title3)
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.exerciseName)
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .lineLimit(2)

                                HStack(spacing: 0) {
                                    Text("Set: ")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text("\(entry.currentSet)/\(entry.totalSets)")
                                        .font(.caption)
                                        .foregroundColor(.primary)
                                }

                                LiveActivityTargetInfo(entry: entry)
                                    .font(.caption)

                                if let plates = entry.plates {
                                    HStack(spacing: 2) {
                                        Text("Plates: ")
                                            .foregroundColor(.secondary)
                                        Text(plates)
                                            .foregroundColor(.primary)
                                    }
                                    .font(.caption)
                                }
                            }
                        }
                        .dynamicIsland(verticalPlacement: .belowIfTooWide)
                    }
                }

                DynamicIslandExpandedRegion(.trailing, priority: 1.0) {
                    if let restTimer = context.state.restTimer {
                        DynamicIslandRestTimer(restTimer: restTimer)
                    }
                }
            } compactLeading: {
                if let entry = context.state.historyEntryState,
                   let exerciseImageUrl = entry.exerciseImageUrl {
                    DynamicIslandExerciseImage(urlString: exerciseImageUrl, size: 24)
                } else {
                    Image(systemName: "figure.strengthtraining.traditional")
                }
            } compactTrailing: {
                if let restTimer = context.state.restTimer {
                    DynamicIslandCompactTimer(
                        restTime: restTimer.restTimerSince,
                        restTimer: restTimer.restTimer
                    )
                }
            } minimal: {
                if let restTimer = context.state.restTimer {
                    let isOvertime: Bool = {
                        let elapsed = Int(Date().timeIntervalSince1970) - (restTimer.restTimerSince / 1000)
                        return elapsed > restTimer.restTimer
                    }()

                    Text(timerInterval: Date(timeIntervalSince1970: TimeInterval(restTimer.restTimerSince) / 1000)...Date.distantFuture, countsDown: false)
                        .font(.system(size: 10))
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .foregroundColor(isOvertime ? .red : .primary)
                } else {
                    Image(systemName: "figure.strengthtraining.traditional")
                }
            }
        }
    }
}

struct DynamicIslandExerciseImage: View {
    let urlString: String
    let size: CGFloat

    var body: some View {
        ZStack {
            // Background circle with app's purple tint
            Circle()
                .fill(Color(red: 0xEE/255, green: 0xE8/255, blue: 0xFF/255))

            // Image content
            if let imageData = loadImageFromCache(),
               let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .clipShape(Circle())
            } else {
                // Fallback placeholder when image is not cached
                Image(systemName: "figure.strengthtraining.traditional")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .foregroundColor(Color(red: 0x5A/255, green: 0x4A/255, blue: 0x9E/255))
                    .padding(size * 0.2)
            }
        }
        .frame(width: size, height: size)
    }

    private func loadImageFromCache() -> Data? {
        guard let sharedContainer = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.liftosaur.workout"
        ) else {
            return nil
        }

        let imageCacheDirectory = sharedContainer.appendingPathComponent("imageCache")

        // Convert URL to filename (same logic as CacheManager)
        let filename = urlString
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")

        let cacheFile = imageCacheDirectory.appendingPathComponent(filename)
        return try? Data(contentsOf: cacheFile)
    }
}

struct DynamicIslandRestTimer: View {
    let restTimer: LiveActivityRest

    var body: some View {
        let isOvertime: Bool = {
            let elapsed = Int(Date().timeIntervalSince1970) - (restTimer.restTimerSince / 1000)
            return elapsed > restTimer.restTimer
        }()

        VStack(alignment: .center, spacing: -2.0) {
            Text("00:00")
                .hidden()
                .font(.title2)
                .fontWeight(.bold)
                .monospacedDigit()
                .overlay(alignment: .center) {
                    Spacer()
                    Text(timerInterval: Date(timeIntervalSince1970: TimeInterval(restTimer.restTimerSince) / 1000)...Date.distantFuture, countsDown: false)
                        .font(.title2)
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .multilineTextAlignment(.center)
                        .frame(width: 80, alignment: .center)
                        .foregroundColor(isOvertime ? .red : .primary)
                    Spacer()
                }

            let minutes = restTimer.restTimer / 60
            let seconds = restTimer.restTimer % 60
            Text("\(String(format: "%d:%02d", minutes, seconds))")
                .font(.subheadline)
                .monospacedDigit()
                .foregroundColor(.secondary)
        }
        .frame(
            maxWidth: .infinity,
            maxHeight: .infinity,
            alignment: .center
        )
    }
}

struct DynamicIslandCompactTimer: View {
    let restTime: Int
    let restTimer: Int

    var body: some View {
        let isOvertime: Bool = {
            let elapsed = Int(Date().timeIntervalSince1970) - (restTime / 1000)
            return elapsed > restTimer
        }()

        Text(timerInterval: Date(timeIntervalSince1970: TimeInterval(restTime) / 1000)...Date.distantFuture, countsDown: false)
            .font(.caption2)
            .fontWeight(.bold)
            .monospacedDigit()
            .foregroundColor(isOvertime ? .red : .primary)
            .multilineTextAlignment(.trailing)
            .frame(width: 45, alignment: .trailing)
            .padding(.trailing, 4.0)
    }
}

struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<WorkoutAttributes>

    var body: some View {
        ActiveWorkoutView(
            entry: context.state.historyEntryState,
            restTimer: context.state.restTimer,
            workoutStartTimestamp: context.state.workoutStartTimestamp,
            stateVersion: context.state.stateVersion ?? 0
        )
    }
}
