//
//  ScrollableInputFields.swift
//  LiftosaurWatch Watch App
//

import SwiftUI

// MARK: - Scrollable Int Field (for reps)

struct ScrollableIntField: View {
    @Binding var value: Int
    let initialValue: Int
    let isFocused: Bool
    let minValue: Int
    let maxValue: Int
    let step: Int
    var height: CGFloat = 24
    var fontSize: CGFloat = 16
    var hasCompleted: Bool = false
    var suffix: String? = nil
    var minReps: Int? = nil
    let onTap: () -> Void

    private var isModified: Bool {
        value != initialValue
    }

    private var textColor: Color {
        if isFocused || isModified || hasCompleted {
            return LiftosaurColor.textPrimary
        } else {
            return LiftosaurColor.textSecondary
        }
    }

    private var prevValue: Int {
        max(minValue, value - step)
    }

    private var nextValue: Int {
        min(maxValue, value + step)
    }

    private var borderColor: Color {
        isFocused ? LiftosaurColor.buttonPrimaryBackground : Color.clear
    }

    private var smallFontSize: CGFloat {
        fontSize * 0.6
    }

    private func formatValue(_ val: Int) -> String {
        var text = ""
        if !isFocused && !isModified, let mr = minReps {
            text += "\(mr)-"
        }
        text += "\(val)"
        if !isFocused && !isModified, let s = suffix {
            text += s
        }
        return text
    }

