//
//  Logger+Extension.swift
//  Shared logging for iOS and watchOS
//

import Foundation
import OSLog

// MARK: - Build Configuration

// Set to true to enable remote log streaming to server
// Change this for debug builds when you need remote logging
#if DEBUG
let remoteLoggingEnabled = false
#else
let remoteLoggingEnabled = false
#endif

// MARK: - Device Tag

private let deviceTag: String = {
    #if os(watchOS)
    return "WATCH"
    #else
    return "PHONE"
    #endif
}()

// MARK: - Log File Manager

class LogFileManager {
    static let shared = LogFileManager()

    private let logFileName = "liftosaur.log"
    private let maxLogSize = 1024 * 1024
    private var fileHandle: FileHandle?
    private let queue = DispatchQueue(label: "com.liftosaur.logfile", qos: .utility)

    var logFileURL: URL? {
        guard let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return nil
        }
        return documentsURL.appendingPathComponent(logFileName)
    }

    private init() {
        setupLogFile()
    }

    private func setupLogFile() {
        guard let logURL = logFileURL else { return }

        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }

        do {
            fileHandle = try FileHandle(forWritingTo: logURL)
            fileHandle?.seekToEndOfFile()
        } catch {
            print("Failed to open log file: \(error)")
        }
    }

    func write(_ message: String) {
        queue.async { [weak self] in
            guard let self = self,
                  let handle = self.fileHandle,
                  let data = (message + "\n").data(using: .utf8) else {
                return
            }

            handle.write(data)

            self.rotateLogIfNeeded()
        }
    }

    private func rotateLogIfNeeded() {
        guard let logURL = logFileURL,
              let attributes = try? FileManager.default.attributesOfItem(atPath: logURL.path),
              let fileSize = attributes[.size] as? Int,
              fileSize > maxLogSize else {
            return
        }

        fileHandle?.closeFile()

        try? FileManager.default.removeItem(at: logURL)
        FileManager.default.createFile(atPath: logURL.path, contents: nil)

        setupLogFile()
    }

    func readLogs() -> String {
        queue.sync {
            fileHandle?.synchronizeFile()
        }
        guard let logURL = logFileURL,
              let data = try? Data(contentsOf: logURL),
              let content = String(data: data, encoding: .utf8) else {
            return ""
        }
        return content
    }

    /// Reads only the last `maxBytes` of the log file. Used in memory-sensitive
    /// paths (e.g. crash reporting on watchOS) where loading the full 1MB log
    /// would create excessive transient memory pressure.
    func readLogsTail(maxBytes: Int) -> String {
        queue.sync {
            fileHandle?.synchronizeFile()
        }
        guard let logURL = logFileURL else { return "" }
        let path = logURL.path

        guard let attributes = try? FileManager.default.attributesOfItem(atPath: path),
              let fileSize = (attributes[.size] as? NSNumber)?.intValue else {
            return ""
        }

        let offset = max(0, fileSize - maxBytes)

        guard let handle = try? FileHandle(forReadingFrom: logURL) else {
            return ""
        }
        defer { try? handle.close() }

        do {
            try handle.seek(toOffset: UInt64(offset))
        } catch {
            return ""
        }

        let data: Data
        if #available(watchOS 7.0, iOS 13.4, *) {
            data = (try? handle.read(upToCount: maxBytes)) ?? Data()
        } else {
            data = handle.readDataToEndOfFile()
        }

        // If we seeked into the middle of a UTF-8 sequence, drop bytes until
        // the first newline so we start on a line boundary.
        let trimmed: Data
        if offset > 0, let nl = data.firstIndex(of: 0x0A) {
            trimmed = data.subdata(in: (nl + 1)..<data.count)
        } else {
            trimmed = data
        }

        return String(data: trimmed, encoding: .utf8) ?? ""
    }

    deinit {
        fileHandle?.closeFile()
    }
}

// MARK: - Sync Log File Manager (shared /tmp file for simulator debugging)

class SyncLogFileManager {
    static let shared = SyncLogFileManager()

    private let logFileName = "liftosaur-sync.log"
    private let maxLogSize = 2 * 1024 * 1024  // 2MB
    private let queue = DispatchQueue(label: "com.liftosaur.synclogfile", qos: .utility)

    var logFileURL: URL? {
        #if targetEnvironment(simulator)
        // On simulator, write to /tmp for easy access and sharing between phone/watch
        return URL(fileURLWithPath: "/tmp/\(logFileName)")
        #else
        // On device, write to Documents directory
        guard let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return nil
        }
        return documentsURL.appendingPathComponent(logFileName)
        #endif
    }

    private init() {
        // Ensure file exists
        if let logURL = logFileURL, !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
    }

    func write(_ message: String) {
        queue.async { [weak self] in
            guard let self = self,
                  let logURL = self.logFileURL,
                  let data = (message + "\n").data(using: .utf8) else {
                return
            }

            // Open, append, close for each write - allows concurrent access from phone/watch
            do {
                let handle = try FileHandle(forWritingTo: logURL)
                handle.seekToEndOfFile()
                handle.write(data)
                try handle.synchronize()
                try handle.close()
            } catch {
                print("SyncLog: Failed to write: \(error)")
            }

            self.rotateLogIfNeeded()
        }
    }

    private func rotateLogIfNeeded() {
        guard let logURL = logFileURL,
              let attributes = try? FileManager.default.attributesOfItem(atPath: logURL.path),
              let fileSize = attributes[.size] as? Int,
              fileSize > maxLogSize else {
            return
        }

        // Keep backup of previous log
        let backupURL = logURL.deletingLastPathComponent().appendingPathComponent("liftosaur-sync.log.old")
        try? FileManager.default.removeItem(at: backupURL)
        try? FileManager.default.moveItem(at: logURL, to: backupURL)

        FileManager.default.createFile(atPath: logURL.path, contents: nil)
    }
}

