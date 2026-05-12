import Foundation
import QuickJSC

public class QJSContext {
    let context: OpaquePointer
    private var consoleLogEnabled = false
    private var messageHandlerEnabled = false
    private var pendingMessages: [[String: String]] = []

    /// Custom log handler - if set, console.log output goes here instead of print()
    public var logHandler: ((String) -> Void)?

    init(context: OpaquePointer) {
        self.context = context
    }

    deinit {
        JS_FreeContext(context)
    }

    /// Enable console.log capture - call this once before loading your JS code
    public func setupConsoleLog() {
        let consoleShim = """
        var __consoleLogs = [];
        var console = {
            log: function() {
                var args = Array.prototype.slice.call(arguments);
                var msg = args.map(function(a) {
                    if (typeof a === 'object') {
                        try { return JSON.stringify(a); } catch(e) { return String(a); }
                    }
                    return String(a);
                }).join(' ');
                __consoleLogs.push(msg);
            },
            error: function() { console.log.apply(console, arguments); },
            warn: function() { console.log.apply(console, arguments); },
            info: function() { console.log.apply(console, arguments); }
        };
        """
        _ = evalRaw(consoleShim)
        consoleLogEnabled = true
    }

    /// Enable SendMessage.toIos capture - call this once before loading your JS code
    /// Note: webpack replaces `window` with `globalThis` in the watch bundle,
    /// so we set up webkit on globalThis directly
    public func setupMessageHandler(iosAppVersion: Int) {
        let messageHandlerShim = """
        var __liftosaurMessages = [];
        globalThis.webkit = {
            messageHandlers: {
                liftosaurMessage: {
                    postMessage: function(obj) {
                        __liftosaurMessages.push(obj);
                    }
                }
            }
        };
        globalThis.lftIosAppVersion = "\(iosAppVersion)";
        """
        _ = evalRaw(messageHandlerShim)
        messageHandlerEnabled = true
    }

    /// Raw eval without console log flushing
    private func evalRaw(_ script: String, filename: String = "<input>") -> QJSValue {
        let value = script.withCString { scriptPtr in
            filename.withCString { filenamePtr in
                JS_Eval(context, scriptPtr, script.utf8.count, filenamePtr, Int32(JS_EVAL_TYPE_GLOBAL))
            }
        }
        return QJSValue(context: context, value: value)
    }

    @discardableResult
    public func eval(_ script: String, filename: String = "<input>") -> QJSValue {
        let result = evalRaw(script, filename: filename)
        if consoleLogEnabled {
            flushConsoleLogs()
        }
        if messageHandlerEnabled {
            flushMessages()
        }
        return result
    }

    /// Get and clear pending messages collected during JS evaluation
    public func getPendingMessages() -> [[String: String]] {
        let messages = pendingMessages
        pendingMessages = []
        return messages
    }

    private func flushConsoleLogs() {
        let script = """
        (function() {
            var logs = __consoleLogs.slice();
            __consoleLogs = [];
            return JSON.stringify(logs);
        })()
        """

        let result = evalRaw(script)
        guard let resultString = result.string,
              let data = resultString.data(using: .utf8),
              let logs = try? JSONDecoder().decode([String].self, from: data) else {
            return
        }

        for log in logs {
            if let handler = logHandler {
                handler(log)
            } else {
                print("[JS] \(log)")
            }
        }
    }

    private func flushMessages() {
        let script = """
        (function() {
            var msgs = __liftosaurMessages.slice();
            __liftosaurMessages = [];
            return JSON.stringify(msgs);
        })()
        """

        let result = evalRaw(script)
        guard let resultString = result.string,
              let data = resultString.data(using: .utf8),
              let messages = try? JSONDecoder().decode([[String: String]].self, from: data) else {
            return
        }

        pendingMessages.append(contentsOf: messages)
    }

    public func getGlobal() -> QJSValue {
        let global = JS_GetGlobalObject(context)
        return QJSValue(context: context, value: global)
    }

    /// Set a string property on the global object directly, bypassing JS escaping.
    /// Much more memory-efficient than embedding large strings as JS literals.
    public func setGlobalString(_ name: String, value: String) {
        let global = JS_GetGlobalObject(context)
        defer { qjs_free_value(context, global) }

        let jsStr = value.withCString { cStr in
            JS_NewStringLen(context, cStr, value.utf8.count)
        }
        _ = name.withCString { namePtr in
            JS_SetPropertyStr(context, global, namePtr, jsStr)
        }
    }
}
