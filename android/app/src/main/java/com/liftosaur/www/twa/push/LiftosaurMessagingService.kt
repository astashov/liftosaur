package com.liftosaur.www.twa.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class LiftosaurMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        PushDispatcher.emitToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        PushDispatcher.emitPush(message.data)
    }
}
