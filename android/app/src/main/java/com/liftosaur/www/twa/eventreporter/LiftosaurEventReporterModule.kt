package com.liftosaur.www.twa.eventreporter

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.liftosaur.www.twa.specs.NativeLiftosaurEventReporterSpec

class LiftosaurEventReporterModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurEventReporterSpec(reactContext) {

    init {
        EventReporterDispatcher.setModule(this)
    }

    override fun getLastTerminationInfo(promise: Promise) {
        val info = LastTerminationHolder.consume()
        if (info == null) {
            promise.resolve(null)
            return
        }
        val map: WritableMap = Arguments.createMap().apply {
            putString("reason", info.reason)
            putDouble("timestamp", info.timestamp.toDouble())
            putMap("extra", Arguments.createMap())
        }
        promise.resolve(map)
    }

    override fun flushPendingTelemetry(promise: Promise) {
        EventReporterDispatcher.flushPending()
        try {
            ApplicationExitInfoReader.emitNewExits(reactApplicationContext)
        } catch (e: Exception) {
            // best-effort; never block JS on telemetry collection
        }
        promise.resolve(null)
    }

    fun dispatchTelemetry(event: WritableMap) {
        emitOnTelemetryEvent(event)
    }

    override fun invalidate() {
        EventReporterDispatcher.setModule(null)
        super.invalidate()
    }
}
