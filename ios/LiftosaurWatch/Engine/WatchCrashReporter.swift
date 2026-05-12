//
//  WatchCrashReporter.swift
//  LiftosaurWatch Watch App
//

import Foundation
import WatchKit
import OSLog
import os
import QuickJSCore

private func uncaughtExceptionHandler(_ exception: NSException) {
    WatchCrashReporter.shared.handleException(exception)
}

class WatchCrashReporter {
    static let shared = WatchCrashReporter()

    private let breadcrumbFileName = "crash_breadcrumbs.txt"
    private let crashInfoFileName = "crash_info.txt"
    private var breadcrumbHandle: FileHandle?
    private var memoryPressureSource: DispatchSourceMemoryPressure?

    private var breadcrumbURL: URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
            .appendingPathComponent(breadcrumbFileName)
    }

    private var crashInfoURL: URL? {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
            .appendingPathComponent(crashInfoFileName)
    }

    private init() {
        let source = DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical], queue: .main)
        source.setEventHandler { [weak self] in
            self?.handleMemoryWarning()
        }
        source.resume()
        memoryPressureSource = source
    }

    // MARK: - Public API

    func installExceptionHandler() {
        NSSetUncaughtExceptionHandler(uncaughtExceptionHandler)
    }

    func checkAndReportPreviousCrash() {
        guard let breadcrumbURL = breadcrumbURL else { return }

        let breadcrumbs = (try? String(contentsOf: breadcrumbURL, encoding: .utf8)) ?? ""
        let lastBreadcrumb = breadcrumbs
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: "\n")
            .last ?? ""

        var crashType = "jetsam_or_unknown"
        var exceptionInfo = ""
        if let crashInfoURL = crashInfoURL,
           let info = try? String(contentsOf: crashInfoURL, encoding: .utf8), !info.isEmpty {
            crashType = "exception"
            exceptionInfo = info
        }

        let initCrash = !breadcrumbs.isEmpty && lastBreadcrumb != "init_complete"
        let exceptionCrash = !exceptionInfo.isEmpty

        guard initCrash || exceptionCrash else {
            cleanup()
            return
        }

        if !initCrash && exceptionCrash {
            crashType = "post_init_exception"
        }

        let lastLogs = lastLogLines(count: 50)
        let device = WKInterfaceDevice.current()
        let bundleVersion = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"

        let thermalState: String
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: thermalState = "nominal"
        case .fair: thermalState = "fair"
        case .serious: thermalState = "serious"
        case .critical: thermalState = "critical"
        @unknown default: thermalState = "unknown"
        }

        let footprintMB = String(format: "%.1f", memoryUsageMB())

        let report: [String: String] = [
            "crashType": crashType,
            "lastBreadcrumb": lastBreadcrumb,
            "breadcrumbs": breadcrumbs.trimmingCharacters(in: .whitespacesAndNewlines),
            "exceptionInfo": exceptionInfo,
            "lastLogs": lastLogs,
            "deviceModel": device.model,
            "deviceName": device.name,
            "watchOSVersion": device.systemVersion,
            "bundleVersion": bundleVersion,
            "thermalState": thermalState,
            "footprintAtReport": footprintMB
        ]

        Logger.engine.error(" PREVIOUS CRASH DETECTED: type=\(crashType), lastBreadcrumb=\(lastBreadcrumb)")

        WatchEventManager.shared.logNativeEvent(
            name: "watch-crash-report",
            extra: report
        )

        WatchConnectivityManager.shared.sendCrashReport(report)

        sendCrashReportToServer(report)

        cleanup()
    }

    func resetBreadcrumbs() {
        closeBreadcrumbHandle()
        guard let url = breadcrumbURL else { return }
        FileManager.default.createFile(atPath: url.path, contents: nil)
    }

    func writeBreadcrumb(_ checkpoint: String) {
        guard let url = breadcrumbURL else { return }

        if breadcrumbHandle == nil {
            if !FileManager.default.fileExists(atPath: url.path) {
                FileManager.default.createFile(atPath: url.path, contents: nil)
            }
            breadcrumbHandle = try? FileHandle(forWritingTo: url)
            breadcrumbHandle?.seekToEndOfFile()
        }

        guard let handle = breadcrumbHandle,
              let data = "\(checkpoint)\n".data(using: .utf8) else { return }
        handle.write(data)
        try? handle.synchronize()
    }

    func reportMemory(_ label: String, runtime: QJSRuntime? = nil) {
        var vmInfo = task_vm_info_data_t()
        var vmCount = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size) / 4
        let vmResult = withUnsafeMutablePointer(to: &vmInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(vmCount)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &vmCount)
            }
        }

        if vmResult != KERN_SUCCESS { return }

        let footprintMB = Double(vmInfo.phys_footprint) / 1_048_576
        let residentMB = Double(vmInfo.resident_size) / 1_048_576
        let compressedMB = Double(vmInfo.compressed) / 1_048_576
        let limitMB = Double(vmInfo.limit_bytes_remaining) / 1_048_576

        // os_proc_available_memory factors in system-wide pressure, not just
        // per-process budget. When this drops sharply the OS may jetsam us
        // even though limit_bytes_remaining is large.
        let availableMB = Double(os_proc_available_memory()) / 1_048_576

        var jsHeapSuffix = ""
        if let runtime = runtime {
            let usage = runtime.memoryUsage()
            let mallocMB = Double(usage.mallocSize) / 1_048_576
            let usedMB = Double(usage.memoryUsedSize) / 1_048_576
            jsHeapSuffix = " js_malloc=\(String(format: "%.1f", mallocMB))MB js_used=\(String(format: "%.1f", usedMB))MB js_obj=\(usage.objCount)"
        }

        Logger.workout.info("[MEM] \(label): footprint=\(String(format: "%.1f", footprintMB))MB resident=\(String(format: "%.1f", residentMB))MB compressed=\(String(format: "%.1f", compressedMB))MB available=\(String(format: "%.1f", availableMB))MB limit_remaining=\(String(format: "%.1f", limitMB))MB\(jsHeapSuffix)")
    }

    // MARK: - Exception Handler

    func handleException(_ exception: NSException) {
        guard let url = crashInfoURL else { return }

        let frames = exception.callStackSymbols.prefix(10).joined(separator: "\n")
        let info = """
        EXCEPTION: \(exception.name.rawValue)
        REASON: \(exception.reason ?? "unknown")
        STACK:
        \(frames)
        """

        try? info.write(to: url, atomically: true, encoding: .utf8)
    }

    // MARK: - Memory Warning

    private func handleMemoryWarning() {
        let memoryMB = memoryUsageMB()
        writeBreadcrumb("MEMORY_WARNING_\(String(format: "%.0f", memoryMB))MB")

        WatchEventManager.shared.logNativeEvent(
            name: "watch-memory-warning",
            extra: ["memory_mb": String(format: "%.2f", memoryMB)]
        )
    }

    // MARK: - Private

    private func cleanup() {
        closeBreadcrumbHandle()
        if let url = breadcrumbURL { try? FileManager.default.removeItem(at: url) }
        if let url = crashInfoURL { try? FileManager.default.removeItem(at: url) }
    }

    private func closeBreadcrumbHandle() {
        try? breadcrumbHandle?.close()
        breadcrumbHandle = nil
    }

    private func lastLogLines(count: Int) -> String {
        // Read only the tail of the log file — on memory-constrained watches,
        // loading a full 1MB log as a Swift String causes ~2MB of transient
        // pressure right before bundle eval and can trigger jetsam.
        let tail = LogFileManager.shared.readLogsTail(maxBytes: 32 * 1024)
        let lines = tail.components(separatedBy: "\n")
        return lines.suffix(count).joined(separator: "\n")
    }

    private func sendCrashReportToServer(_ report: [String: String]) {
        var components = URLComponents(url: baseApiUrl, resolvingAgainstBaseURL: false)!
        components.path = "/api/watchcrashreport"
        guard let url = components.url else { return }

        let device = WKInterfaceDevice.current()
        var payload = report
        payload["deviceIdentifier"] = device.identifierForVendor?.uuidString ?? "unknown"

        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 5

        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 5
        let session = URLSession(configuration: config)
        session.dataTask(with: request) { _, _, _ in
            session.finishTasksAndInvalidate()
        }.resume()
    }

    private func memoryUsageMB() -> Double {
        var vmInfo = task_vm_info_data_t()
        var vmCount = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size) / 4
        let result = withUnsafeMutablePointer(to: &vmInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(vmCount)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &vmCount)
            }
        }
        guard result == KERN_SUCCESS else { return 0 }
        return Double(vmInfo.phys_footprint) / 1_048_576
    }
}

