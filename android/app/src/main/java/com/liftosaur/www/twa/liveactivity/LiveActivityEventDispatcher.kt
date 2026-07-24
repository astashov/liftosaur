package com.liftosaur.www.twa.liveactivity

import com.facebook.react.bridge.ReadableMap

object LiveActivityEventDispatcher {
    private var module: LiftosaurLiveActivityModule? = null
    private var manager: LiveUpdateManager? = null
    private var jsSubscribed = false
    private val pending = mutableListOf<ReadableMap>()

    fun setModule(m: LiftosaurLiveActivityModule?) {
        module = m
        if (m == null) jsSubscribed = false
    }

    fun setManager(m: LiveUpdateManager?) {
        manager = m
    }

    fun getManager(): LiveUpdateManager? = manager

    @Synchronized
    fun flushPending() {
        jsSubscribed = true
        val m = module ?: return
        if (pending.isEmpty()) return
        val snapshot = pending.toList()
        pending.clear()
        for (e in snapshot) m.dispatchAction(e)
    }

    @Synchronized
    fun emit(event: ReadableMap) {
        if (jsSubscribed && module != null) {
            module!!.dispatchAction(event)
        } else {
            pending.add(event)
        }
    }
}
