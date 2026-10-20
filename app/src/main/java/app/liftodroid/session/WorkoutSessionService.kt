package app.liftodroid.session

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import app.liftodroid.LiftoDroidApp
import app.liftodroid.MainActivity
import app.liftodroid.R
import app.liftodroid.data.ActiveWorkout
import app.liftodroid.domain.Weight
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Lives exactly as long as a workout does. It keeps the process alive between sets, owns the rest
 * countdown (ticks + "rest over" buzz even with the screen off), and shows an ongoing lock-screen
 * notification with the timer and controls, so the lifter never has to unlock between sets.
 */
class WorkoutSessionService : LifecycleService() {

    private val container get() = (application as LiftoDroidApp).container
    private lateinit var haptics: Haptics
    private var countdown: Job? = null

    override fun onCreate() {
        super.onCreate()
        haptics = Haptics(this)
        ensureChannels(this)
        ServiceCompat.startForeground(
            this, NOTIF_ID, baseBuilder().setContentTitle(getString(R.string.app_name)).build(),
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
        )

        lifecycleScope.launch {
            container.workouts.active.collect { active ->
                if (active == null || active.finishing) {
                    stopSelf()
                    return@collect
                }
                notify(active)
            }
        }
        lifecycleScope.launch {
            container.workouts.active.map { it?.restEndsAtMs ?: 0L }.distinctUntilChanged().collect(::runCountdown)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        val repo = container.workouts
        when (intent?.action) {
            ACTION_ADD_30 -> lifecycleScope.launch { repo.adjustRest(30) }
            ACTION_SUB_15 -> lifecycleScope.launch { repo.adjustRest(-15) }
            ACTION_SKIP -> lifecycleScope.launch { repo.skipRest() }
        }
        return START_STICKY
    }

    private fun runCountdown(endsAt: Long) {
        countdown?.cancel()
        if (endsAt <= System.currentTimeMillis()) return
        countdown = lifecycleScope.launch {
            var lastTick = -1
            while (true) {
                val leftMs = endsAt - System.currentTimeMillis()
                val left = ((leftMs + 999) / 1000).toInt()
                if (leftMs <= 0) {
                    haptics.restOver()
                    container.workouts.skipRest()
                    alertRestOver()
                    break
                }
                if (left in 1..3 && left != lastTick) {
                    haptics.countdownTick(left)
                    lastTick = left
                }
                delay((leftMs % 1000).coerceAtLeast(16))
            }
        }
    }

    private fun notify(a: ActiveWorkout) {
        val nm = getSystemService(NotificationManager::class.java)
        val resting = a.restEndsAtMs > System.currentTimeMillis()
        val next = a.workout.entries.firstNotNullOfOrNull { e -> e.sets.firstOrNull { it.completed == null }?.let { e to it } }
        val nextLine = next?.let { (e, s) ->
            val w = Weight.parse(s.weight)?.display() ?: ""
            "${e.name}  ${listOfNotNull(w.ifEmpty { null }, s.reps?.let { "× $it${if (s.isAmrap) "+" else ""}" }).joinToString(" ")}"
        } ?: getString(R.string.all_sets_done)

        val b = baseBuilder()
        if (resting) {
            val leftSec = ((a.restEndsAtMs - System.currentTimeMillis()) / 1000).toInt()
            b.setContentTitle(getString(R.string.resting))
                .setContentText(getString(R.string.up_next_fmt, nextLine))
                .setWhen(a.restEndsAtMs)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setProgress(a.restTotalSec.coerceAtLeast(1), (a.restTotalSec - leftSec).coerceIn(0, a.restTotalSec), false)
                .addAction(0, "−15s", service(ACTION_SUB_15))
                .addAction(0, "+30s", service(ACTION_ADD_30))
                .addAction(0, getString(R.string.skip), service(ACTION_SKIP))
        } else {
            b.setContentTitle(a.workout.dayName ?: getString(R.string.workout))
                .setContentText(nextLine)
                .setUsesChronometer(true)
                .setWhen(a.workout.startTime)
        }
        if (!a.isSynced) b.setSubText(getString(R.string.queued_fmt, a.queuedWrites))
        nm.notify(NOTIF_ID, b.build())
    }

    private fun alertRestOver() {
        getSystemService(NotificationManager::class.java).notify(
            ALERT_ID,
            NotificationCompat.Builder(this, CHANNEL_ALERT)
                .setSmallIcon(R.drawable.ic_stat_liftodroid)
                .setContentTitle(getString(R.string.rest_over))
                .setContentIntent(openApp())
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setTimeoutAfter(15_000)
                .setAutoCancel(true)
                .build(),
        )
    }

    private fun baseBuilder() = NotificationCompat.Builder(this, CHANNEL_SESSION)
        .setSmallIcon(R.drawable.ic_stat_liftodroid)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setCategory(NotificationCompat.CATEGORY_WORKOUT)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .setContentIntent(openApp())

    private fun openApp() = PendingIntent.getActivity(
        this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun service(action: String) = PendingIntent.getService(
        this, action.hashCode(), Intent(this, WorkoutSessionService::class.java).setAction(action),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    companion object {
        const val CHANNEL_SESSION = "session"
        const val CHANNEL_ALERT = "rest_alert"
        private const val NOTIF_ID = 17
        private const val ALERT_ID = 18
        private const val ACTION_ADD_30 = "app.liftodroid.REST_ADD_30"
        private const val ACTION_SUB_15 = "app.liftodroid.REST_SUB_15"
        private const val ACTION_SKIP = "app.liftodroid.REST_SKIP"

        fun start(context: Context) =
            ContextCompat.startForegroundService(context, Intent(context, WorkoutSessionService::class.java))

        fun ensureChannels(context: Context) {
            val nm = context.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_SESSION, context.getString(R.string.channel_session), NotificationManager.IMPORTANCE_LOW).apply {
                    setShowBadge(false)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                },
            )
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ALERT, context.getString(R.string.channel_alert), NotificationManager.IMPORTANCE_HIGH).apply {
                    enableVibration(false) // Haptics plays our own pattern; avoid a double buzz.
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                },
            )
        }
    }
}
