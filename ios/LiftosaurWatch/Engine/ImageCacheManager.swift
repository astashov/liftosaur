//
//  ImageCacheManager.swift
//  LiftosaurWatch Watch App
//

import Foundation
import SwiftUI
import WatchKit
import OSLog

class ImageCacheManager {
    static let shared = ImageCacheManager()

    private let cacheDirectory: URL
    private let fileManager = FileManager.default

    init() {
        cacheDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask)
            .first!
            .appendingPathComponent("imageCache")
        try? fileManager.createDirectory(
            at: cacheDirectory, withIntermediateDirectories: true, attributes: nil)
    }

    // MARK: - Public Methods

    /// Load image from disk cache
    func loadImage(for relativePath: String) -> Image? {
        let filePath = cacheFilePath(for: relativePath)
        guard fileManager.fileExists(atPath: filePath.path),
              let data = try? Data(contentsOf: filePath),
              let uiImage = UIImage(data: data) else {
            return nil
        }
        return Image(uiImage: uiImage)
    }

    /// Check if image exists in cache
    func hasImage(for relativePath: String) -> Bool {
        let filePath = cacheFilePath(for: relativePath)
        return fileManager.fileExists(atPath: filePath.path)
    }

    /// Fetch image from network and cache to disk
    func fetchAndCacheImage(relativePath: String, baseUrl: URL) async -> Image? {
        let fullUrl = baseUrl.appendingPathComponent(relativePath)

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 10.0
        config.timeoutIntervalForResource = 15.0

        let session = URLSession(configuration: config)
        defer { session.finishTasksAndInvalidate() }

        do {
            let (data, response) = try await session.data(from: fullUrl)
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                Logger.engine.debug("Failed to fetch image: HTTP \((response as? HTTPURLResponse)?.statusCode ?? -1)")
                return nil
            }

            guard let uiImage = UIImage(data: data) else {
                Logger.engine.debug("Invalid image data from \(relativePath)")
                return nil
            }

            // Cache to disk
            let filePath = cacheFilePath(for: relativePath)
            try? fileManager.createDirectory(
                at: filePath.deletingLastPathComponent(),
                withIntermediateDirectories: true,
                attributes: nil
            )
            try? data.write(to: filePath)
            Logger.engine.debug("Cached image: \(relativePath) (\(data.count) bytes)")

            return Image(uiImage: uiImage)
        } catch {
            Logger.engine.debug("Failed to fetch image \(relativePath): \(error.localizedDescription)")
            return nil
        }
    }

    /// Clear all cached images
    func clearCache() {
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(
            at: cacheDirectory, withIntermediateDirectories: true, attributes: nil)
        Logger.engine.info("Image cache cleared")
    }

    /// Get cache size in bytes
    func cacheSize() -> Int64 {
        guard let enumerator = fileManager.enumerator(
            at: cacheDirectory,
            includingPropertiesForKeys: [.fileSizeKey],
            options: [.skipsHiddenFiles]
        ) else { return 0 }

        var totalSize: Int64 = 0
        for case let fileURL as URL in enumerator {
            if let size = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                totalSize += Int64(size)
            }
        }
        return totalSize
    }

    // MARK: - Private Methods

    private func cacheFilePath(for relativePath: String) -> URL {
        // Sanitize the path to create a valid filename
        // e.g., "/externalimages/exercises/single/small/benchpress_barbell_single_small.png"
        // becomes "externalimages_exercises_single_small_benchpress_barbell_single_small.png"
        let sanitized = relativePath
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .replacingOccurrences(of: "/", with: "_")
        return cacheDirectory.appendingPathComponent(sanitized)
    }
}
