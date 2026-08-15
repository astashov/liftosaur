//
//  WatchCacheManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import OSLog

/// Resolves which JS bundle the engine should run: the one shipped inside the app, or a newer
/// one delivered over the air. Downloads go through the same signed, hash-verified expo-updates
/// path the phone uses (`LftUpdater`); this type only owns the watch-specific policy around it.
class WatchCacheManager {
    static let shared = WatchCacheManager()

    private let updater = LftUpdater.watch
    private let paths = LftUpdaterPath.watch
    private var fetchTask: Task<(Bool, Bool), Never>?
    private static let lastFetchTimeKey = "lastWatchBundleFetchTime"
    private static let fetchIntervalSeconds: TimeInterval = 24 * 60 * 60  // 1 day
    private let minValidBundleBytes = 1000

    var lastBundleFetchTime: Date? {
        get { UserDefaults.standard.object(forKey: WatchCacheManager.lastFetchTimeKey) as? Date }
        set { UserDefaults.standard.set(newValue, forKey: WatchCacheManager.lastFetchTimeKey) }
    }

    var shouldFetchBundle: Bool {
        guard let lastFetch = lastBundleFetchTime else { return true }
        return Date().timeIntervalSince(lastFetch) > WatchCacheManager.fetchIntervalSeconds
    }

    // MARK: Public methods

    /// Returns (success, needsUpdate) - needsUpdate is true if a new bundle became active
    func fetchAndCacheBundle() async -> (success: Bool, needsUpdate: Bool) {
        if let existing = fetchTask {
            return await existing.value
        }

        let task = Task { () -> (Bool, Bool) in
            defer { fetchTask = nil }
            let outcome = await updater.checkAndDownload()
            if outcome.success {
                lastBundleFetchTime = Date()
            }
            return (outcome.success, outcome.didUpdate)
        }
        fetchTask = task
        return await task.value
    }

    /// Drops any over-the-air bundle and falls back to the one shipped in the app. Unlike the
    /// old cache-clearing behaviour this always leaves a runnable bundle behind, so recovery
    /// no longer depends on the watch having a network connection.
    func clearCache() {
        paths.revertToEmbedded()
    }

    func loadBundle() -> String? {
        guard let url = validatedBundleURL() else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }

    func hasBundleAvailable() -> Bool {
        validatedBundleURL() != nil
    }

    // MARK: Private methods

    /// Picks the effective bundle and sanity-checks it. A corrupt OTA bundle demotes us to the
    /// embedded one rather than leaving the engine with nothing to run.
    private func validatedBundleURL() -> URL? {
        guard let url = paths.effectiveBundleURL() else {
            Logger.engine.error("No watch bundle available (embedded resource missing?)")
            return nil
        }
        if bundleAtPathIsValid(url) {
            return url
        }
        Logger.engine.error("Bundle at \(url.lastPathComponent) failed validation")
        if url == paths.activeBundleURL {
            paths.revertToEmbedded()
            if let embedded = paths.embeddedBundleURL, bundleAtPathIsValid(embedded) {
                return embedded
            }
        }
        return nil
    }

    /// Size plus the `/* LFTEND */` trailer webpack appends to every emitted asset. Checking the
    /// trailer catches truncation, which a size threshold alone cannot. We deliberately avoid
    /// loading the file as a Swift String here — that allocation contributed to jetsam during
    /// cold launch on Apple Watch SE.
    private func bundleAtPathIsValid(_ url: URL) -> Bool {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
              let size = (attrs[.size] as? NSNumber)?.intValue,
              size > minValidBundleBytes else {
            return false
        }
        guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
        defer { try? handle.close() }
        guard (try? handle.seek(toOffset: UInt64(max(0, size - 32)))) != nil,
              let tail = try? handle.readToEnd(),
              let tailString = String(data: tail, encoding: .utf8) else {
            return false
        }
        return tailString.contains("LFTEND")
    }
}
