//
//  SetTimerEditScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

// Edit or clear the recorded time of a timed set (mirrors the in-app NavModalSetTimerEdit). Minutes/seconds
// are crown-editable: tapping a segment selects it, and the Digital Crown adjusts the selected one.
struct SetTimerEditScreen: View {
    let isUnilateral: Bool
    let onSave: (_ seconds: Int, _ secondsLeft: Int?) async -> Void
    let onClear: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.navbarHeight) private var navbarHeight

    enum Segment { case leftMinutes, leftSeconds, minutes, seconds }

    @State private var leftMinutes: Double
    @State private var leftSeconds: Double
    @State private var minutes: Double
    @State private var seconds: Double
    @State private var selected: Segment
    @State private var isBusy = false

    private let buttonHeight: CGFloat = 34

    init(
        initialSeconds: Int,
        initialLeftSeconds: Int,
        isUnilateral: Bool,
        onSave: @escaping (_ seconds: Int, _ secondsLeft: Int?) async -> Void,
        onClear: @escaping () async -> Void
    ) {
        self.isUnilateral = isUnilateral
        self.onSave = onSave
        self.onClear = onClear
        _minutes = State(initialValue: Double(initialSeconds / 60))
        _seconds = State(initialValue: Double(initialSeconds % 60))
        _leftMinutes = State(initialValue: Double(initialLeftSeconds / 60))
        _leftSeconds = State(initialValue: Double(initialLeftSeconds % 60))
        _selected = State(initialValue: isUnilateral ? .leftSeconds : .seconds)
    }

    var body: some View {
        VStack(spacing: 0) {
            Text("Edit time")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(LiftosaurColor.textPrimary)
                .padding(.top, navbarHeight + 4)

            Spacer(minLength: 4)

            VStack(spacing: 4) {
                if isUnilateral {
                    durationRow(label: "L", minutesValue: leftMinutes, secondsValue: leftSeconds, minutesSegment: .leftMinutes, secondsSegment: .leftSeconds)
                    durationRow(label: "R", minutesValue: minutes, secondsValue: seconds, minutesSegment: .minutes, secondsSegment: .seconds)
                } else {
                    durationRow(label: nil, minutesValue: minutes, secondsValue: seconds, minutesSegment: .minutes, secondsSegment: .seconds)
                    Text("mm:ss")
                        .font(.system(size: 11))
                        .foregroundColor(LiftosaurColor.textSecondary)
                }
            }
            // Only one focusable crown view is rendered at a time, so watchOS auto-focuses it and routes the
            // crown to the selected segment (same approach as FieldCrownModifier).
            .background(crownBinding)

            Spacer(minLength: 8)

            HStack(spacing: 6) {
                Button(action: { clear() }) {
                    Text("Clear")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LiftosaurColor.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: buttonHeight)
                }
                .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.backgroundSet, cornerRadius: buttonHeight / 2))
                .disabled(isBusy)

                Button(action: { save() }) {
                    Text("Save")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                        .frame(maxWidth: .infinity)
                        .frame(height: buttonHeight)
                }
                .buttonStyle(NavigationButtonStyle(backgroundColor: LiftosaurColor.buttonPrimaryBackground, cornerRadius: buttonHeight / 2))
                .disabled(isBusy)
            }
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 6)
        .ignoresSafeArea(edges: .top)
    }

    @ViewBuilder
    private var crownBinding: some View {
        switch selected {
        case .leftMinutes:
            crownField($leftMinutes, through: 99)
        case .leftSeconds:
            crownField($leftSeconds, through: 59)
        case .minutes:
            crownField($minutes, through: 99)
        case .seconds:
            crownField($seconds, through: 59)
        }
    }

    @ViewBuilder
    private func crownField(_ value: Binding<Double>, through: Double) -> some View {
        Color.clear
            .focusable()
            .digitalCrownRotation(value, from: 0, through: through, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
    }

    @ViewBuilder
    private func durationRow(
        label: String?,
        minutesValue: Double,
        secondsValue: Double,
        minutesSegment: Segment,
        secondsSegment: Segment
    ) -> some View {
        HStack(spacing: 4) {
            if let label {
                Text(label)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(LiftosaurColor.textSecondary)
                    .frame(width: 14)
            }
            segment("\(Int(minutesValue))", isSelected: selected == minutesSegment, isCompact: isUnilateral) {
                selected = minutesSegment
            }
            Text(":")
                .font(.system(size: isUnilateral ? 22 : 32, weight: .bold))
                .monospacedDigit()
                .foregroundColor(LiftosaurColor.textSecondary)
            segment(String(format: "%02d", Int(secondsValue)), isSelected: selected == secondsSegment, isCompact: isUnilateral) {
                selected = secondsSegment
            }
        }
    }

    @ViewBuilder
    private func segment(_ text: String, isSelected: Bool, isCompact: Bool, onTap: @escaping () -> Void) -> some View {
        Text(text)
            .font(.system(size: isCompact ? 24 : 34, weight: .bold))
            .monospacedDigit()
            .foregroundColor(isSelected ? LiftosaurColor.purple400 : LiftosaurColor.textPrimary)
            .frame(minWidth: isCompact ? 34 : 42)
            .padding(.vertical, isCompact ? 2 : 4)
            .background(isSelected ? LiftosaurColor.backgroundSetActive : LiftosaurColor.backgroundSet)
            .cornerRadius(8)
            .onTapGesture { onTap() }
    }

    private func save() {
        guard !isBusy else { return }
        isBusy = true
        let secs = Int(minutes) * 60 + Int(seconds)
        let leftSecs = isUnilateral ? Int(leftMinutes) * 60 + Int(leftSeconds) : nil
        Task {
            await onSave(secs, leftSecs)
            dismiss()
        }
    }

    private func clear() {
        guard !isBusy else { return }
        isBusy = true
        Task {
            await onClear()
            dismiss()
        }
    }
}
