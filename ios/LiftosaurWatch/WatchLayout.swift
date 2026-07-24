//
//  WatchLayout.swift
//  LiftosaurWatch Watch App
//
//  Provides the navbar height (top safe area) as an environment value.
//  This must be captured at the App level before NavigationStack consumes it.
//
//  Key positioning formulas:
//  - Heart rate (under clock): top = navbarHeight - 8
//  - Rest timer (centered in navbar): top = (navbarHeight - elementHeight) / 2
//  - Sync indicator (right of back button): leading = navbarHeight + 4
//  - Content start: top = navbarHeight + 8
//

import SwiftUI

// MARK: - Environment Key for Navbar Height

private struct NavbarHeightKey: EnvironmentKey {
    static let defaultValue: CGFloat = 40  // Reasonable default
}

private struct ScreenWidthKey: EnvironmentKey {
    static let defaultValue: CGFloat = 180  // Reasonable default
}

extension EnvironmentValues {
    var navbarHeight: CGFloat {
        get { self[NavbarHeightKey.self] }
        set { self[NavbarHeightKey.self] = newValue }
    }

    var screenWidth: CGFloat {
        get { self[ScreenWidthKey.self] }
        set { self[ScreenWidthKey.self] = newValue }
    }
}
