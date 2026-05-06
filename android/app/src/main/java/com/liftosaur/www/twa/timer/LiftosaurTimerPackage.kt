package com.liftosaur.www.twa.timer

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurTimerSpec

class LiftosaurTimerPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurTimerSpec.NAME -> LiftosaurTimerModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurTimerSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurTimerSpec.NAME,
                    LiftosaurTimerModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
