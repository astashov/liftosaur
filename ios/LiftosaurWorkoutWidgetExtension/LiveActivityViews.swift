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

// MARK: - Set Timer Mode

// Reuses the colored target row (reps × weight @rpe) but shows the timer as `setTimer|rest` (e.g.
// `60s|120s`) instead of just the rest, and drops the "Target:" prefix.
struct SetTimerTargetInfo: SetInfoProvider {
    let entry: HistoryEntryState
    let setTimerSeconds: Int

    var repsText: String? { entry.targetReps }
    var weightText: String? { entry.targetWeight }
    var originalWeightText: String? { nil }
    var rpeText: String? { entry.targetRPE }
    var timerText: String? {
        if let rest = entry.targetTimer {
            return "\(setTimerSeconds)s|\(rest)s"
        }
        return "\(setTimerSeconds)s"
    }
}

@available(iOS 16.1, *)
struct SetTimerActivityView: View {
    let entry: HistoryEntryState?
    let setTimer: LiveActivitySetTimer

    var body: some View {
        let canComplete = entry?.canCompleteFromLiveActivity ?? true
        return VStack(spacing: 8.0) {
            HStack(spacing: 8.0) {
                HStack(spacing: 16.0) {
                    Image("AppIcon2")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 32, height: 32)
                        .cornerRadius(8.0)
                    SetTimerClock(setTimer: setTimer)
                }
                .layoutPriority(1)

                Spacer()

                // Once the set is logged there's nothing left to record. Keep the button-width slot
                // reserved so the count-up clock doesn't expand into the freed space and push "of 0:30"
                // to the right edge.
                if !setTimer.isCompleted {
                    SetTimerActionButton(setTimer: setTimer, canComplete: canComplete, keepTiming: false, text: "Stop & Record", kind: .primary)
                } else {
                    Color.clear.frame(width: 124)
                }
            }

            HStack(alignment: .center, spacing: 8.0) {
                if let entry {
                    if let exerciseImageUrl = entry.exerciseImageUrl {
                        CachedImage(urlString: exerciseImageUrl, height: 44)
                    }
                    VStack(alignment: .leading, spacing: 1.0) {
                        Text(entry.exerciseName)
                            .font(.custom("Poppins-SemiBold", size: 16))
                            .foregroundColor(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                        ColoredTargetInfoView(
                            setInfo: SetTimerTargetInfo(entry: entry, setTimerSeconds: setTimer.setTimer),
                            isWarmup: entry.isWarmup,
                            showPrefix: false,
                            setCountText: "\(entry.currentSet)/\(entry.totalSets)"
                        )
                        .font(.custom("Poppins-Regular", size: 13))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    }
                    .layoutPriority(1)
                }

                Spacer()

                if !setTimer.isCompleted {
                    SetTimerActionButton(setTimer: setTimer, canComplete: canComplete, keepTiming: true, text: "Log Target", kind: .secondary)
                } else {
                    Color.clear.frame(width: 124)
                }
            }
        }
        .padding(.horizontal, 16.0)
        .padding(.top, 8.0)
        .padding(.bottom, 12.0)
    }
}

@available(iOS 16.1, *)
struct SetTimerClock: View {
    let setTimer: LiveActivitySetTimer

    var body: some View {
        let isOvertime: Bool = {
            guard setTimer.setTimer > 0, !setTimer.isOverflow else { return false }
            let elapsed = Int(Date().timeIntervalSince1970) - (setTimer.setTimerSince / 1000)
            return elapsed > setTimer.setTimer
        }()

        HStack(alignment: .center, spacing: 4.0) {
            Text(timerInterval: Date(timeIntervalSince1970: TimeInterval(setTimer.setTimerSince) / 1000)...Date.distantFuture, countsDown: false)
                .font(.custom("Poppins-Bold", size: 34))
                .monospacedDigit()
                .foregroundColor(isOvertime ? .red : .white)
                .lineLimit(1)

            if setTimer.setTimer > 0 {
                let minutes = setTimer.setTimer / 60
                let seconds = setTimer.setTimer % 60
                Text("of \(String(format: "%d:%02d", minutes, seconds))")
                    .font(.custom("Poppins-Regular", size: 15))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)
            }
        }
    }
}

@available(iOS 16.1, *)
struct SetTimerButtonLabel: View {
    enum Kind { case primary, secondary }
    let text: String
    let kind: Kind

    var body: some View {
        Text(text)
            .font(.custom("Poppins-SemiBold", size: 15))
            .foregroundColor(kind == .primary ? .black : .white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(width: 124)
            .padding(.vertical, 12.0)
            .background(
                RoundedRectangle(cornerRadius: 12.0)
                    .fill(kind == .primary ? Color(white: 0.85) : Color.white.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12.0)
                    .strokeBorder(kind == .secondary ? Color.white.opacity(0.2) : Color.clear, lineWidth: 1)
            )
    }
}

@available(iOS 16.1, *)
struct SetTimerActionButton: View {
    let setTimer: LiveActivitySetTimer
    let canComplete: Bool
    let keepTiming: Bool
    let text: String
    let kind: SetTimerButtonLabel.Kind

    var body: some View {
        #if WIDGET_EXTENSION
        // When recording would open the AMRAP modal it can't be done silently — open the app instead,
        // matching ActiveWorkoutView's complete-set button.
        if canComplete {
            Button(intent: RecordSetTimerIntent(entryIndex: setTimer.entryIndex, setIndex: setTimer.setIndex, setTimerSince: setTimer.setTimerSince, keepTiming: keepTiming)) {
                SetTimerButtonLabel(text: text, kind: kind)
            }
            .buttonStyle(.plain)
        } else {
            Button(intent: OpenWorkoutRecordSetTimerIntent(entryIndex: setTimer.entryIndex, setIndex: setTimer.setIndex, setTimerSince: setTimer.setTimerSince, keepTiming: keepTiming)) {
                SetTimerButtonLabel(text: text, kind: kind)
            }
            .buttonStyle(.plain)
        }
        #else
        SetTimerButtonLabel(text: text, kind: kind)
        #endif
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
