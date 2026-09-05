//
//  SetTimerScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct SetTimerScreen: View {
    @ObservedObject var workoutManager: WorkoutManager
    let heartRate: Double?
    let onRecord: (Int) async -> Void  // Stop & record — arg is elapsed seconds captured at tap
    let onKeep: (Int) async -> Void  // Log & keep timing
    let onCheck: () async -> Void  // per-tick auto-advance poll
    let onStartNow: () async -> Void  // "Start now" — skip the rest of the get-ready countdown
    // Discard. This screen is rendered inline rather than in a sheet (sheets are frozen by watchOS in the
    // Always-On dimmed state), so it has to draw its own dismiss instead of getting the sheet's chrome.
    let onDismiss: () -> Void

    @Environment(\.navbarHeight) private var navbarHeight
    @Environment(\.screenWidth) private var screenWidth
    @Environment(\.screenHeight) private var screenHeight
    @State private var elapsedSeconds: Int = 0
    @State private var timer: Timer?
    @State private var isBusy = false

    private let buttonHeight: CGFloat = 34

    // Breathing room under "then 0:00". Reserved here rather than added as padding: the ring is sized from
    // what's left, so taking it out of the budget is what actually moves the content up off the bezel - the
    // Spacer below the labels then absorbs it.
    private let getReadyBottomInset: CGFloat = 18

    // One tick per remaining second, capped so a long countdown doesn't turn into a drumroll. Mirrors
    // MAX_CUE_SECONDS in setTimerBanner.tsx.
    private let maxCueSeconds = 5

    // Everything in the get-ready layout that isn't the ring: navbar + 8 content top, the 30pt exercise
    // header, the VStack's 8pt top padding, the ring's own 4pt bottom padding, "Get Ready" (17) and
    // "then 0:00" (14) with 4pt spacing each, and the 6pt bottom padding.
    private var getReadyChromeHeight: CGFloat {
        navbarHeight + 8 + 30 + 8 + 4 + 17 + 4 + 14 + 4 + 6 + getReadyBottomInset
    }

    var body: some View {
        let contentTop = navbarHeight + 8
        let heartRateTop = navbarHeight * 0.65

        ZStack(alignment: .topTrailing) {
            if let modal = workoutManager.setTimerModal {
                SetTimerScaffold(modal: modal, contentTop: contentTop) {
                    if modal.isGetReady {
                        GetReadyPhaseView(
                            modal: modal,
                            secondsLeft: getReadySecondsLeft,
                            ringSize: min(screenHeight - getReadyChromeHeight, screenWidth * 0.62),
                            isBusy: isBusy,
                            onStartNow: { startNow() }
                        )
                    } else {
                        WorkClockPhaseView(modal: modal, elapsedSeconds: elapsedSeconds, clock: clockColor(modal))
                    }
                } actions: {
                    // Nothing to record during the countdown - the work clock hasn't started - so Log & Keep /
                    // Log & Stop must stay hidden, or the set can be logged before it began. Starting early is
                    // a tap on the ring itself.
                    if !modal.isGetReady && !modal.isCompleted {
                        HStack(spacing: 6) {
                            Button(action: { record(modal, keep: true) }) {
                                Text("Log & Keep")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(LiftosaurColor.textPrimary)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: buttonHeight)
                            }
                            .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.backgroundSet, cornerRadius: buttonHeight / 2))
                            .disabled(isBusy)

                            Button(action: { record(modal, keep: false) }) {
                                Text("Log & Stop")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: buttonHeight)
                            }
                            .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.buttonPrimaryBackground, cornerRadius: buttonHeight / 2))
                            .disabled(isBusy)
                        }
                    }
                }
            }

            HeartRateView(heartRate: heartRate, fontSize: 12)
                .padding(.top, heartRateTop)
                .padding(.trailing, screenWidth * 0.07)

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .frame(width: 32, height: 32)
                    .background(Circle().fill(LiftosaurColor.backgroundSet))
                    // Hit slop outside the circle: this sits near the top bezel, where the target is
                    // otherwise easy to miss. Applied after the background so the circle stays 32pt.
                    .padding(8)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.top, max(0, heartRateTop - 18))
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .ignoresSafeArea(edges: .top)
        .onAppear {
            if let modal = workoutManager.setTimerModal { updateElapsed(modal) }
            startTimer()
        }
        // elapsedSeconds is only recomputed on the 1s tick, so without this the work clock renders the
        // countdown's last elapsed for up to a second after the phase flips - "0:02, 0:00, 0:01".
        .onChange(of: workoutManager.setTimerModal) { oldValue, newValue in
            if let modal = newValue { updateElapsed(modal) }
            if oldValue?.isGetReady == true && newValue?.isGetReady == false {
                workoutManager.playGetReadyEndSound()
            }
        }
        // getReadySecondsLeft is derived from elapsedSeconds, so this fires once per counted-down second.
        .onChange(of: elapsedSeconds) { _, _ in
            guard workoutManager.setTimerModal?.isGetReady == true else { return }
            let left = getReadySecondsLeft
            if left > 0 && left <= maxCueSeconds {
                workoutManager.playGetReadyTick()
            }
        }
        .onDisappear { stopTimer() }
    }

    private func clockColor(_ modal: WatchSetTimerModal) -> Color {
        // Overflow sets are meant to run past target; a non-overflow set auto-completes at target, so only
        // redden it if it overran (e.g. the app was asleep when the threshold passed).
        if !modal.isOverflow && modal.setTimer > 0 && elapsedSeconds > modal.setTimer {
            return LiftosaurColor.textError
        }
        return LiftosaurColor.textPrimary
    }

    private func record(_ modal: WatchSetTimerModal, keep: Bool) {
        guard !isBusy else { return }
        isBusy = true
        let seconds = max(0, Int((Date().timeIntervalSince1970 * 1000 - modal.startedAt) / 1000))
        Task {
            if keep {
                await onKeep(seconds)
            } else {
                await onRecord(seconds)
            }
            isBusy = false
        }
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if let modal = workoutManager.setTimerModal {
                updateElapsed(modal)
            }
            Task { await onCheck() }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func updateElapsed(_ modal: WatchSetTimerModal) {
        let since = Date(timeIntervalSince1970: modal.startedAt / 1000)
        elapsedSeconds = max(0, Int(Date().timeIntervalSince(since)))
    }

    private var getReadySecondsLeft: Int {
        guard let modal = workoutManager.setTimerModal, let total = modal.getReady else { return 0 }
        return max(0, total - elapsedSeconds)
    }

    private func startNow() {
        guard !isBusy else { return }
        isBusy = true
        Task {
            await onStartNow()
            isBusy = false
        }
    }

}

