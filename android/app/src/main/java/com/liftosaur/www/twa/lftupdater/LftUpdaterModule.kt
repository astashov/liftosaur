package com.liftosaur.www.twa.lftupdater

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.liftosaur.www.twa.specs.NativeLftUpdaterSpec
import java.util.concurrent.Executors

class LftUpdaterModule(reactContext: ReactApplicationContext) :
    NativeLftUpdaterSpec(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()

    override fun checkAndDownload(promise: Promise) {
        executor.execute {
            val result = LftUpdater.checkAndDownload(reactApplicationContext)
            val map = Arguments.createMap()
            for ((k, v) in result) {
                when (v) {
                    null -> map.putNull(k)
                    is String -> map.putString(k, v)
                    else -> map.putString(k, v.toString())
                }
            }
            promise.resolve(map)
        }
    }

    override fun markLaunchSuccessful(promise: Promise) {
        LftUpdater.markLaunchSuccessful(reactApplicationContext)
        promise.resolve(null)
    }

    override fun activeBundleId(promise: Promise) {
        promise.resolve(LftUpdaterPath.activeUpdateId(reactApplicationContext))
    }

    override fun revertToEmbedded(promise: Promise) {
        LftUpdaterPath.revertToEmbedded(reactApplicationContext)
        promise.resolve(null)
    }
}
