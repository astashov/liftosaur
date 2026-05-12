import SwiftUI

#if WIDGET_EXTENSION
import AppIntents
import WidgetKit
#endif

// MARK: - Cached Image View

@available(iOS 16.1, *)
struct CachedImage: View {
    let urlString: String
    let height: CGFloat

    var body: some View {
        ZStack {
            // Background container with rounded corners
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(red: 0xEE/255, green: 0xE8/255, blue: 0xFF/255))

            // Image content
            if let imageData = loadImageFromCache(),
               let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                // Fallback placeholder when image is not cached
                Image(systemName: "figure.strengthtraining.traditional")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .foregroundColor(Color(red: 0x5A/255, green: 0x4A/255, blue: 0x9E/255))
                    .padding(8)
            }
        }
        .frame(width: height, height: height)
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

@available(iOS 16.1, *)
struct ActiveWorkoutView: View {
    let entry: HistoryEntryState?
    let restTimer: LiveActivityRest?
    let workoutStartTimestamp: Int
    let stateVersion: Int

    var body: some View {
        VStack(spacing: 4) {
            TopBarView(
                entry: entry,
                restTimer: restTimer,
                workoutStartTimestamp: workoutStartTimestamp,
            )

            if let entry {
                ExerciseInfo(entry: entry, restTimer: restTimer, stateVersion: stateVersion)
            } else {
                VStack(alignment: .center) {
                    Text("All exercises completed!")
                        .font(.custom("Poppins-Regular", size: 20))
                        .padding(.vertical, 32.0)
                        .padding(.horizontal, 16.0)
                }
            }
        }
        .padding(.horizontal, 16.0)
        .padding(.top, 8.0)
        .padding(.bottom, 12.0)
    }
}

@available(iOS 16.1, *)
struct TopBarView: View {
    let entry: HistoryEntryState?
    let restTimer: LiveActivityRest?
    let workoutStartTimestamp: Int

    var body: some View {
        HStack(spacing: 8.0) {
            HStack(spacing: 8.0) {
                Image("AppIcon2")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 32, height: 32)
                    .cornerRadius(8.0)
                
                
                VStack(alignment: .leading, spacing: 4.0) {
                    HStack(spacing: 0.0) {
                        Text(formatWorkoutTime(workoutStartTimestamp))
                            .font(.custom("Poppins-SemiBold", size: 14))
                        if let entry {
                            Text(", Set: ").foregroundColor(.secondary)
                            Text("\(entry.currentSet)")
                                .font(.custom("Poppins-SemiBold", size: 14))
                            Text("/")
                            Text("\(entry.totalSets)")
                                .font(.custom("Poppins-SemiBold", size: 14))
                        }
                    }
                    if let entry {
                        HStack(spacing: 2.0) {
                            ForEach(0..<entry.totalSets, id: \.self) { index in
                                Circle()
                                    .fill(colorForSetState(index: index, completedSets: entry.completedSets))
                                    .frame(width: 8, height: 8)
                            }
                        }
                    }
                }
            }
            .layoutPriority(1)

            Spacer()

            if let restTimer, let entryIndex = entry?.entryIndex, let setIndex = entry?.setIndex {
                RestTimerControls(restTimer: restTimer, entryIndex: entryIndex, setIndex: setIndex)
            }
        }
        .font(.custom("Poppins-Regular", size: 13))
    }

    func colorForSetState(index: Int, completedSets: [LiveActivitySet]) -> Color {
        guard index < completedSets.count else {
            return Color.primary.opacity(0.25)
        }

        var color: Color
        switch completedSets[index].status {
            case .incomplete:
                color = Color.secondary
            case .successful:
                color = Color.green
            case .partial:
                color = Color.orange
            case .failed:
                color = Color.red
        }
        if completedSets[index].isWarmup {
            color = color.opacity(0.5)
        }
        return color
    }
}

@available(iOS 16.1, *)
struct RestTimerButtonStyle: ButtonStyle {
    let text: String

    func makeBody(configuration: Configuration) -> some View {
        RestTimerButton(text: text, isPressed: configuration.isPressed)
    }
}

