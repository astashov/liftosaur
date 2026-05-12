package com.liftosaur.www.twa.liveactivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.ReadableMap
import com.liftosaur.www.twa.MainActivity
import com.liftosaur.www.twa.R

class LiveUpdateManager(private val context: Context) {
    private var isChannelCreated = false
    private var isChannelDndCreated = false
    private var currentState: LiveActivityState? = null
    private var restTimerHandler: Handler? = null
    private var restTimerRunnable: Runnable? = null
    private var isRestTimerExpired = false
    private var isForegroundServiceRunning = false

    companion object {
        const val LIVE_UPDATE_CHANNEL_ID = "liftosaur_live_updates_v2"
        const val LIVE_UPDATE_CHANNEL_DND_ID = "liftosaur_live_updates_dnd_v2"
        const val LIVE_UPDATE_NOTIFICATION_ID = 100
    }

    data class LiveActivitySet(
        val status: String,
        val isWarmup: Boolean
    )

    data class LiveActivityEntry(
        val exerciseName: String,
        val currentSet: Int,
        val totalSets: Int,
        val completedSets: List<LiveActivitySet>,
        val canCompleteFromLiveActivity: Boolean,
        val isWarmup: Boolean,
        val entryIndex: Int,
        val setIndex: Int,
        val exerciseImageUrl: String?,
        val targetReps: String?,
        val targetWeight: String?,
        val targetRPE: String?,
        val targetTimer: String?,
        val plates: String?,
        val currentWeight: String?,
        val currentReps: String?
    )

    data class LiveActivityRest(
        val restTimerSince: Long,
        val restTimer: Int
    )

    data class LiveActivityState(
        val workoutStartTimestamp: Long,
        val entry: LiveActivityEntry?,
        val restTimer: LiveActivityRest?,
        val ignoreDoNotDisturb: Boolean
    )

    private fun createNotificationChannels() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (!isChannelCreated) {
            val channel = NotificationChannel(
                LIVE_UPDATE_CHANNEL_ID,
                "Workout Live Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Shows current workout progress"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
            isChannelCreated = true
        }

        if (!isChannelDndCreated) {
            val channelDnd = NotificationChannel(
                LIVE_UPDATE_CHANNEL_DND_ID,
                "Workout Live Updates (Bypass DND)",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Shows current workout progress, bypasses Do Not Disturb"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
            }
            notificationManager.createNotificationChannel(channelDnd)
            isChannelDndCreated = true
        }
    }

