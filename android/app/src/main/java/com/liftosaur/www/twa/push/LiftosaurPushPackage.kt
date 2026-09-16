package com.liftosaur.www.twa.push

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurPushSpec

class LiftosaurPushPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurPushSpec.NAME -> LiftosaurPushModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurPushSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurPushSpec.NAME,
                    LiftosaurPushModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
