package com.liftosaur.www.twa.liveactivity

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.liftosaur.www.twa.specs.NativeLiftosaurLiveActivitySpec

class LiftosaurLiveActivityModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurLiveActivitySpec(reactContext) {

    private val manager: LiveUpdateManager = LiveUpdateManager(reactContext)

    init {
        LiveActivityEventDispatcher.setModule(this)
        LiveActivityEventDispatcher.setManager(manager)
    }

    override fun startLiveActivity(state: ReadableMap, promise: Promise) {
        try {
            manager.updateLiveActivity(state)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("start_live_activity_failed", e.message, e)
        }
    }

    override fun updateLiveActivity(state: ReadableMap, promise: Promise) {
        try {
            manager.updateLiveActivity(state)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("update_live_activity_failed", e.message, e)
        }
    }

    override fun endLiveActivity(promise: Promise) {
        try {
            manager.endLiveActivity()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("end_live_activity_failed", e.message, e)
        }
    }

    override fun isSupported(): Boolean = true

    override fun flushPendingActions(promise: Promise) {
        LiveActivityEventDispatcher.flushPending()
        promise.resolve(null)
    }

    fun dispatchAction(event: ReadableMap) {
        emitOnLiveActivityAction(event)
    }

    override fun invalidate() {
        LiveActivityEventDispatcher.setModule(null)
        LiveActivityEventDispatcher.setManager(null)
        manager.endLiveActivity()
        super.invalidate()
    }
}
