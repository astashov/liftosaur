//
//  LiftosaurWatchApp.swift
//  LiftosaurWatch Watch App
//
//  Created by Anton Astashov on 1/3/26.
//

import SwiftUI
import WatchKit
import HealthKit
import OSLog
import WidgetKit

/// Handles incoming workout configurations from the paired iPhone
class WorkoutConfigurationHandler: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        Logger.mirroring.info("Watch app did finish launching")
        WatchCrashReporter.shared.writeBreadcrumb("app_did_finish_launching")
        WidgetCenter.shared.reloadAllTimelines()
    }

    func applicationDidBecomeActive() {
        Logger.mirroring.info("Watch app did become active")

        // Check if bundle needs refresh (>1 day since last fetch)
        if WatchCacheManager.shared.shouldFetchBundle {
            Task {
                let result = await WatchCacheManager.shared.fetchAndCacheBundle()
                if result.needsUpdate {
                    Logger.mirroring.info("Watch bundle updated, silently reinitializing engine")
                    await WorkoutManager.shared.initialize()
                }
            }
        }
    }

    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        Logger.mirroring.info("Received workout configuration from iPhone: \(workoutConfiguration.activityType.rawValue)")

        Task { @MainActor in
            // Start a workout session based on the configuration from the phone
            await HealthKitManager.shared.startWorkoutSessionFromPhone(configuration: workoutConfiguration)
        }
    }
}

@main
struct LiftosaurWatch_Watch_AppApp: App {
    @WKApplicationDelegateAdaptor(WorkoutConfigurationHandler.self) var appDelegate
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @StateObject private var syncManager = WatchSyncManager.shared

    init() {
        WatchCrashReporter.shared.installExceptionHandler()
        WatchCrashReporter.shared.checkAndReportPreviousCrash()

        Task {
            _ = await HealthKitManager.shared.requestAuthorizationIfNeeded()
        }
    }

    var body: some Scene {
        WindowGroup {
            GeometryReader { geometry in
                let topSafeArea = geometry.safeAreaInsets.top
                let screenWidth = geometry.size.width + geometry.safeAreaInsets.leading + geometry.safeAreaInsets.trailing
                // Sync indicator: vertically centered in navbar, right of back button
                // Back button is circular with diameter ≈ navbar height
                let indicatorTop = topSafeArea * 0.65 - 6  // Position indicator at 40% down from top
                let indicatorLeading = topSafeArea + 4    // navbar height + small gap

                ContentView()
                    .environmentObject(connectivityManager)
                    .environment(\.navbarHeight, topSafeArea)  // Pass navbar height to all child views
                    .environment(\.screenWidth, screenWidth)   // Pass screen width to all child views
                    .overlay(alignment: .topLeading) {
                        SyncIndicatorView(status: syncManager.syncStatus)
                            .padding(.top, indicatorTop - topSafeArea)
                            .padding(.leading, indicatorLeading)
                    }
            }
        }
    }
}
