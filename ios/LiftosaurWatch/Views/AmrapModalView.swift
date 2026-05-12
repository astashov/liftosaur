//
//  AmrapModalView.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

private let kCrownScale: Double = 2.0

struct AmrapModalView: View {
    let modal: WatchAmrapModal
    let isCompletingSet: Bool
    let onSubmit: (Int?, Int?, Double?, Double?, [String: Any]?) -> Void
    let onCancel: () -> Void

    @State private var reps: Int
    @State private var repsLeft: Int
    @State private var weight: Double
    @State private var weightIndex: Int
    @State private var rpe: Double
    @State private var userVarValues: [String: Double]

    // Crown value trackers (separate from actual values for smooth scrolling)
    @State private var crownReps: Double = 0
    @State private var crownRepsLeft: Double = 0
    @State private var crownWeightIndex: Double = 0
    @State private var crownRpeIndex: Double = 0
    @State private var crownUserVarValues: [String: Double] = [:]

    // RPE uses index-based stepping: [0, 0.5, 1, 1.5, ..., 10] = 21 values
    private static let rpeValues: [Double] = stride(from: 0, through: 10, by: 0.5).map { $0 }

    @State private var selectedField: AmrapField = .none
    @FocusState private var isCrownFocused: Bool

    private var firstField: AmrapField {
        if modal.isAmrap && modal.isUnilateral {
            return .repsLeft
        } else if modal.isAmrap {
            return .reps
        } else if modal.askWeight {
            return .weight
        } else if modal.logRpe {
            return .rpe
        } else if modal.hasUserVars, let firstVar = modal.userPromptedVars.first {
            return .userVar(firstVar.name)
        }
        return .none
    }

    enum AmrapField: Equatable {
        case none
        case reps
        case repsLeft
        case weight
        case rpe
        case userVar(String)
    }

