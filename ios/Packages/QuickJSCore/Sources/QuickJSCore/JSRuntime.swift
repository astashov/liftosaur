import Foundation
import QuickJSC

public class QJSRuntime {
    let runtime: OpaquePointer

    public init?(stackSizeMB: Int = 4) {  // Default 4MB stack
        guard let rt = JS_NewRuntime() else {
            return nil
        }
        self.runtime = rt
        JS_SetMaxStackSize(rt, stackSizeMB * 1024 * 1024)
    }

    deinit {
        JS_FreeRuntime(runtime)
    }

    public func createContext() -> QJSContext? {
        guard let ctx = JS_NewContext(runtime) else {
            return nil
        }
        return QJSContext(context: ctx)
    }

    /// Force a full garbage collection pass on the runtime. Useful after
    /// evaluating a large bundle to reclaim parser/compiler scratch state
    /// before further allocations.
    public func runGC() {
        JS_RunGC(runtime)
    }

    /// QuickJS-internal memory usage. `mallocSize` is total bytes the JS
    /// allocator has malloc'd; `memoryUsedSize` is bytes currently in use;
    /// `objCount` is the number of live JS objects.
    public struct MemoryUsage {
        public let mallocSize: Int64
        public let memoryUsedSize: Int64
        public let objCount: Int64
        public let jsFuncSize: Int64
        public let jsFuncCodeSize: Int64
    }

    public func memoryUsage() -> MemoryUsage {
        var usage = JSMemoryUsage()
        JS_ComputeMemoryUsage(runtime, &usage)
        return MemoryUsage(
            mallocSize: usage.malloc_size,
            memoryUsedSize: usage.memory_used_size,
            objCount: usage.obj_count,
            jsFuncSize: usage.js_func_size,
            jsFuncCodeSize: usage.js_func_code_size
        )
    }
}
