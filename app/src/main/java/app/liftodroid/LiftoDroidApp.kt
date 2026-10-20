package app.liftodroid

import android.app.Application
import android.content.Context
import app.liftodroid.data.InsightsRepository
import app.liftodroid.data.WorkoutRepository
import app.liftodroid.data.local.LiftoDatabase
import app.liftodroid.data.local.SettingsStore
import app.liftodroid.data.remote.LiftosaurApi
import app.liftodroid.session.Haptics
import app.liftodroid.sync.WorkManagerSyncScheduler
import io.ktor.client.engine.okhttp.OkHttp

/** Manual DI: one graph, built once. Small enough that a framework would cost more than it saves. */
class AppContainer(context: Context) {
    val settings = SettingsStore(context, BuildConfig.VERSION_NAME)
    private val db = LiftoDatabase.create(context)
    val api = LiftosaurApi(
        engine = OkHttp.create(),
        baseUrl = BuildConfig.API_BASE_URL,
        apiKey = settings::apiKey,
        identity = settings::identity,
    )
    val workouts = WorkoutRepository(api, db.workoutDao(), db.cacheDao(), WorkManagerSyncScheduler(context))
    val insights = InsightsRepository(api, db.cacheDao())
    val haptics = Haptics(context)
}

class LiftoDroidApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
