package com.liftosaur.www.twa.push

import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.util.UUID

object PushDispatcher {
    private val main = Handler(Looper.getMainLooper())
    private var module: LiftosaurPushModule? = null
    private var jsSubscribed = false
    private var pendingToken: String? = null
    private var pendingPush: WritableMap? = null

    fun setModule(m: LiftosaurPushModule?) {
        main.post {
            module = m
            if (m == null) jsSubscribed = false
        }
    }

    fun flushPending() {
        main.post {
            jsSubscribed = true
            deliver()
        }
    }

    fun emitToken(token: String) {
        main.post {
            pendingToken = token
            deliver()
        }
    }

    fun emitPush(data: Map<String, String>) {
        main.post {
            pendingPush = Arguments.createMap().apply {
                putString("reason", data["reason"] ?: "")
                putString("originalId", data["originalId"] ?: "")
                putString("deliveryId", UUID.randomUUID().toString())
            }
            deliver()
        }
    }

    private fun deliver() {
        val m = module ?: return
        if (!jsSubscribed) return
        pendingToken?.let { token ->
            pendingToken = null
            m.dispatchToken(Arguments.createMap().apply { putString("token", token) })
        }
        pendingPush?.let { push ->
            pendingPush = null
            m.dispatchPush(push)
        }
    }
}
