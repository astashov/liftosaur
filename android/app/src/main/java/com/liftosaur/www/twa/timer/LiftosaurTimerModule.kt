package com.liftosaur.www.twa.timer

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.liftosaur.www.twa.R
import com.liftosaur.www.twa.specs.NativeLiftosaurTimerSpec

class LiftosaurTimerModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurTimerSpec(reactContext) {

    private var channelsCreated = false
    private var audioPlayer: MediaPlayer? = null

    private fun ensureChannels() {
        if (channelsCreated) return
        val ctx = reactApplicationContext
        val name = ctx.getString(R.string.channel_name)
        val description = ctx.getString(R.string.channel_description)
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
            .build()
        val soundUri: Uri = Uri.parse("android.resource://${ctx.packageName}/raw/notif")
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        listOf(
            Triple(CHANNEL_ID, name, false),
            Triple(CHANNEL_ID_DND, "$name (Bypass DND)", true),
        ).forEach { (id, label, bypass) ->
            val channel = NotificationChannel(id, label, NotificationManager.IMPORTANCE_MAX).apply {
                this.description = if (bypass) "$description - bypasses Do Not Disturb" else description
                setSound(soundUri, attrs)
                setBypassDnd(bypass)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setShowBadge(true)
                enableLights(true)
                lightColor = Color.WHITE
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
            }
            nm.createNotificationChannel(channel)
        }
        channelsCreated = true
    }