private func formatTime(_ seconds: Int) -> String {
    String(format: "%d:%02d", seconds / 60, seconds % 60)
}

private struct GetReadyRing: View {
    let secondsLeft: Int
    let total: Int
    // Driven by the space actually left over, not a constant: watch screens run from 176pt to 208pt wide
    // and the fixed chrome around this pushed the Start now button off the bottom.
    let size: CGFloat

    private var radius: CGFloat { max(10, (size - stroke) / 2) }
    private let stroke: CGFloat = 7
    // Visible gap between segments, in points along the arc.
    private let visibleGap: CGFloat = 5
    // Above this the per-second ticks are too thin to read, so the ring falls back to one draining arc.
    private let maxSegments = 12

    var body: some View {
        ZStack {
            if total > 0 && total <= maxSegments {
                ForEach(0..<total, id: \.self) { index in
                    segment(index: index, stroke: stroke, isSpent: index >= secondsLeft)
                }
            } else if total > 0 {
                Circle()
                    .stroke(LiftosaurColor.getReadyTrack, style: StrokeStyle(lineWidth: stroke, lineCap: .round))
                    .frame(width: radius * 2, height: radius * 2)
                Circle()
                    .trim(from: 0, to: CGFloat(secondsLeft) / CGFloat(total))
                    .stroke(LiftosaurColor.getReadyAccent, style: StrokeStyle(lineWidth: stroke, lineCap: .round))
                    .frame(width: radius * 2, height: radius * 2)
                    .rotationEffect(.degrees(-90))
            }
            Text("\(secondsLeft)")
                .font(.system(size: size * 0.5, weight: .bold))
                .monospacedDigit()
                .foregroundColor(LiftosaurColor.getReadyAccent)
        }
        .frame(width: size, height: size)
    }

