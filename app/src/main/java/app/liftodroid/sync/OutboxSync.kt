package app.liftodroid.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.liftodroid.LiftoDroidApp
import app.liftodroid.R
import app.liftodroid.data.DrainResult
import app.liftodroid.data.SyncScheduler
import app.liftodroid.session.WorkoutSessionService
import java.util.concurrent.TimeUnit

/**
 * Drains the outbox. Expedited so a set logged on the last bar of signal leaves immediately; the
 * CONNECTED constraint parks it until the gym Wi-Fi or LTE comes back, even if the app was killed.
 */
class OutboxWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val repo = (applicationContext as LiftoDroidApp).container.workouts
        return when (repo.drain()) {
            DrainResult.Done -> Result.success()
            DrainResult.Retry -> Result.retry()
            // Need the lifter: a sheet in the app takes over. Don't burn retries in the background.
            DrainResult.AuthRequired, is DrainResult.Conflict, is DrainResult.Blocked -> Result.success()
        }
    }

    /** Expedited work needs this below API 31; it's shown only if the OS runs us as a foreground job. */
    override suspend fun getForegroundInfo(): ForegroundInfo {
        WorkoutSessionService.ensureChannels(applicationContext)
        val n = NotificationCompat.Builder(applicationContext, WorkoutSessionService.CHANNEL_SESSION)
            .setSmallIcon(R.drawable.ic_stat_liftodroid)
            .setContentTitle(applicationContext.getString(R.string.syncing))
            .setSilent(true)
            .build()
        return ForegroundInfo(SYNC_NOTIF_ID, n)
    }

    private companion object {
        const val SYNC_NOTIF_ID = 19
    }
}

class WorkManagerSyncScheduler(private val context: Context) : SyncScheduler {
    override fun schedule() {
        val request = OneTimeWorkRequestBuilder<OutboxWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build()
        // APPEND_OR_REPLACE: a drain already running finishes, and one more runs after it to pick up
        // whatever was logged meanwhile. The drain itself is mutex-guarded and idempotent.
        WorkManager.getInstance(context).enqueueUniqueWork(UNIQUE, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }

    private companion object {
        const val UNIQUE = "liftodroid-outbox"
    }
}