    var body: some View {
        ZStack {
            if isFocused {
                focusedContent
            } else {
                unfocusedContent
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .background(LiftosaurColor.backgroundNeutral)
        .cornerRadius(6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(borderColor, lineWidth: 2)
        )
        .onTapGesture {
            onTap()
        }
    }

    private var focusedContent: some View {
        VStack(spacing: -2) {
            Text(formatValue(prevValue))
                .font(.system(size: smallFontSize, weight: .medium))
                .foregroundColor(LiftosaurColor.textSecondary.opacity(0.4))

            Text(formatValue(value))
                .font(.system(size: fontSize, weight: .medium))
                .foregroundColor(textColor)

            Text(formatValue(nextValue))
                .font(.system(size: smallFontSize, weight: .medium))
                .foregroundColor(LiftosaurColor.textSecondary.opacity(0.4))
        }
    }

    private var unfocusedContent: some View {
        Text(formatValue(value))
            .font(.system(size: fontSize, weight: .medium))
            .foregroundColor(textColor)
    }
}

// MARK: - Scrollable Weight Field

struct ScrollableWeightField: View {
    @Binding var value: Double
    @Binding var weightIndex: Int
    let initialValue: Double
    let unit: String
    let isFocused: Bool
    let validWeights: [Double]
    var height: CGFloat = 24
    var fontSize: CGFloat = 16
    var completedRpe: Double? = nil
    var hasCompleted: Bool = false
    var hasWeight: Bool = true
    var suffix: String? = nil
    let onTap: () -> Void

    private var isModified: Bool {
        value != initialValue
    }

    private var showPlaceholder: Bool {
        !hasWeight && !isModified
    }

    private var textColor: Color {
        if isFocused || isModified || hasCompleted {
            return LiftosaurColor.textPrimary
        } else {
            return LiftosaurColor.textSecondary
        }
    }

    private var prevValue: Double? {
        guard weightIndex > 0 else { return nil }
        return validWeights[weightIndex - 1]
    }

    private var nextValue: Double? {
        guard weightIndex < validWeights.count - 1 else { return nil }
        return validWeights[weightIndex + 1]
    }

    private var borderColor: Color {
        isFocused ? LiftosaurColor.buttonPrimaryBackground : Color.clear
    }

    private var smallFontSize: CGFloat {
        fontSize * 0.6
    }

    private var unitFontSize: CGFloat {
        fontSize * 0.6
    }

    private var smallUnitFontSize: CGFloat {
        fontSize * 0.4
    }

    var body: some View {
        ZStack {
            if isFocused {
                focusedContent
            } else {
                unfocusedContent
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .background(LiftosaurColor.backgroundNeutral)
        .cornerRadius(6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(borderColor, lineWidth: 2)
        )
        .overlay(alignment: .bottomTrailing) {
            if let rpe = completedRpe {
                RpeBadge(rpe: rpe)
                    .offset(x: 4, y: 6)
            }
        }
        .onTapGesture {
            onTap()
        }
    }

    private var focusedContent: some View {
        VStack(spacing: -2) {
            if showPlaceholder {
                Text(" ")
                    .font(.system(size: smallFontSize, weight: .medium))
                Text("-")
                    .font(.system(size: fontSize, weight: .medium))
                    .foregroundColor(textColor)
                Text(" ")
                    .font(.system(size: smallFontSize, weight: .medium))
            } else {
                if let prev = prevValue {
                    HStack(spacing: 1) {
                        Text(formatWeight(prev))
                            .font(.system(size: smallFontSize, weight: .medium))
                        Text(unit)
                            .font(.system(size: smallUnitFontSize))
                    }
                    .foregroundColor(LiftosaurColor.textSecondary.opacity(0.4))
                } else {
                    Text(" ")
                        .font(.system(size: smallFontSize, weight: .medium))
                }

                HStack(spacing: 1) {
                    Text(formatWeight(value))
                        .font(.system(size: fontSize, weight: .medium))
                    Text(unit)
                        .font(.system(size: unitFontSize))
                }
                .foregroundColor(textColor)

                if let next = nextValue {
                    HStack(spacing: 1) {
                        Text(formatWeight(next))
                            .font(.system(size: smallFontSize, weight: .medium))
                        Text(unit)
                            .font(.system(size: smallUnitFontSize))
                    }
                    .foregroundColor(LiftosaurColor.textSecondary.opacity(0.4))
                } else {
                    Text(" ")
                        .font(.system(size: smallFontSize, weight: .medium))
                }
            }
        }
    }

    private var unfocusedContent: some View {
        HStack(spacing: 1) {
            if showPlaceholder {
                Text("-")
                    .font(.system(size: fontSize, weight: .medium))
            } else {
                Text(formatWeight(value))
                    .font(.system(size: fontSize, weight: .medium))
                Text(unit)
                    .font(.system(size: unitFontSize))
                if !isModified, let s = suffix {
                    Text(s)
                        .font(.system(size: fontSize, weight: .medium))
                }
            }
        }
        .foregroundColor(textColor)
    }

    private func formatWeight(_ val: Double) -> String {
        SetFormatters.formatNumber(val)
    }
}

// MARK: - RPE Badge

struct RpeBadge: View {
    let rpe: Double

    private var rpeText: String {
        "@\(SetFormatters.formatNumber(rpe))"
    }

    var body: some View {
        Text(rpeText)
            .font(.system(size: 9, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
            .background(LiftosaurColor.buttonPrimaryBackground)
            .clipShape(Capsule())
    }
}

// MARK: - Previews

#Preview("Int Field - Inactive") {
    ScrollableIntField(
        value: .constant(5),
        initialValue: 5,
        isFocused: false,
        minValue: 0,
        maxValue: 999,
        step: 1,
        onTap: {}
    )
    .padding()
}

#Preview("Int Field - Active") {
    ScrollableIntField(
        value: .constant(5),
        initialValue: 5,
        isFocused: true,
        minValue: 0,
        maxValue: 999,
        step: 1,
        onTap: {}
    )
    .padding()
}

#Preview("Weight Field - Inactive") {
    ScrollableWeightField(
        value: .constant(45),
        weightIndex: .constant(1),
        initialValue: 45,
        unit: "lb",
        isFocused: false,
        validWeights: [42.5, 45, 47.5, 50],
        onTap: {}
    )
    .padding()
}

#Preview("Weight Field - Active") {
    ScrollableWeightField(
        value: .constant(45),
        weightIndex: .constant(1),
        initialValue: 45,
        unit: "lb",
        isFocused: true,
        validWeights: [42.5, 45, 47.5, 50],
        onTap: {}
    )
    .padding()
}

