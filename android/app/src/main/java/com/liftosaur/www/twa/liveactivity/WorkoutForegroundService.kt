package com.liftosaur.www.twa.liveactivity

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.liftosaur.www.twa.MainActivity
import com.liftosaur.www.twa.R

class WorkoutForegroundService : Service() {
    companion object {
        private var pendingNotification: Notification? = null

        fun start(context: Context, notification: Notification) {
            pendingNotification = notification
            val intent = Intent(context, WorkoutForegroundService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            pendingNotification = null
            val intent = Intent(context, WorkoutForegroundService::class.java)
            context.stopService(intent)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = pendingNotification ?: createFallbackNotification()
        startForeground(LiveUpdateManager.LIVE_UPDATE_NOTIFICATION_ID, notification)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createFallbackNotification(): Notification {
        val activityIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, LiveUpdateManager.LIVE_UPDATE_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Workout in progress")
            .setContentText("Liftosaur is tracking your workout")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .build()
    }
}