    fun updateLiveActivity(stateMap: ReadableMap) {
        createNotificationChannels()

        try {
            val state = parseState(stateMap) ?: return
            currentState = state

            cancelRestTimerCallback()
            isRestTimerExpired = false

            if (state.restTimer != null) {
                scheduleRestTimerExpiry(state.restTimer)
            }

            val notification = showNotification(state, isRestTimerExpired)

            if (!isForegroundServiceRunning) {
                WorkoutForegroundService.start(context, notification)
                isForegroundServiceRunning = true
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun optStringOrNull(map: ReadableMap, key: String): String? {
        if (!map.hasKey(key) || map.isNull(key)) return null
        val s = map.getString(key)
        return if (s.isNullOrEmpty()) null else s
    }

    private fun parseState(map: ReadableMap): LiveActivityState? {
        val workoutStartTimestamp = map.getDouble("workoutStartTimestamp").toLong()

        val entryMap = if (map.hasKey("entry") && !map.isNull("entry")) map.getMap("entry") else null
        val entry = if (entryMap != null) {
            val completedSets = mutableListOf<LiveActivitySet>()
            if (entryMap.hasKey("completedSets") && !entryMap.isNull("completedSets")) {
                val setsArray = entryMap.getArray("completedSets")
                if (setsArray != null) {
                    for (i in 0 until setsArray.size()) {
                        val setMap = setsArray.getMap(i)
                        if (setMap != null) {
                            completedSets.add(
                                LiveActivitySet(
                                    status = setMap.getString("status") ?: "not-finished",
                                    isWarmup = setMap.getBoolean("isWarmup")
                                )
                            )
                        }
                    }
                }
            }

            LiveActivityEntry(
                exerciseName = entryMap.getString("exerciseName") ?: "",
                currentSet = entryMap.getInt("currentSet"),
                totalSets = entryMap.getInt("totalSets"),
                completedSets = completedSets,
                canCompleteFromLiveActivity = entryMap.getBoolean("canCompleteFromLiveActivity"),
                isWarmup = entryMap.getBoolean("isWarmup"),
                entryIndex = entryMap.getInt("entryIndex"),
                setIndex = entryMap.getInt("setIndex"),
                exerciseImageUrl = optStringOrNull(entryMap, "exerciseImageUrl"),
                targetReps = optStringOrNull(entryMap, "targetReps"),
                targetWeight = optStringOrNull(entryMap, "targetWeight"),
                targetRPE = optStringOrNull(entryMap, "targetRPE"),
                targetTimer = optStringOrNull(entryMap, "targetTimer"),
                plates = optStringOrNull(entryMap, "plates"),
                currentWeight = optStringOrNull(entryMap, "currentWeight"),
                currentReps = optStringOrNull(entryMap, "currentReps")
            )
        } else null

        val restMap = if (map.hasKey("rest") && !map.isNull("rest")) map.getMap("rest") else null
        val restTimer = if (restMap != null) {
            LiveActivityRest(
                restTimerSince = restMap.getDouble("restTimerSince").toLong(),
                restTimer = restMap.getInt("restTimer")
            )
        } else null

        val ignoreDoNotDisturb =
            map.hasKey("ignoreDoNotDisturb") && !map.isNull("ignoreDoNotDisturb") && map.getBoolean("ignoreDoNotDisturb")

        return LiveActivityState(
            workoutStartTimestamp = workoutStartTimestamp,
            entry = entry,
            restTimer = restTimer,
            ignoreDoNotDisturb = ignoreDoNotDisturb
        )
    }

    private fun scheduleRestTimerExpiry(restTimer: LiveActivityRest) {
        val targetTimestamp = restTimer.restTimerSince + (restTimer.restTimer * 1000L)
        val now = System.currentTimeMillis()
        val delay = targetTimestamp - now

        if (delay <= 0) {
            isRestTimerExpired = true
            return
        }

        restTimerHandler = Handler(Looper.getMainLooper())
        restTimerRunnable = Runnable {
            isRestTimerExpired = true
            currentState?.let { state ->
                showNotification(state, true)
            }
        }
        restTimerHandler?.postDelayed(restTimerRunnable!!, delay)
    }

    private fun cancelRestTimerCallback() {
        restTimerRunnable?.let { runnable ->
            restTimerHandler?.removeCallbacks(runnable)
        }
        restTimerHandler = null
        restTimerRunnable = null
    }

    private fun showNotification(state: LiveActivityState, isTimerExpired: Boolean): android.app.Notification {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val activityIntent = Intent(context, MainActivity::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(context, 0, activityIntent, flags)

        val entry = state.entry
        val restTimer = state.restTimer

        val restTimerSuffix = if (restTimer != null) {
            val minutes = restTimer.restTimer / 60
            val seconds = restTimer.restTimer % 60
            " (${minutes}:${String.format("%02d", seconds)})"
        } else ""

        val title = if (entry != null) {
            val warmupPrefix = if (entry.isWarmup) "Warmup: " else ""
            "$warmupPrefix${entry.exerciseName}$restTimerSuffix"
        } else {
            "All exercises completed!"
        }

        val contentText = buildContentText(entry)

        val notificationColor = if (isTimerExpired) {
            Color.RED
        } else {
            Color.parseColor("#8364E8")
        }

        val channelId = if (state.ignoreDoNotDisturb) LIVE_UPDATE_CHANNEL_DND_ID else LIVE_UPDATE_CHANNEL_ID
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(contentText)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(notificationColor)
            .setColorized(false)

        if (restTimer != null) {
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(false)
            builder.setWhen(restTimer.restTimerSince)
        } else {
            builder.setUsesChronometer(true)
            builder.setChronometerCountDown(false)
            builder.setWhen(state.workoutStartTimestamp)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        }

        if (Build.VERSION.SDK_INT >= 36) {
            builder.setRequestPromotedOngoing(true)
        }

        if (entry != null && restTimer != null) {
            val minusIntent = Intent(context, LiveUpdateActionReceiver::class.java).apply {
                action = LiveUpdateActionReceiver.ACTION_ADJUST_TIMER_MINUS
                putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, entry.entryIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, entry.setIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_REST_TIMER, restTimer.restTimer)
                putExtra(LiveUpdateActionReceiver.EXTRA_REST_TIMER_SINCE, restTimer.restTimerSince)
            }
            val minusPendingIntent = PendingIntent.getBroadcast(
                context, 2, minusIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "-15s", minusPendingIntent)

            val plusIntent = Intent(context, LiveUpdateActionReceiver::class.java).apply {
                action = LiveUpdateActionReceiver.ACTION_ADJUST_TIMER_PLUS
                putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, entry.entryIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, entry.setIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_REST_TIMER, restTimer.restTimer)
                putExtra(LiveUpdateActionReceiver.EXTRA_REST_TIMER_SINCE, restTimer.restTimerSince)
            }
            val plusPendingIntent = PendingIntent.getBroadcast(
                context, 1, plusIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "+15s", plusPendingIntent)

            if (entry.canCompleteFromLiveActivity) {
                val completeIntent = Intent(context, LiveUpdateActionReceiver::class.java).apply {
                    action = LiveUpdateActionReceiver.ACTION_COMPLETE_SET
                    putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, entry.entryIndex)
                    putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, entry.setIndex)
                }
                val completePendingIntent = PendingIntent.getBroadcast(
                    context, 3, completeIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                builder.addAction(0, "✓ Done", completePendingIntent)
            } else {
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    action = LiveUpdateActionReceiver.ACTION_OPEN_AND_COMPLETE_SET
                    putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, entry.entryIndex)
                    putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, entry.setIndex)
                }
                val openPendingIntent = PendingIntent.getActivity(
                    context, 3, openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                builder.addAction(0, "✓ Done", openPendingIntent)
            }
        }

