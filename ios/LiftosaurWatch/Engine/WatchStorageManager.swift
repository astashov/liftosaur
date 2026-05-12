//
//  WatchStorageManager.swift
//  LiftosaurWatch Watch App
//
//  File-based storage for large JSON data (UserDefaults has 1MB limit on watchOS)
//

import Foundation
import OSLog

class WatchStorageManager {
    static let shared = WatchStorageManager()

    private let fileManager = FileManager.default

    private var documentsDirectory: URL? {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask).first
    }

    private func fileURL(for key: String) -> URL? {
        documentsDirectory?.appendingPathComponent("\(key).json")
    }

    func saveString(_ value: String, forKey key: String) {
        guard let url = fileURL(for: key),
              let data = value.data(using: .utf8) else {
            Logger.storage.error("Failed to save string for key: \(key)")
            return
        }

        do {
            try data.write(to: url, options: .atomic)
            Logger.storage.debug("Saved \(data.count) bytes to \(key)")
        } catch {
            Logger.storage.error("Failed to write file for key \(key): \(error.localizedDescription)")
        }
    }

    func loadString(forKey key: String) -> String? {
        guard let url = fileURL(for: key),
              fileManager.fileExists(atPath: url.path) else {
            return nil
        }

        do {
            let data = try Data(contentsOf: url)
            return String(data: data, encoding: .utf8)
        } catch {
            Logger.storage.error("Failed to read file for key \(key): \(error.localizedDescription)")
            return nil
        }
    }

    func saveData(_ data: Data, forKey key: String) {
        guard let url = fileURL(for: key) else {
            Logger.storage.error("Failed to get URL for key: \(key)")
            return
        }

        do {
            try data.write(to: url, options: .atomic)
            Logger.storage.debug("Saved \(data.count) bytes to \(key)")
        } catch {
            Logger.storage.error("Failed to write data for key \(key): \(error.localizedDescription)")
        }
    }

    func loadData(forKey key: String) -> Data? {
        guard let url = fileURL(for: key),
              fileManager.fileExists(atPath: url.path) else {
            return nil
        }

        do {
            return try Data(contentsOf: url)
        } catch {
            Logger.storage.error("Failed to read data for key \(key): \(error.localizedDescription)")
            return nil
        }
    }

    func removeValue(forKey key: String) {
        guard let url = fileURL(for: key),
              fileManager.fileExists(atPath: url.path) else {
            return
        }

        do {
            try fileManager.removeItem(at: url)
            Logger.storage.debug("Removed file for key: \(key)")
        } catch {
            Logger.storage.error("Failed to remove file for key \(key): \(error.localizedDescription)")
        }
    }
}
