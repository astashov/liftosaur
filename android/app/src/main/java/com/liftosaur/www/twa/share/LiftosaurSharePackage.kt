package com.liftosaur.www.twa.share

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurShareSpec

class LiftosaurSharePackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurShareSpec.NAME -> LiftosaurShareModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurShareSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurShareSpec.NAME,
                    LiftosaurShareModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
