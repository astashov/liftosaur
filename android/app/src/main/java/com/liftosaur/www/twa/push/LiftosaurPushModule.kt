package com.liftosaur.www.twa.push

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.google.firebase.messaging.FirebaseMessaging
import com.liftosaur.www.twa.specs.NativeLiftosaurPushSpec

class LiftosaurPushModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurPushSpec(reactContext) {

    init {
        PushDispatcher.setModule(this)
    }

    override fun start(promise: Promise) {
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token -> PushDispatcher.emitToken(token) }
            .addOnFailureListener { e -> Log.w("LiftosaurPush", "FCM token unavailable", e) }
        promise.resolve(null)
    }

    override fun flushPending(promise: Promise) {
        PushDispatcher.flushPending()
        promise.resolve(null)
    }

    override fun complete(deliveryId: String, newData: Boolean, promise: Promise) {
        promise.resolve(null)
    }

    fun dispatchToken(event: WritableMap) {
        emitOnToken(event)
    }

    fun dispatchPush(event: WritableMap) {
        emitOnPush(event)
    }

    override fun invalidate() {
        PushDispatcher.setModule(null)
        super.invalidate()
    }
}
