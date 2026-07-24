package com.liftosaur.www.twa.liveactivity

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurLiveActivitySpec

class LiftosaurLiveActivityPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurLiveActivitySpec.NAME -> LiftosaurLiveActivityModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurLiveActivitySpec.NAME to ReactModuleInfo(
                    NativeLiftosaurLiveActivitySpec.NAME,
                    LiftosaurLiveActivityModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
