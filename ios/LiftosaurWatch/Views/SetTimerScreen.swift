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

    @Environment(\.navbarHeight) private var navbarHeight
    @Environment(\.screenWidth) private var screenWidth
    @State private var elapsedSeconds: Int = 0
    @State private var timer: Timer?
    @State private var isBusy = false

    private let buttonHeight: CGFloat = 34

    var body: some View {
        let contentTop = navbarHeight + 8
        let heartRateTop = navbarHeight * 0.65

        ZStack(alignment: .topTrailing) {
            if let modal = workoutManager.setTimerModal {
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

                    VStack(spacing: 0) {
                        Text(formatTime(elapsedSeconds))
                            .font(.system(size: 40, weight: .bold))
                            .monospacedDigit()
                            .foregroundColor(clockColor(modal))
                        if modal.setTimer > 0 {
                            Text(modal.isOverflow ? "+ over \(formatTime(modal.setTimer))" : "of \(formatTime(modal.setTimer))")
                                .font(.system(size: 14))
                                .monospacedDigit()
                                .foregroundColor(LiftosaurColor.textSecondary)
                                .padding(.top, -3)
                        }
                    }
                    .padding(.top, 8)

                    Spacer(minLength: 16)

                    // Once the set is logged (via "Log") the clock just runs on to the target and auto-closes, so
                    // there's nothing left to do here — dismiss (the X) discards. While running, Stop & Log sit
                    // side by side like the rest view's nav buttons.
                    if !modal.isCompleted {
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
                .padding(.horizontal, 8)
                .padding(.top, contentTop)
                .padding(.bottom, 6)
            }

            HeartRateView(heartRate: heartRate, fontSize: 12)
                .padding(.top, heartRateTop)
                .padding(.trailing, screenWidth * 0.07)
        }
        .ignoresSafeArea(edges: .top)
        .onAppear {
            if let modal = workoutManager.setTimerModal { updateElapsed(modal) }
            startTimer()
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

    private func formatTime(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}