    init(modal: WatchAmrapModal, isCompletingSet: Bool, onSubmit: @escaping (Int?, Int?, Double?, Double?, [String: Any]?) -> Void, onCancel: @escaping () -> Void) {
        self.modal = modal
        self.isCompletingSet = isCompletingSet
        self.onSubmit = onSubmit
        self.onCancel = onCancel
        _reps = State(initialValue: modal.initialReps ?? 0)
        _repsLeft = State(initialValue: modal.initialRepsLeft ?? 0)
        _weight = State(initialValue: modal.initialWeight ?? 0)
        _weightIndex = State(initialValue: modal.validWeightIndex ?? 0)
        _rpe = State(initialValue: modal.initialRpe ?? 0)

        _crownReps = State(initialValue: Double(modal.initialReps ?? 0) * kCrownScale + 1.0)
        _crownRepsLeft = State(initialValue: Double(modal.initialRepsLeft ?? 0) * kCrownScale + 1.0)
        _crownWeightIndex = State(initialValue: Double(modal.validWeightIndex ?? 0) * kCrownScale + 1.0)
        let initialRpe = modal.initialRpe ?? 0
        _crownRpeIndex = State(initialValue: initialRpe * 2.0 * kCrownScale + 1.0)

        var initialUserVars: [String: Double] = [:]
        var initialCrownUserVars: [String: Double] = [:]
        for userVar in modal.userPromptedVars {
            initialUserVars[userVar.name] = userVar.value
            initialCrownUserVars[userVar.name] = userVar.value * kCrownScale + 1.0
        }
        _userVarValues = State(initialValue: initialUserVars)
        _crownUserVarValues = State(initialValue: initialCrownUserVars)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Reps (left) for unilateral exercises
                if modal.isAmrap && modal.isUnilateral {
                    AmrapInputField(
                        label: "Reps (left)",
                        value: $repsLeft,
                        isFocused: isFieldFocused(.repsLeft),
                        onTap: { toggleField(.repsLeft) }
                    )
                }

                // Reps
                if modal.isAmrap {
                    AmrapInputField(
                        label: modal.isUnilateral ? "Reps (right)" : "Reps",
                        value: $reps,
                        isFocused: isFieldFocused(.reps),
                        onTap: { toggleField(.reps) }
                    )
                }

                // Weight
                if modal.askWeight {
                    AmrapWeightField(
                        label: "Weight (\(modal.weightUnit))",
                        value: $weight,
                        isFocused: isFieldFocused(.weight),
                        onTap: { toggleField(.weight) }
                    )
                }

                // RPE
                if modal.logRpe {
                    AmrapRpeField(
                        label: "RPE",
                        value: $rpe,
                        isFocused: isFieldFocused(.rpe),
                        onTap: { toggleField(.rpe) }
                    )
                }

                // User prompted state variables
                if modal.hasUserVars {
                    ForEach(modal.userPromptedVars, id: \.name) { userVar in
                        AmrapUserVarField(
                            userVar: userVar,
                            value: Binding(
                                get: { userVarValues[userVar.name] ?? userVar.value },
                                set: { userVarValues[userVar.name] = $0 }
                            ),
                            isFocused: isFieldFocused(.userVar(userVar.name)),
                            onTap: { toggleField(.userVar(userVar.name)) }
                        )
                    }
                }

                // Buttons
                HStack(spacing: 12) {
                    Button(action: onCancel) {
                        Text("Cancel")
                            .font(.system(size: 14))
                            .foregroundColor(LiftosaurColor.textSecondary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 40)
                    }
                    .buttonStyle(.plain)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(20)

                    Button(action: submitValues) {
                        if isCompletingSet {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: LiftosaurColor.buttonPrimaryLabel))
                                .frame(maxWidth: .infinity)
                                .frame(height: 40)
                        } else {
                            Text("Done")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(LiftosaurColor.buttonPrimaryLabel)
                                .frame(maxWidth: .infinity)
                                .frame(height: 40)
                        }
                    }
                    .buttonStyle(.plain)
                    .background(LiftosaurColor.buttonPrimaryBackground)
                    .cornerRadius(20)
                    .disabled(isCompletingSet)
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(
            crownHandler
        )
        .onChange(of: selectedField) { _, newField in
            switch newField {
            case .none:
                isCrownFocused = false
            default:
                isCrownFocused = true
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                selectedField = firstField
            }
        }
    }

    private var crownHandler: some View {
        Group {
            switch selectedField {
            case .reps:
                Color.clear
                    .focusable()
                    .focused($isCrownFocused)
                    .digitalCrownRotation(
                        $crownReps,
                        from: 0,
                        through: 999 * kCrownScale + (kCrownScale - 1),
                        by: 1,
                        sensitivity: .low,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onChange(of: crownReps) { _, newValue in
                        reps = max(0, Int(newValue.rounded() / kCrownScale))
                    }
            case .repsLeft:
                Color.clear
                    .focusable()
                    .focused($isCrownFocused)
                    .digitalCrownRotation(
                        $crownRepsLeft,
                        from: 0,
                        through: 999 * kCrownScale + (kCrownScale - 1),
                        by: 1,
                        sensitivity: .low,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onChange(of: crownRepsLeft) { _, newValue in
                        repsLeft = max(0, Int(newValue.rounded() / kCrownScale))
                    }
            case .weight:
                Color.clear
                    .focusable()
                    .focused($isCrownFocused)
                    .digitalCrownRotation(
                        $crownWeightIndex,
                        from: 0,
                        through: Double(max(0, (modal.validWeights?.count ?? 1) - 1)) * kCrownScale + (kCrownScale - 1),
                        by: 1,
                        sensitivity: .low,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onChange(of: crownWeightIndex) { _, newValue in
                        guard let weights = modal.validWeights, !weights.isEmpty else { return }
                        let newIndex = max(0, min(weights.count - 1, Int(newValue.rounded() / kCrownScale)))
                        if newIndex != weightIndex {
                            weightIndex = newIndex
                            weight = weights[newIndex]
                        }
                    }
            case .rpe:
                Color.clear
                    .focusable()
                    .focused($isCrownFocused)
                    .digitalCrownRotation(
                        $crownRpeIndex,
                        from: 0,
                        through: Double(Self.rpeValues.count - 1) * kCrownScale + (kCrownScale - 1),
                        by: 1,
                        sensitivity: .low,
                        isContinuous: false,
                        isHapticFeedbackEnabled: true
                    )
                    .onChange(of: crownRpeIndex) { _, newValue in
                        let newIndex = max(0, min(Self.rpeValues.count - 1, Int(newValue.rounded() / kCrownScale)))
                        let newRpe = Self.rpeValues[newIndex]
                        if newRpe != rpe {
                            rpe = newRpe
                        }
                    }
            case .userVar(let name):
                userVarCrownHandler(name: name)
            case .none:
                Color.clear
            }
        }
    }

    @ViewBuilder
    private func userVarCrownHandler(name: String) -> some View {
        let rangeMin: Double = -9999 * kCrownScale - (kCrownScale - 1)
        let rangeMax: Double = 9999 * kCrownScale + (kCrownScale - 1)
        Color.clear
            .focusable()
            .focused($isCrownFocused)
            .digitalCrownRotation(
                Binding(
                    get: { crownUserVarValues[name] ?? 0 },
                    set: { crownUserVarValues[name] = $0 }
                ),
                from: rangeMin,
                through: rangeMax,
                by: 1,
                sensitivity: .low,
                isContinuous: false,
                isHapticFeedbackEnabled: true
            )
            .onChange(of: crownUserVarValues[name]) { _, newValue in
                guard let newValue = newValue else { return }
                let snapped = Double(Int(newValue.rounded() / kCrownScale))
                if snapped != userVarValues[name] {
                    userVarValues[name] = snapped
                }
            }
    }

    private func isFieldFocused(_ field: AmrapField) -> Bool {
        switch (selectedField, field) {
        case (.reps, .reps): return true
        case (.repsLeft, .repsLeft): return true
        case (.weight, .weight): return true
        case (.rpe, .rpe): return true
        case (.userVar(let a), .userVar(let b)): return a == b
        default: return false
        }
    }

    private func toggleField(_ field: AmrapField) {
        if isFieldFocused(field) {
            selectedField = .none
        } else {
            selectedField = field
        }
    }

    private func submitValues() {
        let repsValue = modal.isAmrap ? reps : nil
        let repsLeftValue = (modal.isAmrap && modal.isUnilateral) ? repsLeft : nil
        let weightValue = modal.askWeight ? weight : nil
        let rpeValue = modal.logRpe ? rpe : nil

        var userVars: [String: Any]? = nil
        if modal.hasUserVars && !userVarValues.isEmpty {
            var vars: [String: Any] = [:]
            for userVar in modal.userPromptedVars {
                if let value = userVarValues[userVar.name] {
                    if let unit = userVar.unit {
                        if unit == "%" {
                            vars[userVar.name] = ["value": value]
                        } else {
                            vars[userVar.name] = ["value": value, "unit": unit]
                        }
                    } else {
                        vars[userVar.name] = value
                    }
                }
            }
            userVars = vars
        }

        onSubmit(repsValue, repsLeftValue, weightValue, rpeValue, userVars)
    }
}

// MARK: - Input Fields

struct AmrapInputField: View {
    let label: String
    @Binding var value: Int
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(LiftosaurColor.textSecondary)

            Button(action: onTap) {
                Text("\(value)")
                    .font(.system(size: 20, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isFocused ? LiftosaurColor.buttonPrimaryBackground : Color.clear, lineWidth: 2)
                    )
            }
            .buttonStyle(.plain)
        }
    }
}

