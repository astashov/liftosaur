package com.liftosaur.www.twa.liveactivity

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.liftosaur.www.twa.specs.NativeLiftosaurLiveActivitySpec

class LiftosaurLiveActivityModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurLiveActivitySpec(reactContext) {

    override fun startLiveActivity(state: ReadableMap, promise: Promise) {
        // TODO: port LiveUpdateManager.kt — foreground service with persistent notification
        promise.resolve(null)
    }

    override fun updateLiveActivity(state: ReadableMap, promise: Promise) {
        promise.resolve(null)
    }

    override fun endLiveActivity(promise: Promise) {
        promise.resolve(null)
    }

    override fun isSupported(): Boolean = true
}
