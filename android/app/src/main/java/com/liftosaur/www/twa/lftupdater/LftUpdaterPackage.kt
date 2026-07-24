package com.liftosaur.www.twa.lftupdater

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLftUpdaterSpec

class LftUpdaterPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLftUpdaterSpec.NAME -> LftUpdaterModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLftUpdaterSpec.NAME to ReactModuleInfo(
                    NativeLftUpdaterSpec.NAME,
                    LftUpdaterModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