    private func segment(index: Int, stroke: CGFloat, isSpent: Bool) -> some View {
        let fraction = 1.0 / CGFloat(total)
        // lineCap .round bulges each segment out by half the stroke at both ends, so the gap has to cover
        // the gap you want to see PLUS a whole stroke width, or the caps close it up entirely.
        let gap = min(fraction * 0.5, (visibleGap + stroke) / (2 * .pi * radius))
        return Circle()
            .trim(from: CGFloat(index) * fraction + gap / 2, to: CGFloat(index + 1) * fraction - gap / 2)
            .stroke(
                isSpent ? LiftosaurColor.getReadyTrack : LiftosaurColor.getReadyAccent,
                style: StrokeStyle(lineWidth: stroke, lineCap: .round)
            )
            .frame(width: radius * 2, height: radius * 2)
            .rotationEffect(.degrees(-90))
    }
}

// The countdown and the work clock share one navigation destination on purpose: the flip happens in
// place, so a second destination would animate it and fight the nonce that stops the presenter from
// re-presenting. They differ only in the middle, so the chrome lives here and each phase is its own view.
private struct SetTimerScaffold<Phase: View, Actions: View>: View {
    let modal: WatchSetTimerModal
    let contentTop: CGFloat
    @ViewBuilder let phase: () -> Phase
    @ViewBuilder let actions: () -> Actions

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                ExerciseImageView(
                    imageUrl: modal.imageUrl,
                    exerciseName: modal.exerciseName,
                    baseUrl: baseImageUrl.absoluteString,
                    size: 30
                )
                VStack(alignment: .leading, spacing: 1) {
                    Text(modal.exerciseName)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(LiftosaurColor.textPrimary)
                        .lineLimit(1)
                    Text("Set \(modal.currentSet)/\(modal.totalSets)")
                        .font(.system(size: 12))
                        .foregroundColor(LiftosaurColor.textSecondary)
                }
                Spacer(minLength: 0)
            }

            VStack(spacing: 0) { phase() }
                .padding(.top, 8)

            Spacer(minLength: 8)

            actions()
        }
        .padding(.horizontal, 8)
        .padding(.top, contentTop)
        .padding(.bottom, 6)
    }
}

private struct GetReadyPhaseView: View {
    let modal: WatchSetTimerModal
    let secondsLeft: Int
    let ringSize: CGFloat
    let isBusy: Bool
    let onStartNow: () -> Void

    var body: some View {
        // The ring itself is the "start now" target, so there's no button below it to collide with and it
        // can take the space that button used to occupy.
        Button(action: onStartNow) {
            VStack(spacing: 4) {
                GetReadyRing(secondsLeft: secondsLeft, total: modal.getReady ?? 0, size: ringSize)
                    .padding(.bottom, 4)
                Text("Get Ready")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(LiftosaurColor.getReadyAccent)
                if modal.setTimer > 0 {
                    Text("then \(formatTime(modal.setTimer))")
                        .font(.system(size: 12))
                        .monospacedDigit()
                        .foregroundColor(LiftosaurColor.textSecondary)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(isBusy)
    }
}

private struct WorkClockPhaseView: View {
    let modal: WatchSetTimerModal
    let elapsedSeconds: Int
    let clock: Color

    var body: some View {
        Text(formatTime(elapsedSeconds))
            .font(.system(size: 40, weight: .bold))
            .monospacedDigit()
            .foregroundColor(clock)
        if modal.setTimer > 0 {
            Text(modal.isOverflow ? "+ over \(formatTime(modal.setTimer))" : "of \(formatTime(modal.setTimer))")
                .font(.system(size: 14))
                .monospacedDigit()
                .foregroundColor(LiftosaurColor.textSecondary)
                .padding(.top, -3)
        }
    }
}