struct AmrapWeightField: View {
    let label: String
    @Binding var value: Double
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(LiftosaurColor.textSecondary)

            Button(action: onTap) {
                Text(formatWeight(value))
                    .font(.system(size: 20, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isFocused ? LiftosaurColor.buttonPrimaryBackground : Color.clear, lineWidth: 2)
                    )
            }
            .buttonStyle(.plain)
        }
    }

    private func formatWeight(_ value: Double) -> String {
        SetFormatters.formatNumber(value)
    }
}

struct AmrapRpeField: View {
    let label: String
    @Binding var value: Double
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(LiftosaurColor.textSecondary)

            Button(action: onTap) {
                Text(formatRpe(value))
                    .font(.system(size: 20, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isFocused ? LiftosaurColor.buttonPrimaryBackground : Color.clear, lineWidth: 2)
                    )
            }
            .buttonStyle(.plain)
        }
    }

    private func formatRpe(_ value: Double) -> String {
        SetFormatters.formatNumber(value)
    }
}

struct AmrapUserVarField: View {
    let userVar: WatchUserPromptedStateVar
    @Binding var value: Double
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(displayLabel)
                .font(.system(size: 12))
                .foregroundColor(LiftosaurColor.textSecondary)

            Button(action: onTap) {
                Text(formatValue(value))
                    .font(.system(size: 20, weight: .medium))
                    .monospacedDigit()
                    .foregroundColor(LiftosaurColor.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                    .background(LiftosaurColor.backgroundSet)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isFocused ? LiftosaurColor.buttonPrimaryBackground : Color.clear, lineWidth: 2)
                    )
            }
            .buttonStyle(.plain)
        }
    }

    private var displayLabel: String {
        if let unit = userVar.unit {
            return "\(userVar.name) (\(unit))"
        }
        return userVar.name
    }

    private func formatValue(_ value: Double) -> String {
        SetFormatters.formatNumber(value)
    }
}
