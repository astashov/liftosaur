package com.liftosaur.www.twa.profiler

import com.facebook.hermes.instrumentation.HermesSamplingProfiler
import com.facebook.react.bridge.ReactApplicationContext
import com.liftosaur.www.twa.specs.NativeLiftosaurProfilerSpec
import java.io.File

// ReactFabric-prod strips the React profiler, so a release build has no other CPU view.
// The external files dir lets `adb pull` read the trace without a debuggable build.
class LiftosaurProfilerModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurProfilerSpec(reactContext) {

    override fun enable() {
        HermesSamplingProfiler.enable()
    }

    override fun disable() {
        HermesSamplingProfiler.disable()
    }

    override fun dumpToFile(filename: String): String {
        val dir = reactApplicationContext.getExternalFilesDir(null)
        val file = File(dir, filename)
        HermesSamplingProfiler.dumpSampledTraceToFile(file.absolutePath)
        return file.absolutePath
    }
}
