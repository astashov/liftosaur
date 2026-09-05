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
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import com.liftosaur.www.twa.MainActivity
import com.liftosaur.www.twa.R

class LiveUpdateManager(private val context: Context) {
    private var isChannelCreated = false
    private var isChannelDndCreated = false
    private var currentState: LiveActivityState? = null
    private var restTimerHandler: Handler? = null
    private var restTimerRunnable: Runnable? = null
    private var reconcileHandler: Handler? = null
    private var reconcileRunnable: Runnable? = null
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
        val currentReps: String?,
        val isSetTimer: Boolean
    )

    data class LiveActivityRest(
        val restTimerSince: Long,
        val restTimer: Int,
        val isAuto: Boolean
    )

    data class LiveActivitySetTimer(
        val setTimerSince: Long,
        val setTimer: Int,
        val isOverflow: Boolean,
        val isCompleted: Boolean,
        val entryIndex: Int,
        val setIndex: Int,
        val restTimer: Int
    )

    data class LiveActivityGetReady(
        val getReadySince: Long,
        val getReady: Int,
        val entryIndex: Int,
        val setIndex: Int,
        val setTimer: Int
    )

    data class LiveActivityState(
        val workoutStartTimestamp: Long,
        val entry: LiveActivityEntry?,
        val restTimer: LiveActivityRest?,
        val setTimer: LiveActivitySetTimer?,
        val getReady: LiveActivityGetReady?,
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
            cancelPendingReconcile()
            isRestTimerExpired = false

            if (state.restTimer != null) {
                scheduleRestTimerExpiry(state.restTimer)
            }
            state.setTimer?.let { setTimer ->
                if (!setTimer.isOverflow && setTimer.setTimer > 0) {
                    scheduleReconcileAt(setTimer.setTimerSince + (setTimer.setTimer * 1000L))
                }
            }
            state.getReady?.let { getReady ->
                if (getReady.getReady > 0) {
                    scheduleReconcileAt(getReady.getReadySince + (getReady.getReady * 1000L))
                }
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
                currentReps = optStringOrNull(entryMap, "currentReps"),
                isSetTimer = entryMap.hasKey("isSetTimer") && entryMap.getBoolean("isSetTimer")
            )
        } else null

        val restMap = if (map.hasKey("rest") && !map.isNull("rest")) map.getMap("rest") else null
        val restTimer = if (restMap != null) {
            LiveActivityRest(
                restTimerSince = restMap.getDouble("restTimerSince").toLong(),
                restTimer = restMap.getInt("restTimer"),
                isAuto = restMap.hasKey("isAuto") && restMap.getBoolean("isAuto")
            )
        } else null

        val setTimerMap = if (map.hasKey("setTimer") && !map.isNull("setTimer")) map.getMap("setTimer") else null
        val setTimer = if (setTimerMap != null) {
            LiveActivitySetTimer(
                setTimerSince = setTimerMap.getDouble("setTimerSince").toLong(),
                setTimer = setTimerMap.getInt("setTimer"),
                isOverflow = setTimerMap.getBoolean("isOverflow"),
                isCompleted = setTimerMap.getBoolean("isCompleted"),
                entryIndex = setTimerMap.getInt("entryIndex"),
                setIndex = setTimerMap.getInt("setIndex"),
                restTimer = setTimerMap.getInt("restTimer")
            )
        } else null

        val getReadyMap = if (map.hasKey("getReady") && !map.isNull("getReady")) map.getMap("getReady") else null
        val getReady = if (getReadyMap != null) {
            LiveActivityGetReady(
                getReadySince = getReadyMap.getDouble("getReadySince").toLong(),
                getReady = getReadyMap.getInt("getReady"),
                entryIndex = getReadyMap.getInt("entryIndex"),
                setIndex = getReadyMap.getInt("setIndex"),
                setTimer = getReadyMap.getInt("setTimer")
            )
        } else null

        val ignoreDoNotDisturb =
            map.hasKey("ignoreDoNotDisturb") && !map.isNull("ignoreDoNotDisturb") && map.getBoolean("ignoreDoNotDisturb")

        return LiveActivityState(
            workoutStartTimestamp = workoutStartTimestamp,
            entry = entry,
            restTimer = restTimer,
            setTimer = setTimer,
            getReady = getReady,
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
            // Unlike iOS (which may be suspended), the foreground service keeps us alive, so an `auto` circuit
            // can advance to the next set's timer the moment its rest ends. JS reconciles + re-pushes the new
            // set-timer state; a no-op if there's no next timed set, leaving the expired (red) notification.
            if (restTimer.isAuto) {
                emitCheckSetTimer()
            }
        }
        restTimerHandler?.postDelayed(restTimerRunnable!!, delay)
    }

    private fun emitCheckSetTimer() {
        val event = Arguments.createMap().apply {
            putString("action", "checkSetTimer")
        }
        LiveActivityEventDispatcher.emit(event)
    }

    private fun cancelRestTimerCallback() {
        restTimerRunnable?.let { runnable ->
            restTimerHandler?.removeCallbacks(runnable)
        }
        restTimerHandler = null
        restTimerRunnable = null
    }

    // When a non-overflow set timer reaches its target, the next state (rest, or the next circuit set) is
    // JS-only logic, so nudge the app to reconcile + re-push so the live update switches to the rest timer.
    // The foreground service keeps us alive, so unlike iOS this fires reliably even while backgrounded.
    // Shared with the get-ready countdown, whose end (the flip to the work clock) is JS-only for the same reason.
    private fun scheduleReconcileAt(targetTimestamp: Long) {
        val delay = targetTimestamp - System.currentTimeMillis()
        if (delay <= 0) return

        reconcileHandler = Handler(Looper.getMainLooper())
        reconcileRunnable = Runnable {
            emitCheckSetTimer()
        }
        reconcileHandler?.postDelayed(reconcileRunnable!!, delay)
    }

    private fun cancelPendingReconcile() {
        reconcileRunnable?.let { runnable ->
            reconcileHandler?.removeCallbacks(runnable)
        }
        reconcileHandler = null
        reconcileRunnable = null
    }

    private fun showNotification(state: LiveActivityState, isTimerExpired: Boolean): android.app.Notification {
        if (state.setTimer != null) {
            return showSetTimerNotification(state, state.setTimer, isTimerExpired)
        }
        if (state.getReady != null) {
            return showGetReadyNotification(state, state.getReady)
        }
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

            // Completing a timed set opens its count-up clock rather than logging a rep, so label it "Start".
            val completeLabel = if (entry.isSetTimer) "▶ Start" else "✓ Done"

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
                builder.addAction(0, completeLabel, completePendingIntent)
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
                builder.addAction(0, completeLabel, openPendingIntent)
            }
        }

        val notification = builder.build()
        notificationManager.notify(LIVE_UPDATE_NOTIFICATION_ID, notification)
        return notification
    }

    private fun showSetTimerNotification(
        state: LiveActivityState,
        setTimer: LiveActivitySetTimer,
        isOvertime: Boolean
    ): android.app.Notification {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val activityIntent = Intent(context, MainActivity::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(context, 0, activityIntent, flags)

        val entry = state.entry

        // Mirror the rest timer title, which appends the target duration as a "(1:00)" suffix after the
        // exercise name — here it's "(of 0:30)" so it reads as the count-up target rather than a rest.
        val targetSuffix = if (setTimer.setTimer > 0) {
            val minutes = setTimer.setTimer / 60
            val seconds = setTimer.setTimer % 60
            " (of ${minutes}:${String.format("%02d", seconds)})"
        } else ""

        val title = if (entry != null) {
            val warmupPrefix = if (entry.isWarmup) "Warmup: " else ""
            "$warmupPrefix${entry.exerciseName}$targetSuffix"
        } else {
            "Set timer$targetSuffix"
        }

        val contentParts = mutableListOf<String>()
        if (entry != null) {
            contentParts.add("Set ${entry.currentSet}/${entry.totalSets}")
            val targetParts = mutableListOf<String>()
            entry.targetReps?.let { targetParts.add(it) }
            entry.targetWeight?.let { targetParts.add(it) }
            if (targetParts.isNotEmpty()) {
                var targetText = "Target: " + targetParts.joinToString(" × ")
                entry.targetRPE?.let { targetText += " @$it" }
                contentParts.add(targetText)
            }
        }
        val contentText = contentParts.joinToString(" • ")

        val notificationColor = if (isOvertime) Color.RED else Color.parseColor("#8364E8")

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
            .setUsesChronometer(true)
            .setChronometerCountDown(false)
            .setWhen(setTimer.setTimerSince)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        }

        if (Build.VERSION.SDK_INT >= 36) {
            builder.setRequestPromotedOngoing(true)
        }

        // Once the set is logged (via "Log & keep"), "Stop & record" would just overwrite the kept time with a
        // later one, so hide it too — only "Log & keep" and "Stop & record" exist while the set is unlogged.
        if (!setTimer.isCompleted) {
            val canComplete = state.entry?.canCompleteFromLiveActivity ?: true
            builder.addAction(0, "Stop & record", recordSetTimerPendingIntent(setTimer, false, canComplete, 4))
            builder.addAction(0, "Log & keep", recordSetTimerPendingIntent(setTimer, true, canComplete, 5))
        }

        val notification = builder.build()
        notificationManager.notify(LIVE_UPDATE_NOTIFICATION_ID, notification)
        return notification
    }

    // Only "Go" (skip the rest of the countdown) — nothing to record yet, so no record actions. The
    // chronometer counts down to the moment work begins, which is also when scheduleReconcileAt
    // nudges JS to flip the state.
    private fun showGetReadyNotification(
        state: LiveActivityState,
        getReady: LiveActivityGetReady
    ): android.app.Notification {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val activityIntent = Intent(context, MainActivity::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(context, 0, activityIntent, flags)

        val entry = state.entry

        val nextSuffix = if (getReady.setTimer > 0) {
            val minutes = getReady.setTimer / 60
            val seconds = getReady.setTimer % 60
            " (then ${minutes}:${String.format("%02d", seconds)})"
        } else ""

        val title = if (entry != null) {
            val warmupPrefix = if (entry.isWarmup) "Warmup: " else ""
            "$warmupPrefix${entry.exerciseName}$nextSuffix"
        } else {
            "Get ready$nextSuffix"
        }

        val contentParts = mutableListOf("Get ready")
        if (entry != null) {
            contentParts.add("Set ${entry.currentSet}/${entry.totalSets}")
            val targetParts = mutableListOf<String>()
            entry.targetReps?.let { targetParts.add(it) }
            entry.targetWeight?.let { targetParts.add(it) }
            if (targetParts.isNotEmpty()) {
                var targetText = "Target: " + targetParts.joinToString(" × ")
                entry.targetRPE?.let { targetText += " @$it" }
                contentParts.add(targetText)
            }
        }

        val channelId = if (state.ignoreDoNotDisturb) LIVE_UPDATE_CHANNEL_DND_ID else LIVE_UPDATE_CHANNEL_ID
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(contentParts.joinToString(" • "))
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(Color.parseColor("#FFDD7E"))
            .setColorized(false)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setWhen(getReady.getReadySince + (getReady.getReady * 1000L))

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        }

        if (Build.VERSION.SDK_INT >= 36) {
            builder.setRequestPromotedOngoing(true)
        }

        val goIntent = Intent(context, LiveUpdateActionReceiver::class.java).apply {
            action = LiveUpdateActionReceiver.ACTION_START_SET_TIMER_WORK
            putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, getReady.entryIndex)
            putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, getReady.setIndex)
            putExtra(LiveUpdateActionReceiver.EXTRA_GET_READY_SINCE, getReady.getReadySince)
        }
        builder.addAction(
            0,
            "Go",
            PendingIntent.getBroadcast(context, 6, goIntent, flags)
        )

        val notification = builder.build()
        notificationManager.notify(LIVE_UPDATE_NOTIFICATION_ID, notification)
        return notification
    }

    private fun recordSetTimerPendingIntent(
        setTimer: LiveActivitySetTimer,
        keepTiming: Boolean,
        canComplete: Boolean,
        requestCode: Int
    ): PendingIntent {
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return if (canComplete) {
            val intent = Intent(context, LiveUpdateActionReceiver::class.java).apply {
                action = if (keepTiming) {
                    LiveUpdateActionReceiver.ACTION_RECORD_SET_TIMER_KEEP
                } else {
                    LiveUpdateActionReceiver.ACTION_RECORD_SET_TIMER
                }
                putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, setTimer.entryIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, setTimer.setIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_SET_TIMER_SINCE, setTimer.setTimerSince)
            }
            PendingIntent.getBroadcast(context, requestCode, intent, flags)
        } else {
            // Recording would open the AMRAP / ask-weight / RPE modal, which needs the app in the foreground —
            // launch it and let MainActivity emit the record once JS is alive (a broadcast would silently queue
            // the modal behind the lock screen). Mirrors iOS's OpenWorkoutRecordSetTimerIntent.
            val intent = Intent(context, MainActivity::class.java).apply {
                setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                action = LiveUpdateActionReceiver.ACTION_OPEN_AND_RECORD_SET_TIMER
                putExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, setTimer.entryIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, setTimer.setIndex)
                putExtra(LiveUpdateActionReceiver.EXTRA_SET_TIMER_SINCE, setTimer.setTimerSince)
                putExtra(LiveUpdateActionReceiver.EXTRA_KEEP_TIMING, keepTiming)
            }
            PendingIntent.getActivity(context, requestCode, intent, flags)
        }
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
        cancelPendingReconcile()
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
        val updatedRestTimer = LiveActivityRest(restTimerSince, newRestTimer, state.restTimer?.isAuto ?: false)
        currentState = state.copy(restTimer = updatedRestTimer)

        cancelRestTimerCallback()
        isRestTimerExpired = false

        if (newRestTimer > 0) {
            scheduleRestTimerExpiry(updatedRestTimer)
        }

        showNotification(currentState!!, isRestTimerExpired)
    }
}