@available(iOS 16.1, *)
struct RestTimerControls: View {
    let restTimer: LiveActivityRest
    let entryIndex: Int
    let setIndex: Int

    var body: some View {
        HStack(spacing: 4.0) {
            #if WIDGET_EXTENSION
            Button(intent: AdjustRestTimerIntent(action: "increase", entryIndex: entryIndex, setIndex: setIndex, restTimer: restTimer.restTimer, restTimerSince: restTimer.restTimerSince)) {
                EmptyView()
            }
            .buttonStyle(RestTimerButtonStyle(text: "+15s"))
            #else
            Button(action: {}) {
                RestTimerButton(text: "+15s", isPressed: false)
            }
            .buttonStyle(.plain)
            #endif

            VStack(spacing: -4.0) {
                let isOvertime: Bool = {
                    let elapsed = Int(Date().timeIntervalSince1970) - (restTimer.restTimerSince / 1000)
                    return elapsed > restTimer.restTimer
                }()

                Text(timerInterval: Date(timeIntervalSince1970: TimeInterval(restTimer.restTimerSince) / 1000)...Date.distantFuture, countsDown: false)
                    .font(.custom("Poppins-Bold", size: 18))
                    .foregroundColor(isOvertime ? .red : .primary)
                    .monospacedDigit()
                    .lineLimit(1)
                    .multilineTextAlignment(.center)
                    .frame(width: 70, alignment: .center)
                
                let minutes = restTimer.restTimer / 60
                let seconds = restTimer.restTimer % 60
                Text("\(String(format: "%d:%02d", minutes, seconds))")
                    .font(.custom("Poppins-Regular", size: 13))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                    .frame(width: 70, alignment: .center)
            }

            #if WIDGET_EXTENSION
            Button(intent: AdjustRestTimerIntent(action: "decrease", entryIndex: entryIndex, setIndex: setIndex, restTimer: restTimer.restTimer, restTimerSince: restTimer.restTimerSince)) {
                EmptyView()
            }
            .buttonStyle(RestTimerButtonStyle(text: "-15s"))
            #else
            Button(action: {}) {
                RestTimerButton(text: "-15s", isPressed: false)
            }
            .buttonStyle(.plain)
            #endif
        }
    }

    private func formatTimeFromMs(_ milliseconds: Int) -> String {
        let seconds = milliseconds / 1000
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        return String(format: "%d:%02d", minutes, remainingSeconds)
    }
}

@available(iOS 16.1, *)
struct RestTimerButton: View {
    let text: String
    let isPressed: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(isPressed ? Color.white.opacity(0.4) : Color.white.opacity(0.25))
                .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 3)

            Text(text)
                .font(.custom("Poppins-Regular", size: 12))
                .foregroundColor(.white)
        }
        .frame(width: 32, height: 32)
        .scaleEffect(isPressed ? 0.9 : 1.0)
    }
}

@available(iOS 16.1, *)
struct LiveActivityTargetInfo: View {
    let entry: HistoryEntryState

    var body: some View {
        ColoredTargetInfoView(setInfo: entry, isWarmup: entry.isWarmup)
    }
}

@available(iOS 16.1, *)
struct ExerciseInfo: View {
    let entry: HistoryEntryState
    let restTimer: LiveActivityRest?
    let stateVersion: Int

    var body: some View {
        HStack(alignment: .top, spacing: 8.0) {
            if let exerciseImageUrl = entry.exerciseImageUrl {
                CachedImage(
                    urlString: exerciseImageUrl,
                    height: 60
                )
            }

            VStack(alignment: .leading, spacing: 0.0) {
                Text(entry.exerciseName)
                    .font(.custom("Poppins-SemiBold", size: 16))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                HStack(alignment: .top, spacing: 8.0) {
                    VStack(alignment: .leading) {
                        LiveActivityTargetInfo(entry: entry)
                            .font(.custom("Poppins-Regular", size: 13))

                        if let plates = entry.plates {
                            HStack(spacing: 0.0) {
                                Text("Plates: ")
                                    .foregroundColor(.secondary)
                                Text(plates)
                                    .foregroundColor(.primary)
                            }
                            .font(.custom("Poppins-Regular", size: 13))
                        }
                    }.layoutPriority(1)
                    Spacer()
                    CurrentSetCard(
                        entry: entry,
                        stateVersion: stateVersion,
                        restTimer: restTimer
                    )
                }
            }
        }
        .font(.custom("Poppins-Regular", size: 14))
    }
}

