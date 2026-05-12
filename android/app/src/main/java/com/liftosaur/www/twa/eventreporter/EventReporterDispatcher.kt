package com.liftosaur.www.twa.eventreporter

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

object EventReporterDispatcher {
    private const val MAX_PENDING = 256
    private var module: LiftosaurEventReporterModule? = null
    private var jsSubscribed = false
    private val pending = mutableListOf<WritableMap>()

    @Synchronized
    fun setModule(m: LiftosaurEventReporterModule?) {
        module = m
        if (m == null) jsSubscribed = false
    }

    @Synchronized
    fun flushPending() {
        jsSubscribed = true
        val m = module ?: return
        if (pending.isEmpty()) return
        val snapshot = pending.toList()
        pending.clear()
        for (e in snapshot) m.dispatchTelemetry(e)
    }

    @Synchronized
    fun emit(name: String, extra: Map<String, String> = emptyMap()) {
        val event = Arguments.createMap().apply {
            putString("name", name)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
            val extraMap = Arguments.createMap()
            for ((k, v) in extra) extraMap.putString(k, v)
            putMap("extra", extraMap)
        }
        if (jsSubscribed && module != null) {
            module!!.dispatchTelemetry(event)
        } else {
            pending.add(event)
            if (pending.size > MAX_PENDING) {
                pending.subList(0, pending.size - MAX_PENDING).clear()
            }
        }
    }
}
