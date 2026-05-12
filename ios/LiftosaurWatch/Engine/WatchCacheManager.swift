//
//  WatchCacheManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import OSLog

class WatchCacheManager {
    static let shared = WatchCacheManager()

    private let cacheDirectory: URL
    private let bundleFileName = "watch-bundle.js"
    private var fetchTask: Task<(Bool, Bool), Never>?
    private static let lastFetchTimeKey = "lastWatchBundleFetchTime"
    private static let bundleVersionKey = "cachedWatchBundleVersion"
    private static let fetchIntervalSeconds: TimeInterval = 24 * 60 * 60  // 1 day

    var currentBundleVersion: Int {
        get { UserDefaults.standard.integer(forKey: WatchCacheManager.bundleVersionKey) }
        set { UserDefaults.standard.set(newValue, forKey: WatchCacheManager.bundleVersionKey) }
    }

    var lastBundleFetchTime: Date? {
        get { UserDefaults.standard.object(forKey: WatchCacheManager.lastFetchTimeKey) as? Date }
        set { UserDefaults.standard.set(newValue, forKey: WatchCacheManager.lastFetchTimeKey) }
    }

    var shouldFetchBundle: Bool {
        guard let lastFetch = lastBundleFetchTime else { return true }
        return Date().timeIntervalSince(lastFetch) > WatchCacheManager.fetchIntervalSeconds
    }
    private var bundleUrl: String {
        var components = URLComponents(url: baseUrl, resolvingAgainstBaseURL: false)!
        components.scheme = "https"
        let port = components.port.map { ":\($0)" } ?? ""
        return "\(components.scheme!)://\(components.host!)\(port)/static/\(bundleFileName)"
    }

    init() {
        cacheDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
            .first!
            .appendingPathComponent("watchCache")
        try? FileManager.default.createDirectory(
            at: cacheDirectory, withIntermediateDirectories: true, attributes: nil)
    }
    
    // MARK: Public methods

    /// Returns (success, needsUpdate) - needsUpdate is true if bundle version changed
    func fetchAndCacheBundle() async -> (success: Bool, needsUpdate: Bool) {
        if let existing = fetchTask {
            return await existing.value
        }

        let task = Task { () -> (Bool, Bool) in
            defer { fetchTask = nil }
            return await doFetchAndCacheBundle()
        }
        fetchTask = task
        return await task.value
    }

