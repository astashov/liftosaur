import Foundation
import QuickJSC

public class QJSValue {
    let context: OpaquePointer
    var value: JSValue

    init(context: OpaquePointer, value: JSValue) {
        self.context = context
        self.value = value
    }

    deinit {
        qjs_free_value(context, value)
    }

    public var isException: Bool {
        qjs_is_exception(value) != 0
    }

    public var isUndefined: Bool {
        qjs_is_undefined(value) != 0
    }

    public var isNull: Bool {
        qjs_is_null(value) != 0
    }

    public var string: String? {
        guard !isException else {
            printException()
            return nil
        }
        guard let cString = qjs_to_cstring(context, value) else {
            return nil
        }
        defer { JS_FreeCString(context, cString) }
        return String(cString: cString)
    }

    public var int: Int32? {
        guard !isException else {
            printException()
            return nil
        }
        var result: Int32 = 0
        if JS_ToInt32(context, &result, value) < 0 {
            return nil
        }
        return result
    }

    public var double: Double? {
        guard !isException else {
            printException()
            return nil
        }
        var result: Double = 0
        if JS_ToFloat64(context, &result, value) < 0 {
            return nil
        }
        return result
    }

    public var bool: Bool? {
        guard !isException else {
            printException()
            return nil
        }
        let result = JS_ToBool(context, value)
        if result < 0 {
            return nil
        }
        return result != 0
    }

    private func printException() {
        let exception = JS_GetException(context)
        defer { qjs_free_value(context, exception) }

        if let msg = qjs_to_cstring(context, exception) {
            print("JS Exception: \(String(cString: msg))")
            JS_FreeCString(context, msg)
        }

        // Try to get the stack trace
        let stackAtom = JS_NewAtom(context, "stack")
        defer { JS_FreeAtom(context, stackAtom) }

        let stackValue = JS_GetProperty(context, exception, stackAtom)
        defer { qjs_free_value(context, stackValue) }

        if qjs_is_undefined(stackValue) == 0, let stackStr = qjs_to_cstring(context, stackValue) {
            print("Stack trace:\n\(String(cString: stackStr))")
            JS_FreeCString(context, stackStr)
        }
    }
}
