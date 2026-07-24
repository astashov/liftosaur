//
//  RestTimerScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct RestTimerScreen: View {
    let restTimer: WatchRestTimer
    let heartRate: Double?
    let onAdjust: (Int) -> Void
    let onDelete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.navbarHeight) private var navbarHeight
    @Environment(\.screenWidth) private var screenWidth
    @State private var elapsedSeconds: Int = 0
    @State private var timer: Timer?
    @State private var pendingAdjustment: Int = 0
    @State private var debounceTimer: Timer?
    @State private var expectedTimer: Int? = nil

    private let debounceDelay: TimeInterval = 0.5

    var body: some View {
        let heartRateTop = navbarHeight * 0.65
        let contentTop = navbarHeight + 8  // Start content just below navbar

        ZStack(alignment: .topTrailing) {
            VStack(spacing: 8) {
                Text("Rest Timer")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundColor(LiftosaurColor.textPrimary)

                HStack(spacing: 4) {
                    Button(action: { adjustTimer(-15) }) {
                        Text("-15")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LiftosaurColor.textPrimary)
                            .frame(width: 36, height: 36)
                    }
                    .buttonStyle(.plain)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(8)

                    VStack(spacing: 2) {
                        Text(formatTime(elapsedSeconds))
                            .font(.system(size: 28, weight: .bold))
                            .monospacedDigit()
                            .foregroundColor(elapsedSeconds > displayTimer ? .red : LiftosaurColor.textPrimary)

                        Text(formatTime(displayTimer))
                            .font(.system(size: 16))
                            .monospacedDigit()
                            .foregroundColor(LiftosaurColor.textSecondary)
                    }
                    .frame(minWidth: 80)

                    Button(action: { adjustTimer(15) }) {
                        Text("+15")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(LiftosaurColor.textPrimary)
                            .frame(width: 36, height: 36)
                    }
                    .buttonStyle(.plain)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(8)
                }

                Button(action: {
                    onDelete()
                    dismiss()
                }) {
                    Text("Delete")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                }
                .buttonStyle(.plain)
                .background(Color.red)
                .cornerRadius(22)
                .padding(.horizontal, 16)
            }
            .padding(.vertical, 8)
            .padding(.top, contentTop)

            // Heart rate overlay under clock
            HeartRateView(heartRate: heartRate, fontSize: 12)
                .padding(.top, heartRateTop)
                .padding(.trailing, screenWidth * 0.07)
        }
        .ignoresSafeArea(edges: .top)
        .onAppear {
            updateElapsedTime()
            startTimer()
        }
        .onDisappear {
            stopTimer()
            flushPendingAdjustment()
        }
        .onChange(of: restTimer.timer) { _, newTimer in
            onTimerChanged(newTimer)
        }
    }

    private var displayTimer: Int {
        // If we're waiting for confirmation, show the expected value
        if let expected = expectedTimer {
            return expected
        }
        return restTimer.timer + pendingAdjustment
    }

    private func adjustTimer(_ delta: Int) {
        pendingAdjustment += delta

        // Cancel existing debounce timer
        debounceTimer?.invalidate()

        // Schedule new debounce timer
        debounceTimer = Timer.scheduledTimer(withTimeInterval: debounceDelay, repeats: false) { _ in
            flushPendingAdjustment()
        }
    }

    private func flushPendingAdjustment() {
        debounceTimer?.invalidate()
        debounceTimer = nil

        if pendingAdjustment != 0 {
            // Store expected value before calling onAdjust
            // This prevents flash when pendingAdjustment resets before parent updates
            expectedTimer = restTimer.timer + pendingAdjustment
            onAdjust(pendingAdjustment)
            pendingAdjustment = 0
        }
    }

    private func onTimerChanged(_ newTimer: Int) {
        // Clear expectedTimer once parent confirms our adjustment
        if let expected = expectedTimer, newTimer == expected {
            expectedTimer = nil
        }
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            updateElapsedTime()
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func updateElapsedTime() {
        let timerSinceMs = restTimer.timerSince
        let timerSinceDate = Date(timeIntervalSince1970: timerSinceMs / 1000)
        elapsedSeconds = Int(Date().timeIntervalSince(timerSinceDate))
    }

    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}

#Preview {
    RestTimerScreen(
        restTimer: WatchRestTimer(timerSince: Date().timeIntervalSince1970 * 1000 - 90000, timer: 180),
        heartRate: 145,
        onAdjust: { _ in },
        onDelete: {}
    )
}
