package com.liftosaur.www

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class LiftosaurPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurStorageSpec.NAME -> LiftosaurStorageModule(reactContext)
            NativeWebViewPoolSpec.NAME -> WebViewPoolModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurStorageSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurStorageSpec.NAME,
                    LiftosaurStorageModule::class.java.name,
                    false, false, false, true
                ),
                NativeWebViewPoolSpec.NAME to ReactModuleInfo(
                    NativeWebViewPoolSpec.NAME,
                    WebViewPoolModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