@available(iOS 16.1, *)
struct CurrentSetCard: View {
    let entry: HistoryEntryState
    let stateVersion: Int
    let restTimer: LiveActivityRest?

    var body: some View {
        if let weight = entry.currentWeight,
           let reps = entry.currentReps {

            let shouldOpenApp = !entry.canCompleteFromLiveActivity
            if shouldOpenApp {
                Toggle(isOn: false, intent: OpenWorkoutIntent(
                    entryIndex: entry.entryIndex,
                    setIndex: entry.setIndex,
                    stateVersion: stateVersion,
                    restTimer: restTimer?.restTimer,
                    restTimerSince: restTimer?.restTimerSince
                )) {
                    // Empty label
                }
                .toggleStyle(SetCardToggleStyle(reps: reps, weight: weight))
            } else {
                Toggle(isOn: false, intent: CompleteSetIntent(
                    entryIndex: entry.entryIndex,
                    setIndex: entry.setIndex,
                    stateVersion: stateVersion,
                    restTimer: restTimer?.restTimer,
                    restTimerSince: restTimer?.restTimerSince
                )) {
                    // Empty label
                }
                .toggleStyle(SetCardToggleStyle(reps: reps, weight: weight))
            }
        }
    }
}

@available(iOS 16.1, *)
struct SetCardToggleStyle: ToggleStyle {
    let reps: String
    let weight: String

    func makeBody(configuration: Configuration) -> some View {
        Button {
            withAnimation(.easeIn(duration: 0.2)) {
                configuration.isOn.toggle()
            }
        } label: {
            HStack {
                Text("\(reps) × \(weight)")
                    .font(.custom("Poppins-Regular", size: 16))
                    .foregroundColor(.primary)
                    .minimumScaleFactor(0.7)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(configuration.isOn ? .green : .gray.opacity(0.8))
            }
            .padding(.vertical, 4.0)
            .padding(.horizontal, 12.0)
            .background(
                RoundedRectangle(cornerRadius: 8.0)
                    .fill(Color.white.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8.0)
                    .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

@available(iOS 16.1, *)
struct SetCardContent: View {
    let reps: String
    let weight: String
    let isPressed: Bool

    var body: some View {
        HStack {
            Text("\(reps) × \(weight)")
                .font(.custom("Poppins-Regular", size: 16))
                .foregroundColor(.primary)
                .minimumScaleFactor(0.7)

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 24))
                .foregroundColor(isPressed ? .green : .gray.opacity(0.8))
                .scaleEffect(isPressed ? 1.2 : 1.0)
        }
        .padding(.vertical, 4.0)
        .padding(.horizontal, 12.0)
        .background(
            RoundedRectangle(cornerRadius: 8.0)
                .fill(Color.white.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8.0)
                .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
        )
    }
}

@available(iOS 16.1, *)
func formatTime(_ timestampMs: Int) -> String {
    let elapsed = Int(Date().timeIntervalSince1970 * 1000) - timestampMs
    let seconds = elapsed / 1000
    let minutes = seconds / 60
    let remainingSeconds = seconds % 60
    return String(format: "%d:%02d", minutes, remainingSeconds)
}

@available(iOS 16.1, *)
func formatWorkoutTime(_ timestampMs: Int) -> String {
    let elapsed = Int(Date().timeIntervalSince1970 * 1000) - timestampMs
    let totalSeconds = elapsed / 1000
    let hours = totalSeconds / 3600
    let minutes = (totalSeconds % 3600) / 60
    return String(format: "%02d:%02dh", hours, minutes)
}