    private func doFetchAndCacheBundle() async -> (success: Bool, needsUpdate: Bool) {
        guard let url = URL(string: bundleUrl) else { return (false, false) }

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10.0
        config.timeoutIntervalForResource = 30.0
        config.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData

        let session = URLSession(configuration: config)
        defer { session.finishTasksAndInvalidate() }

        do {
            // Stream the response straight to disk via URLSessionDownloadTask.
            // Avoids buffering the full ~430KB bundle as Data — that buffer
            // was causing jetsam during cold launch on Apple Watch SE.
            // (Wrapped in a continuation because the async overload of
            // download(from:) requires iOS 15+ / watchOS 8+ but the iOS
            // deployment target is currently 12.0.)
            let (tempURL, response): (URL, URLResponse) = try await withCheckedThrowingContinuation { continuation in
                let task = session.downloadTask(with: url) { tempURL, response, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let tempURL = tempURL, let response = response {
                        // The temp file is deleted when the completion handler
                        // returns — move it somewhere stable now.
                        let stableURL = FileManager.default.temporaryDirectory
                            .appendingPathComponent("watch-bundle-\(UUID().uuidString).js")
                        do {
                            try FileManager.default.moveItem(at: tempURL, to: stableURL)
                            continuation.resume(returning: (stableURL, response))
                        } catch {
                            continuation.resume(throwing: error)
                        }
                    } else {
                        continuation.resume(throwing: URLError(.unknown))
                    }
                }
                task.resume()
            }
            defer { try? FileManager.default.removeItem(at: tempURL) }

            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                Logger.engine.error("Failed to fetch watch bundle: HTTP \((response as? HTTPURLResponse)?.statusCode ?? -1)")
                return (false, false)
            }

            guard bundleAtPathIsValid(tempURL) else {
                Logger.engine.error("Fetched bundle is invalid (truncated, HTML, or missing IIFE markers)")
                return (false, false)
            }

            // Extract version from the temp file via mmap-backed Data so we
            // never page the full ~430KB into the process. This is what tells
            // both call sites of fetchAndCacheBundle whether to silently
            // re-init the engine.
            let newVersion = extractBundleVersion(from: tempURL)

            let downloadedSize = (try? FileManager.default
                .attributesOfItem(atPath: tempURL.path)[.size] as? NSNumber)?.intValue ?? 0
            try? FileManager.default.removeItem(at: cachedBundlePath)
            try FileManager.default.moveItem(at: tempURL, to: cachedBundlePath)
            Logger.engine.info("Successfully cached watch bundle (\(downloadedSize) bytes)")

            lastBundleFetchTime = Date()

            var needsUpdate = false
            if let newVersion = newVersion {
                let oldVersion = currentBundleVersion
                needsUpdate = oldVersion != 0 && oldVersion != newVersion
                if needsUpdate {
                    Logger.engine.info("Watch bundle version changed: \(oldVersion) → \(newVersion)")
                }
                currentBundleVersion = newVersion
            }
            return (true, needsUpdate)
        } catch {
            Logger.engine.error("Failed to fetch watch bundle: \(error)")
            return (false, false)
        }
    }

    func clearCache() {
        try? FileManager.default.removeItem(at: cachedBundlePath)
    }
    
    func loadBundle() -> String? {
        guard cachedBundleIsValid() else { return nil }
        return try? String(contentsOf: cachedBundlePath, encoding: .utf8)
    }

    func hasBundleAvailable() -> Bool {
        cachedBundleIsValid()
    }

    private func cachedBundleIsValid() -> Bool {
        bundleAtPathIsValid(cachedBundlePath)
    }

    /// File-size check only — content validation will be added later via an
    /// embedded marker once the build pipeline injects one. We deliberately
    /// avoid loading any of the file as a Swift String here because the
    /// full-bundle String allocation contributed to jetsam pressure during
    /// cold launch on Apple Watch SE.
    private func bundleAtPathIsValid(_ url: URL) -> Bool {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
              let size = (attrs[.size] as? NSNumber)?.intValue else {
            return false
        }
        return size > minValidBundleBytes
    }

    private let minValidBundleBytes = 1000

    /// Locate `BUNDLE_VERSION_WATCH_IOS = <int>` in a JS bundle file without
    /// loading the whole thing into the process. `Data(contentsOf:options:.mappedIfSafe)`
    /// asks the kernel to mmap the file; pages are paged in only when accessed
    /// by the linear `range(of:)` scan, then evicted under pressure. We then
    /// allocate a tiny String from just the ~32 bytes after the marker to run
    /// the digit regex.
    private func extractBundleVersion(from url: URL) -> Int? {
        guard let data = try? Data(contentsOf: url, options: .mappedIfSafe) else {
            return nil
        }
        let marker = Data("BUNDLE_VERSION_WATCH_IOS".utf8)
        guard let markerRange = data.range(of: marker) else {
            return nil
        }

        let scanStart = markerRange.upperBound
        let scanEnd = min(scanStart + 32, data.count)
        guard scanStart < scanEnd else { return nil }
        let window = data.subdata(in: scanStart..<scanEnd)
        guard let str = String(data: window, encoding: .utf8) else { return nil }

        let pattern = "^\\s*=\\s*(\\d+)"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []),
              let match = regex.firstMatch(
                in: str, options: [],
                range: NSRange(location: 0, length: str.utf16.count)),
              let range = Range(match.range(at: 1), in: str),
              let version = Int(str[range]) else {
            return nil
        }
        return version
    }

    // MARK: Private methods

    private var cachedBundlePath: URL {
        cacheDirectory.appendingPathComponent(bundleFileName)
    }
}
