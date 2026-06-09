package com.liftosaur.www.twa.imageresizer

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurImageResizerSpec

class LiftosaurImageResizerPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurImageResizerSpec.NAME -> LiftosaurImageResizerModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurImageResizerSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurImageResizerSpec.NAME,
                    LiftosaurImageResizerModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
