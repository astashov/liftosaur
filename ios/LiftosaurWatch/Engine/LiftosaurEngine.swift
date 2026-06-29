//
//  LiftosaurEngine.swift
//  LiftosaurWatch Watch App
//

import Foundation
import QuickJSCore
import OSLog

enum EngineError: Error {
    case evalFailed
    case dataConversion
    case jsError(String)
    case decodeFailed(String)
}

#if DEBUG
let isSubscribed = true
#else
let isSubscribed = false
#endif

class LiftosaurEngine {
    private let runtime: QJSRuntime
    private var context: QJSContext?

    /// Dedicated serial queue for all JS operations (QuickJS is not thread-safe)
    private let jsQueue = DispatchQueue(label: "com.liftosaur.watch.jsengine", qos: .userInitiated)

    init?() {
        guard let runtime = QJSRuntime() else { return nil }
        self.runtime = runtime

        guard let context = runtime.createContext() else { return nil }
        self.context = context

        // Enable console.log capture
        context.setupConsoleLog()

        // Route JS console.log to OSLog
        context.logHandler = { message in
            Logger.engine.info("[JS] \(message)")
        }

        // Enable SendMessage.toIos capture
        context.setupMessageHandler(iosAppVersion: iosAppVersion)

        guard let jsCode = WatchCacheManager.shared.loadBundle() else {
            Logger.engine.error("Failed to load watch-bundle.js")
            self.context = nil
            return nil
        }

        Logger.engine.info(" bundle loaded, size: \(jsCode.count) bytes, first 100 chars: \(String(jsCode.prefix(100))), last 100 chars: \(String(jsCode.suffix(100)))")

        WatchCrashReporter.shared.reportMemory("before_eval", runtime: runtime)
        WatchCrashReporter.shared.writeBreadcrumb("before_eval")
        let evalStart = CFAbsoluteTimeGetCurrent()
        let result = context.eval(jsCode, filename: "watch-bundle.js")
        let evalTime = (CFAbsoluteTimeGetCurrent() - evalStart) * 1000
        WatchCrashReporter.shared.writeBreadcrumb("after_eval")
        WatchCrashReporter.shared.reportMemory("after_eval (\(String(format: "%.0f", evalTime))ms)", runtime: runtime)

        if result.isException {
            let exceptionStr = result.string ?? "unknown"
            Logger.engine.error(" bundle eval exception: \(exceptionStr)")
            self.context = nil
            return nil
        }

        let checkResult = context.eval("typeof Liftosaur")
        if let typeStr = checkResult.string {
            Logger.engine.info(" typeof Liftosaur = \(typeStr)")
            if typeStr == "undefined" {
                Logger.engine.info(" Liftosaur is undefined after bundle init")
                self.context = nil
                return nil
            }
        }

        // Reclaim parser/compiler scratch held after evaluating the 428KB bundle
        // before any further allocations. Reduces peak memory on watchOS where
        // the OS may jetsam under system pressure even though our footprint is
        // small.
        runtime.runGC()
        WatchCrashReporter.shared.reportMemory("after_gc", runtime: runtime)
    }

    deinit {
        context = nil
    }

    // MARK: - Async Queue Helpers

    private func runOnJSQueue<T>(_ work: @escaping () -> T) async -> T {
        await withCheckedContinuation { continuation in
            jsQueue.async {
                let result = work()
                continuation.resume(returning: result)
            }
        }
    }

    /// Execute JS and decode result.
    /// `globals` are set as JS global variables via C API (no escaping needed — for large strings like storage).
    /// `args` are already-formatted JS expression fragments (for small values like ints or short escaped strings).
    private func call<T: Codable>(_ method: String, globals: [(String, String)] = [], args: [String] = []) async -> Result<T, EngineError> {
        await runOnJSQueue {
            let argsStr = self.prepareArgs(globals: globals, args: args)
            Logger.engine.info("JS call - \(method)")
            return self.evalAndDecode("Liftosaur.\(method)(\(argsStr))")
        }
    }

