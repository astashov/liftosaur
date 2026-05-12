package com.liftosaur.www.twa.eventreporter

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.liftosaur.www.twa.specs.NativeLiftosaurEventReporterSpec

class LiftosaurEventReporterPackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        when (name) {
            NativeLiftosaurEventReporterSpec.NAME -> LiftosaurEventReporterModule(reactContext)
            else -> null
        }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            mapOf(
                NativeLiftosaurEventReporterSpec.NAME to ReactModuleInfo(
                    NativeLiftosaurEventReporterSpec.NAME,
                    LiftosaurEventReporterModule::class.java.name,
                    false, false, false, true
                )
            )
        }
}