// MARK: - Remote Log Manager

class RemoteLogManager {
    static let shared = RemoteLogManager()

    private let queue = DispatchQueue(label: "com.liftosaur.remotelog", qos: .utility)

    private init() {}

    func log(_ message: String) {
        guard remoteLoggingEnabled else { return }

        queue.async {
            var components = URLComponents(url: baseApiUrl, resolvingAgainstBaseURL: false)!
            components.path = "/api/debuglogs"
            guard let url = components.url else { return }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = 5

            let body: [String: Any] = [
                "log": message,
                "device": deviceTag,
                "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
            ]

            guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else {
                return
            }
            request.httpBody = bodyData

            URLSession.shared.dataTask(with: request) { _, _, _ in
                // Fire and forget
            }.resume()
        }
    }
}

// MARK: - Dual Logger

struct DualLogger {
    private let logger: Logger
    private let category: String
    private let isSyncCategory: Bool
    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        return formatter
    }()

    init(subsystem: String, category: String, isSyncCategory: Bool = false) {
        self.logger = Logger(subsystem: subsystem, category: category)
        self.category = category
        self.isSyncCategory = isSyncCategory
    }

    private func timestamp() -> String {
        return dateFormatter.string(from: Date())
    }

    private func logToFile(level: String, message: String) {
        let logMessage = "[\(timestamp())] [\(deviceTag)] [\(level)] \(message)"
        LogFileManager.shared.write(logMessage)
    }

    private func logToSyncFile(level: String, message: String) {
        let logMessage = "[\(timestamp())] [\(deviceTag)] [\(category)] [\(level)] \(message)"
        SyncLogFileManager.shared.write(logMessage)
    }

    private func logToRemote(level: String, message: String) {
        let logMessage = "[\(timestamp())] [\(deviceTag)] [\(category)] [\(level)] \(message)"
        RemoteLogManager.shared.log(logMessage)
    }

    func debug(_ message: String) {
        logger.debug("[\(deviceTag)] [DEBUG] \(message)")
        logToFile(level: "DEBUG", message: message)
        if isSyncCategory {
            logToSyncFile(level: "DEBUG", message: message)
            logToRemote(level: "DEBUG", message: message)
        }
    }

    func info(_ message: String) {
        logger.info("[\(deviceTag)] [INFO] \(message)")
        logToFile(level: "INFO", message: message)
        if isSyncCategory {
            logToSyncFile(level: "INFO", message: message)
            logToRemote(level: "INFO", message: message)
        }
    }

    func warning(_ message: String) {
        logger.warning("[\(deviceTag)] [WARNING] \(message)")
        logToFile(level: "WARNING", message: message)
        if isSyncCategory {
            logToSyncFile(level: "WARNING", message: message)
            logToRemote(level: "WARNING", message: message)
        }
    }

    func error(_ message: String) {
        logger.error("[\(deviceTag)] [ERROR] \(message)")
        logToFile(level: "ERROR", message: message)
        if isSyncCategory {
            logToSyncFile(level: "ERROR", message: message)
            logToRemote(level: "ERROR", message: message)
        }
    }

    func fault(_ message: String) {
        logger.fault("[\(deviceTag)] [FAULT] \(message)")
        logToFile(level: "FAULT", message: message)
        if isSyncCategory {
            logToSyncFile(level: "FAULT", message: message)
            logToRemote(level: "FAULT", message: message)
        }
    }
}

// MARK: - Logger Extension

extension Logger {
    private static let subsystem = Bundle.main.bundleIdentifier ?? "com.liftosaur.www"

    // Existing categories (iOS-only, not sync-related)
    static let general = DualLogger(subsystem: subsystem, category: "general")
    static let webView = DualLogger(subsystem: subsystem, category: "webview")
    static let health = DualLogger(subsystem: subsystem, category: "health")
    static let network = DualLogger(subsystem: subsystem, category: "network")
    static let purchases = DualLogger(subsystem: subsystem, category: "purchases")
    static let notifications = DualLogger(subsystem: subsystem, category: "notifications")
    static let liveActivity = DualLogger(subsystem: subsystem, category: "liveactivity")

    // Sync-related categories (write to shared sync log file)
    static let wc = DualLogger(subsystem: subsystem, category: "wc", isSyncCategory: true)
    static let sync = DualLogger(subsystem: subsystem, category: "sync", isSyncCategory: true)
    static let auth = DualLogger(subsystem: subsystem, category: "auth", isSyncCategory: true)
    static let workout = DualLogger(subsystem: subsystem, category: "workout", isSyncCategory: true)
    static let storage = DualLogger(subsystem: subsystem, category: "storage", isSyncCategory: true)
    static let engine = DualLogger(subsystem: subsystem, category: "engine", isSyncCategory: true)
    static let mirroring = DualLogger(subsystem: subsystem, category: "mirroring", isSyncCategory: true)
}
