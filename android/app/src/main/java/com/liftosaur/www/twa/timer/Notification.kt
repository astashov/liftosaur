package com.liftosaur.www.twa.timer

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.AlertDialog
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.util.concurrent.TimeUnit

class Notification(private val context: Context, private val activity: Activity? = null) {
    private fun showAlert(message: String, onOk: () -> Unit) {
        val act = activity ?: return
        Handler(Looper.getMainLooper()).post {
            try {
                AlertDialog.Builder(act)
                    .setMessage(message)
                    .setNeutralButton(android.R.string.ok) { dialog, _ ->
                        onOk()
                        dialog.dismiss()
                    }
                    .create()
                    .show()
            } catch (e: Exception) {
                android.util.Log.e("LftTimer", "showAlert failed", e)
            }
        }
    }

    companion object {
        const val REST_TIMER_ID: Int = 1
        const val REMINDER_ID: Int = 2
        private const val NOTIF_PERM_REQUEST_CODE: Int = 41001
        var startedIntents: MutableMap<Int, PendingIntent> = mutableMapOf()
    }

    fun cancel(id: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        startedIntents[id]?.let { alarmManager.cancel(it) }
    }

    fun send(
        id: Int,
        duration: Long,
        ignoreDoNotDisturb: Boolean,
        vibration: Boolean,
        title: String?,
        subtitle: String?,
        body: String?,
        volume: Float
    ): String? {
        cancel(id)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            android.util.Log.d("LftTimer", "Notification.send -> missing exactAlarm")
            showAlert(
                """Please grant permissions to use alarms, otherwise the app won't be able to notify you when the app is in background and the when rest timer is triggered.

If you don't want the alarm and timers, set Rest Timers to 0 in Settings."""
            ) {
                val act = activity ?: return@showAlert
                act.startActivity(
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
            return "exactAlarm"
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            !NotificationManagerCompat.from(context).areNotificationsEnabled()
        ) {
            android.util.Log.d("LftTimer", "Notification.send -> missing notifications permission")
            showAlert(
                """Please grant permissions to show notifications, otherwise the app won't be able to notify you when the app is in background and the when rest timer is triggered.

If you don't want the notifications and timers, set Rest Timers to 0 in Settings."""
            ) {
                val act = activity as? PermissionAwareActivity ?: return@showAlert
                act.requestPermissions(
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIF_PERM_REQUEST_CODE,
                    PermissionListener { _, _, _ -> true }
                )
            }
            return "notifications"
        }
        if (ignoreDoNotDisturb &&
            notificationManager.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL &&
            !notificationManager.isNotificationPolicyAccessGranted
        ) {
            android.util.Log.d("LftTimer", "Notification.send -> missing dndAccess")
            showAlert(
                """Please grant permissions to fire notification even in Do Not Disturb mode, so that you definitely don't miss it!

If you don't want that, disable 'Ignore Do Not Disturb' in Settings."""
            ) {
                val act = activity ?: return@showAlert
                act.startActivity(
                    Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
            return "dndAccess"
        }

        val intent = Intent(context, TimerNotificationPublisher::class.java).apply {
            putExtra("title", title)
            putExtra("subtitle", subtitle)
            putExtra("body", body)
            putExtra("ignoreDoNotDisturb", ignoreDoNotDisturb)
            putExtra("vibration", vibration)
            putExtra("notificationId", id)
            putExtra("volume", volume)
        }

        val flags = PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getBroadcast(context, id, intent, flags)
        startedIntents[id] = pendingIntent

        val delay = TimeUnit.SECONDS.toMillis(duration)
        val alarmInfo = AlarmManager.AlarmClockInfo(System.currentTimeMillis() + delay, pendingIntent)
        alarmManager.setAlarmClock(alarmInfo, pendingIntent)
        android.util.Log.d("LftTimer", "Notification.send -> scheduled, fires in ${delay}ms id=$id")
        return null
    }
}