    override fun startTimer(params: ReadableMap, promise: Promise) {
        try {
            ensureChannels()
            val duration = params.getDouble("duration").toLong()
            android.util.Log.d("LftTimer", "Android startTimer duration=$duration vol=${params.getDouble("volume")} vib=${params.getBoolean("vibration")} dnd=${params.getBoolean("ignoreDoNotDisturb")}")
            val title = params.getString("title")
            val subtitleHeader = params.getString("subtitleHeader")
            val subtitle = params.getString("subtitle")
            val bodyHeader = params.getString("bodyHeader")
            val body = params.getString("body")
            val volume = params.getDouble("volume").toFloat()
            val vibration = params.getBoolean("vibration")
            val ignoreDoNotDisturb = params.getBoolean("ignoreDoNotDisturb")

            val titleVal = if (title.isNullOrEmpty()) "Liftosaur" else title
            val subtitleVal = if (!subtitleHeader.isNullOrEmpty() && !subtitle.isNullOrEmpty()) {
                "$subtitleHeader: $subtitle"
            } else "Liftosaur"
            val bodyVal = if (!bodyHeader.isNullOrEmpty() && !body.isNullOrEmpty()) {
                "$bodyHeader: $body"
            } else "It's time for the next set!"

            val missing = Notification(reactApplicationContext, currentActivity).send(
                Notification.REST_TIMER_ID,
                duration,
                ignoreDoNotDisturb,
                vibration,
                titleVal,
                subtitleVal,
                bodyVal,
                volume
            )
            android.util.Log.d("LftTimer", "Android Notification.send result missing=$missing")
            val result = Arguments.createMap().apply {
                putBoolean("scheduled", missing == null)
                if (missing != null) putString("missingPermission", missing)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            android.util.Log.e("LftTimer", "Android startTimer threw", e)
            promise.reject("start_timer_failed", e.message, e)
        }
    }

    override fun stopTimer(promise: Promise) {
        try {
            Notification(reactApplicationContext).cancel(Notification.REST_TIMER_ID)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("stop_timer_failed", e.message, e)
        }
    }

    override fun scheduleReminder(duration: Double, title: String, body: String, promise: Promise) {
        try {
            ensureChannels()
            android.util.Log.d("LftTimer", "Android scheduleReminder duration=$duration")
            val titleVal = if (title.isEmpty()) "Workout reminder" else title
            val bodyVal = if (body.isEmpty()) "You have an ongoing workout, make sure to finish it if you're done" else body
            val missing = Notification(reactApplicationContext, currentActivity).send(
                Notification.REMINDER_ID,
                duration.toLong(),
                false,
                false,
                titleVal,
                titleVal,
                bodyVal,
                1.0f
            )
            android.util.Log.d("LftTimer", "Android reminder send result missing=$missing")
            val result = Arguments.createMap().apply {
                putBoolean("scheduled", missing == null)
                if (missing != null) putString("missingPermission", missing)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            android.util.Log.e("LftTimer", "Android scheduleReminder threw", e)
            promise.reject("schedule_reminder_failed", e.message, e)
        }
    }

    override fun cancelReminder(promise: Promise) {
        try {
            android.util.Log.d("LftTimer", "Android cancelReminder")
            Notification(reactApplicationContext).cancel(Notification.REMINDER_ID)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("cancel_reminder_failed", e.message, e)
        }
    }

    override fun playSound(volume: Double, vibration: Boolean, promise: Promise) {
        try {
            if (volume <= 0 && !vibration) {
                promise.resolve(null)
                return
            }
            val ctx = reactApplicationContext
            if (vibration) {
                val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    (ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                if (vibrator != null && vibrator.hasVibrator()) {
                    vibrator.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
                }
            }
            if (volume <= 0) {
                promise.resolve(null)
                return
            }
            audioPlayer?.let {
                try { it.release() } catch (_: Exception) {}
            }
            audioPlayer = null
            val player = MediaPlayer()
            try {
                player.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                ctx.resources.openRawResourceFd(R.raw.notif)?.use { afd ->
                    player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                } ?: run {
                    player.release()
                    promise.resolve(null)
                    return
                }
                val clamped = volume.coerceIn(0.0, 1.0).toFloat()
                player.setVolume(clamped, clamped)
                player.setOnCompletionListener {
                    it.release()
                    if (audioPlayer === it) audioPlayer = null
                }
                player.setOnErrorListener { mp, _, _ ->
                    mp.release()
                    if (audioPlayer === mp) audioPlayer = null
                    true
                }
                player.prepare()
                player.start()
                audioPlayer = player
            } catch (e: Exception) {
                try { player.release() } catch (_: Exception) {}
                throw e
            }
            promise.resolve(null)
        } catch (e: Exception) {
            android.util.Log.e("LftTimer", "Android playSound failed", e)
            promise.resolve(null)
        }
    }

    override fun getNotificationPermission(promise: Promise) {
        val granted = NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled()
        promise.resolve(if (granted) "granted" else "denied")
    }

    override fun requestNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            promise.resolve("granted")
            return
        }
        val activity = currentActivity as? PermissionAwareActivity
        if (activity == null) {
            promise.resolve("denied")
            return
        }
        if (ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve("granted")
            return
        }
        val requestCode = NOTIFICATION_PERMISSION_REQUEST_CODE
        activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            requestCode,
            PermissionListener { code, _, results ->
                if (code != requestCode) return@PermissionListener false
                val ok = results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED
                promise.resolve(if (ok) "granted" else "denied")
                true
            }
        )
    }

    override fun getExactAlarmPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve("granted")
            return
        }
        val am = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        promise.resolve(if (am.canScheduleExactAlarms()) "granted" else "denied")
    }

    override fun requestExactAlarmPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve("granted")
            return
        }
        val activity = currentActivity
        if (activity == null) {
            promise.resolve("denied")
            return
        }
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
        val am = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        promise.resolve(if (am.canScheduleExactAlarms()) "granted" else "denied")
    }

    override fun getDndAccessPermission(promise: Promise) {
        val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        promise.resolve(if (nm.isNotificationPolicyAccessGranted) "granted" else "denied")
    }

    override fun requestDndAccessPermission(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.resolve("denied")
            return
        }
        val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
        val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        promise.resolve(if (nm.isNotificationPolicyAccessGranted) "granted" else "denied")
    }

    companion object {
        const val CHANNEL_ID = "liftosaur_notifs_v2"
        const val CHANNEL_ID_DND = "liftosaur_notifs_dnd_v2"
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 41001
    }
}