    /// Execute JS and decode optional result
    private func callOptional<T: Codable>(_ method: String, globals: [(String, String)] = [], args: [String] = []) async -> Result<T?, EngineError> {
        await runOnJSQueue {
            let argsStr = self.prepareArgs(globals: globals, args: args)
            Logger.engine.info("JS call - \(method)")
            return self.evalAndDecodeOptional("Liftosaur.\(method)(\(argsStr))")
        }
    }

    /// Execute JS and extract storage from result
    private func callMutation(_ method: String, globals: [(String, String)] = [], args: [String] = []) async -> Result<String, EngineError> {
        await runOnJSQueue {
            let argsStr = self.prepareArgs(globals: globals, args: args)
            Logger.engine.info("JS call - \(method)")
            return self.evalAndExtractStorage("Liftosaur.\(method)(\(argsStr))")
        }
    }

    /// Execute JS and return raw string
    private func callRaw(_ method: String, globals: [(String, String)] = [], args: [String] = []) async -> String? {
        await runOnJSQueue {
            guard let context = self.context else { return nil }
            let argsStr = self.prepareArgs(globals: globals, args: args)
            Logger.engine.info("JS call - \(method)")
            return context.eval("Liftosaur.\(method)(\(argsStr))").string
        }
    }

    /// Set globals on the JS context and build the combined argument string.
    /// Must be called from jsQueue.
    private func prepareArgs(globals: [(String, String)], args: [String]) -> String {
        var allArgs: [String] = []
        for (name, value) in globals {
            context?.setGlobalString(name, value: value)
            allArgs.append(name)
        }
        allArgs.append(contentsOf: args)
        return allArgs.joined(separator: ", ")
    }

    private func str(_ value: String) -> String {
        "'\(escapeForJS(value))'"
    }

    // MARK: - Public Async API

    func getNextHistoryRecord(storageJson: String) async -> Result<WatchWorkout, EngineError> {
        await call("getNextHistoryRecord", globals: [("__lft_s", storageJson)])
    }

    func hasProgram(storageJson: String) async -> Bool {
        let result: Result<WatchHasProgram, EngineError> = await call("hasProgram", globals: [("__lft_s", storageJson)])
        guard case .success(let hasProgram) = result else { return false }
        return hasProgram.hasProgram
    }

    func hasSubscription(storageJson: String) async -> Bool {
        let result: Result<WatchHasSubscription, EngineError> = await call("hasSubscription", globals: [("__lft_s", storageJson)])
        guard case .success(let hasSubscription) = result else { return false }
        return hasSubscription.hasSubscription || isSubscribed
    }

    func getProgress(storageJson: String) async -> Result<WatchWorkout?, EngineError> {
        await callOptional("getProgress", globals: [("__lft_s", storageJson)])
    }

