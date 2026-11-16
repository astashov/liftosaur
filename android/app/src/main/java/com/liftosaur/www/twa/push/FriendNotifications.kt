package com.liftosaur.www.twa.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.liftosaur.www.twa.MainActivity
import com.liftosaur.www.twa.R
import org.json.JSONObject

object FriendNotifications {
    const val REASON = "friend"
    const val ACTION_OPEN = "com.liftosaur.www.OPEN_NOTIFICATION"
    const val EXTRA_DATA = "notificationData"
    private const val CHANNEL_ID = "liftosaur_friends"
    private const val NOTIFICATION_ID = 3

    private val tapKeys = listOf("reason", "recipientId", "target", "historyRecordId", "programId")

    fun eventData(data: Map<String, String>): String {
        val tap = JSONObject()
        tapKeys.forEach { key -> data[key]?.let { tap.put(key, it) } }
        return tap.toString()
    }

    fun post(context: Context, data: Map<String, String>) {
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        ensureChannel(context)
        val tag = data["tag"] ?: "friends"
        val intent = Intent(context, MainActivity::class.java).apply {
            action = ACTION_OPEN
            putExtra(EXTRA_DATA, eventData(data))
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            tag.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(data["title"] ?: "Liftosaur")
            .setContentText(data["body"])
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setGroup("friends")
            .build()
        try {
            manager.notify(tag, NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
        }
    }

    private fun ensureChannel(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(CHANNEL_ID, "Friends", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Follow requests and reactions to your workouts"
        }
        nm.createNotificationChannel(channel)
    }
}
