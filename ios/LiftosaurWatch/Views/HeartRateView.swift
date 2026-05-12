//
//  HeartRateView.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

struct HeartRateView: View {
    @ObservedObject private var healthKitManager = HealthKitManager.shared

    let heartRate: Double?
    var fontSize: CGFloat = 14
    var showIcon: Bool = true

    private var canStartSession: Bool {
        !healthKitManager.isSessionActive
    }

    var body: some View {
        HStack(spacing: 2) {
            if showIcon {
                Image(systemName: "heart.fill")
                    .font(.system(size: fontSize - 2))
                    .foregroundColor(.red)
            }

            if let hr = heartRate {
                Text("\(Int(hr))")
                    .font(.system(size: fontSize, weight: .semibold))
                    .monospacedDigit()
                    .foregroundColor(LiftosaurColor.textPrimary)
            } else {
                Text("--")
                    .font(.system(size: fontSize, weight: .semibold))
                    .foregroundColor(LiftosaurColor.textSecondary)
            }
        }
        .padding(8)
        .contentShape(Rectangle())
        .padding(-8)
        .onTapGesture {
            print("HeartRateView tapped, canStartSession: \(canStartSession)")
            if canStartSession {
                Task {
                    await HealthKitManager.shared.startWorkoutSession()
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        HeartRateView(heartRate: 142)
        HeartRateView(heartRate: nil)
        HeartRateView(heartRate: 156, fontSize: 20)
    }
}
