package com.liftosaur.www.twa.profiler

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurProfilerSpec

class LiftosaurProfilerPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurProfilerSpec.NAME -> LiftosaurProfilerModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurProfilerSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurProfilerSpec.NAME,
                    LiftosaurProfilerModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
