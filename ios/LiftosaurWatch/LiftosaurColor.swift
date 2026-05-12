//
//  LiftosaurColor.swift
//  LiftosaurWatch Watch App
//
//  Semantic colors mapped from tailwind.semantic.json / tailwind.colors.json
//

import SwiftUI

enum LiftosaurColor {
    // MARK: - Hex Helper

    private static func hex(_ value: String) -> Color {
        let hex = value.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        return Color(
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255
        )
    }

    // MARK: - Base Colors (from tailwind.colors.json)

    static let purple500 = hex("#8356F6")
    static let purple400 = hex("#A48BFA")
    static let purple300 = hex("#CCC1F9")

    static let darkgray950 = hex("#0C0819")
    static let darkgray900 = hex("#252034")
    static let darkgray800 = hex("#332D42")
    static let darkgray700 = hex("#393248")
    static let darkgray600 = hex("#453D58")

    static let lightgray300 = hex("#A4B0BC")
    static let lightgray500 = hex("#607284")
    static let lightgray700 = hex("#3C5063")

    static let green500 = hex("#06C383")
    static let green400 = hex("#2BDC9B")

    static let red500 = hex("#FF543E")
    static let red400 = hex("#FF8066")

    static let yellow600 = hex("#DD8E02")
    static let yellow400 = hex("#FFD820")

    // MARK: - Semantic Colors (Dark Mode - Watch always uses dark)

    // Backgrounds
    static let backgroundDefault = Color.black
    static let backgroundSubtle = darkgray950
    static let backgroundNeutral = darkgray900
    static let backgroundCard = darkgray900
    static let backgroundCardSelected = darkgray600
    static let backgroundSet = darkgray800
    static let backgroundSetActive = darkgray600

    // Text
    static let textPrimary = Color.white
    static let textSecondary = lightgray300
    static let textDisabled = lightgray500
    static let textSuccess = green400
    static let textError = red400

    // Buttons
    static let buttonPrimaryBackground = purple500
    static let buttonPrimaryLabel = Color.white
    static let buttonSecondaryBackground = darkgray700

    // Icons
    static let iconNeutral = lightgray300
    static let iconGreen = green400
    static let iconRed = red400
    static let iconPurple = purple400

    // Borders
    static let borderNeutral = lightgray700
    static let borderCard = darkgray800
}