        val notification = builder.build()
        notificationManager.notify(LIVE_UPDATE_NOTIFICATION_ID, notification)
        return notification
    }

    private fun buildContentText(entry: LiveActivityEntry?): String {
        val parts = mutableListOf<String>()

        if (entry != null) {
            parts.add("Set ${entry.currentSet}/${entry.totalSets}")

            val targetParts = mutableListOf<String>()
            entry.targetReps?.let { targetParts.add(it) }
            entry.targetWeight?.let { targetParts.add(it) }
            if (targetParts.isNotEmpty()) {
                var targetText = if (entry.isWarmup) "Warmup: " else "Target: "
                targetText += targetParts.joinToString(" × ")
                entry.targetRPE?.let { targetText += " @$it" }
                entry.targetTimer?.let { targetText += " ${it}s" }
                parts.add(targetText)
            }

            entry.plates?.let {
                if (it.isNotEmpty()) {
                    parts.add("Plates: $it")
                }
            }
        }

        return parts.joinToString(" • ")
    }

    fun endLiveActivity() {
        cancelRestTimerCallback()
        currentState = null
        isRestTimerExpired = false

        if (isForegroundServiceRunning) {
            WorkoutForegroundService.stop(context)
            isForegroundServiceRunning = false
        }

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(LIVE_UPDATE_NOTIFICATION_ID)
    }

    fun adjustRestTimer(newRestTimer: Int, restTimerSince: Long) {
        val state = currentState ?: return
        val updatedRestTimer = LiveActivityRest(restTimerSince, newRestTimer)
        currentState = state.copy(restTimer = updatedRestTimer)

        cancelRestTimerCallback()
        isRestTimerExpired = false

        if (newRestTimer > 0) {
            scheduleRestTimerExpiry(updatedRestTimer)
        }

        showNotification(currentState!!, isRestTimerExpired)
    }
}
