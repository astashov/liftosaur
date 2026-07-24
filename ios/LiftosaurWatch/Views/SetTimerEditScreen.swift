//
//  SetTimerEditScreen.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

// Edit or clear the recorded time of a timed set (mirrors the in-app NavModalSetTimerEdit). Minutes/seconds
// are crown-editable: tapping a segment selects it, and the Digital Crown adjusts the selected one.
struct SetTimerEditScreen: View {
    let initialSeconds: Int
    let onSave: (Int) async -> Void
    let onClear: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.navbarHeight) private var navbarHeight

    enum Segment { case minutes, seconds }

    @State private var minutes: Double
    @State private var seconds: Double
    @State private var selected: Segment = .seconds
    @State private var isBusy = false

    private let buttonHeight: CGFloat = 34

    init(initialSeconds: Int, onSave: @escaping (Int) async -> Void, onClear: @escaping () async -> Void) {
        self.initialSeconds = initialSeconds
        self.onSave = onSave
        self.onClear = onClear
        _minutes = State(initialValue: Double(initialSeconds / 60))
        _seconds = State(initialValue: Double(initialSeconds % 60))
    }

    var body: some View {
        VStack(spacing: 0) {
            Text("Edit time")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(LiftosaurColor.textPrimary)
                .padding(.top, navbarHeight + 4)

            Spacer(minLength: 6)

            HStack(spacing: 4) {
                segment("\(Int(minutes))", isSelected: selected == .minutes) { selected = .minutes }
                Text(":")
                    .font(.system(size: 32, weight: .bold))
                    .monospacedDigit()
                    .foregroundColor(LiftosaurColor.textSecondary)
                segment(String(format: "%02d", Int(seconds)), isSelected: selected == .seconds) { selected = .seconds }
            }
            // Only one focusable crown view is rendered at a time, so watchOS auto-focuses it and routes the
            // crown to the selected segment (same approach as FieldCrownModifier).
            .background(
                Group {
                    if selected == .minutes {
                        Color.clear
                            .focusable()
                            .digitalCrownRotation($minutes, from: 0, through: 99, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
                    } else {
                        Color.clear
                            .focusable()
                            .digitalCrownRotation($seconds, from: 0, through: 59, by: 1, sensitivity: .low, isContinuous: false, isHapticFeedbackEnabled: true)
                    }
                }
            )

            Text("mm:ss")
                .font(.system(size: 11))
                .foregroundColor(LiftosaurColor.textSecondary)
                .padding(.top, 2)

            Spacer(minLength: 10)

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
    private func segment(_ text: String, isSelected: Bool, onTap: @escaping () -> Void) -> some View {
        Text(text)
            .font(.system(size: 34, weight: .bold))
            .monospacedDigit()
            .foregroundColor(isSelected ? LiftosaurColor.purple400 : LiftosaurColor.textPrimary)
            .frame(minWidth: 42)
            .padding(.vertical, 4)
            .background(isSelected ? LiftosaurColor.backgroundSetActive : LiftosaurColor.backgroundSet)
            .cornerRadius(8)
            .onTapGesture { onTap() }
    }

    private func save() {
        guard !isBusy else { return }
        isBusy = true
        let secs = Int(minutes) * 60 + Int(seconds)
        Task {
            await onSave(secs)
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