    func startWorkout(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("startWorkout", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func discardWorkout(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("discardWorkout", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func completeSet(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int) async -> Result<String, EngineError> {
        await callMutation("completeSet", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)"])
    }

    func updateCompletedSetTimer(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int, seconds: Int) async -> Result<String, EngineError> {
        await callMutation("updateCompletedSetTimer", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)", "\(seconds)"])
    }

    func getNextEntryAndSetIndex(storageJson: String, entryIndex: Int, setIndex: Int) async -> Result<WatchNextEntryAndSetIndex?, EngineError> {
        await callOptional("getNextEntryAndSetIndex", globals: [("__lft_s", storageJson)], args: ["\(entryIndex)", "\(setIndex)"])
    }

    func getValidWeights(storageJson: String, entryIndex: Int, currentWeight: Double, unit: String?, countUp: Int, countDown: Int) async -> Result<WatchValidWeights, EngineError> {
        await call("getValidWeights", globals: [("__lft_s", storageJson)], args: ["\(entryIndex)", "\(currentWeight)", unit.map { str($0) } ?? "undefined", "\(countUp)", "\(countDown)"])
    }

    func updateSetReps(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int, reps: Int) async -> Result<String, EngineError> {
        await callMutation("updateSetReps", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)", "\(reps)"])
    }

    func updateSetRepsLeft(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int, repsLeft: Int) async -> Result<String, EngineError> {
        await callMutation("updateSetRepsLeft", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)", "\(repsLeft)"])
    }

    func updateSetWeight(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int, weightValue: Double) async -> Result<String, EngineError> {
        await callMutation("updateSetWeight", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)", "\(weightValue)"])
    }

    func getAmrapModal(storageJson: String) async -> Result<WatchAmrapModal?, EngineError> {
        await callOptional("getAmrapModal", globals: [("__lft_s", storageJson)])
    }

    func completeSetWithAmrap(
        storageJson: String,
        deviceId: String,
        completedReps: Int?,
        completedRepsLeft: Int?,
        completedWeight: Double?,
        completedRpe: Double?,
        userPromptedVarsJson: String?
    ) async -> Result<String, EngineError> {
        let repsArg = completedReps.map { String($0) } ?? "undefined"
        let repsLeftArg = completedRepsLeft.map { String($0) } ?? "undefined"
        let weightArg = completedWeight.map { String($0) } ?? "undefined"
        let rpeArg = completedRpe.map { String($0) } ?? "undefined"
        let userVarsArg = userPromptedVarsJson.map { str($0) } ?? "undefined"
        return await callMutation("completeSetWithAmrap", globals: [("__lft_s", storageJson)], args: [str(deviceId), repsArg, repsLeftArg, weightArg, rpeArg, userVarsArg])
    }

    func getSetTimerModal(storageJson: String) async -> Result<WatchSetTimerModal?, EngineError> {
        await callOptional("getSetTimerModal", globals: [("__lft_s", storageJson)])
    }

    func recordSetTimer(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int, keepTiming: Bool, recordedSeconds: Int) async -> Result<String, EngineError> {
        await callMutation("recordSetTimer", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)", keepTiming ? "true" : "false", "\(recordedSeconds)"])
    }

    func closeSetTimer(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("closeSetTimer", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func isSetTimerCheckDue(storageJson: String) async -> Bool {
        let result: Result<WatchSetTimerCheckDue, EngineError> = await call("isSetTimerCheckDue", globals: [("__lft_s", storageJson)])
        guard case .success(let value) = result else { return false }
        return value.due
    }

    func checkSetTimer(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("checkSetTimer", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func getRestTimer(storageJson: String) async -> Result<WatchRestTimer?, EngineError> {
        await callOptional("getRestTimer", globals: [("__lft_s", storageJson)])
    }

    func adjustRestTimer(storageJson: String, deviceId: String, adjustment: Int) async -> Result<String, EngineError> {
        await callMutation("adjustRestTimer", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(adjustment)"])
    }

    func stopRestTimer(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("stopRestTimer", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func getWorkoutStatus(storageJson: String) async -> Result<WatchWorkoutStatus?, EngineError> {
        await callOptional("getWorkoutStatus", globals: [("__lft_s", storageJson)])
    }

    func pauseWorkout(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("pauseWorkout", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func resumeWorkout(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("resumeWorkout", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func addSet(storageJson: String, deviceId: String, entryIndex: Int) async -> Result<String, EngineError> {
        await callMutation("addSet", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)"])
    }

    func deleteSet(storageJson: String, deviceId: String, entryIndex: Int, setIndex: Int) async -> Result<String, EngineError> {
        await callMutation("deleteSet", globals: [("__lft_s", storageJson)], args: [str(deviceId), "\(entryIndex)", "\(setIndex)"])
    }

    func prepareSync(currentStorageJson: String, lastSyncedStorageJson: String, deviceId: String) async -> String? {
        await callRaw("prepareSync", globals: [("__lft_s0", currentStorageJson), ("__lft_s1", lastSyncedStorageJson)], args: [str(deviceId)])
    }

    func mergeStorage(currentStorageJson: String, incomingStorageJson: String, deviceId: String) async -> String? {
        await callRaw("mergeStorage", globals: [("__lft_s0", currentStorageJson), ("__lft_s1", incomingStorageJson)], args: [str(deviceId)])
    }

    func getLatestMigrationVersion() async -> String? {
        await callRaw("getLatestMigrationVersion")
    }

    func runMigrations(storageJson: String) async -> String? {
        await callRaw("runMigrations", globals: [("__lft_s", storageJson)])
    }

    func invalidateStorageCache() async {
        _ = await callRaw("invalidateStorageCache")
    }

    func finishWorkout(storageJson: String, deviceId: String) async -> Result<String, EngineError> {
        await callMutation("finishWorkout", globals: [("__lft_s", storageJson)], args: [str(deviceId)])
    }

    func getFinishWorkoutSummary(storageJson: String) async -> Result<WatchFinishWorkoutSummary?, EngineError> {
        await callOptional("getFinishWorkoutSummary", globals: [("__lft_s", storageJson)])
    }

    func finishWorkoutContinue(storageJson: String) async -> Result<Bool, EngineError> {
        let result: Result<WatchFinishWorkoutContinueResult, EngineError> = await call("finishWorkoutContinue", globals: [("__lft_s", storageJson)])
        return result.map { $0.sent }
    }

    func getVolume(storageJson: String) async -> Result<WatchVolume?, EngineError> {
        await callOptional("getVolume", globals: [("__lft_s", storageJson)])
    }

    func getHealthSettings(storageJson: String) async -> Result<WatchHealthSettings, EngineError> {
        await call("getHealthSettings", globals: [("__lft_s", storageJson)])
    }

    // MARK: - Private Helper Methods (called only from jsQueue)

    private func eval(_ script: String, filename: String = "liftosaur-api") -> Result<Data, EngineError> {
        guard let context = context else {
            return .failure(.evalFailed)
        }
        let start = CFAbsoluteTimeGetCurrent()
        guard let resultString = context.eval(script, filename: filename).string else {
            return .failure(.evalFailed)
        }
        let elapsed = (CFAbsoluteTimeGetCurrent() - start) * 1000
        if elapsed > 50 {
            Logger.engine.info("JS eval took \(String(format: "%.2f", elapsed))ms")
        }

        let messages = context.getPendingMessages()
        if !messages.isEmpty {
            WatchMessageHandler.shared.handleMessages(messages)
        }

        guard let data = resultString.data(using: .utf8) else {
            return .failure(.dataConversion)
        }
        return .success(data)
    }

    private func evalAndDecode<T: Codable>(_ script: String) -> Result<T, EngineError> {
        switch eval(script) {
        case .failure(let error):
            return .failure(error)
        case .success(let data):
            do {
                let response = try JSONDecoder().decode(WatchResponse<T>.self, from: data)
                guard response.success, let result = response.data else {
                    return .failure(.jsError(response.error ?? "Unknown error"))
                }
                return .success(result)
            } catch {
                return .failure(.decodeFailed("\(error)"))
            }
        }
    }

    private func evalAndDecodeOptional<T: Codable>(_ script: String) -> Result<T?, EngineError> {
        switch eval(script) {
        case .failure(let error):
            return .failure(error)
        case .success(let data):
            do {
                let response = try JSONDecoder().decode(WatchResponse<T?>.self, from: data)
                guard response.success else {
                    return .failure(.jsError(response.error ?? "Unknown error"))
                }
                return .success(response.data ?? nil)
            } catch {
                return .failure(.decodeFailed("\(error)"))
            }
        }
    }

    private func evalAndExtractStorage(_ script: String) -> Result<String, EngineError> {
        switch eval(script) {
        case .failure(let error):
            return .failure(error)
        case .success(let data):
            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let success = json?["success"] as? Bool, success,
                      let storageData = json?["data"] else {
                    let error = json?["error"] as? String ?? "Unknown error"
                    return .failure(.jsError(error))
                }
                let newStorageData = try JSONSerialization.data(withJSONObject: storageData)
                guard let newStorageJson = String(data: newStorageData, encoding: .utf8) else {
                    return .failure(.dataConversion)
                }
                return .success(newStorageJson)
            } catch {
                return .failure(.decodeFailed("\(error)"))
            }
        }
    }

    private func escapeForJS(_ string: String) -> String {
        var result = ""
        result.reserveCapacity(string.utf8.count + 64)
        for scalar in string.unicodeScalars {
            switch scalar {
            case "\\": result += "\\\\"
            case "'": result += "\\'"
            case "\n": result += "\\n"
            case "\r": result += "\\r"
            default: result.unicodeScalars.append(scalar)
            }
        }
        return result
    }
}
