package com.liftosaur.www.twa

import android.app.Application
import android.content.ComponentCallbacks2
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.liftosaur.www.twa.eventreporter.EventReporterDispatcher
import com.liftosaur.www.twa.eventreporter.EventReporterTombstone
import com.liftosaur.www.twa.eventreporter.LastTerminationHolder
import com.liftosaur.www.twa.eventreporter.LiftosaurEventReporterPackage
import com.liftosaur.www.twa.fasttext.FastTextPackage
import com.liftosaur.www.twa.lftupdater.LftUpdaterPackage
import com.liftosaur.www.twa.lftupdater.LftUpdaterPath
import com.liftosaur.www.twa.liveactivity.LiftosaurLiveActivityPackage
import com.liftosaur.www.twa.share.LiftosaurSharePackage
import com.liftosaur.www.twa.timer.LiftosaurTimerPackage
import com.rollbar.RollbarReactNative

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(LiftosaurSharePackage())
          add(LiftosaurTimerPackage())
          add(LiftosaurLiveActivityPackage())
          add(LiftosaurEventReporterPackage())
          add(LftUpdaterPackage())
          add(FastTextPackage())
        },
      jsMainModulePath = "index",
      jsBundleFilePath = if (BuildConfig.DISABLE_OTA) null else LftUpdaterPath.effectiveBundleFilePath(this),
    )
  }

  override fun onCreate() {
    super.onCreate()
    val prefs = getSharedPreferences("LftUpdater", MODE_PRIVATE)
    if (prefs.getBoolean("launchInProgress", false)) {
      val count = prefs.getInt("crashCount", 0) + 1
      prefs.edit().putInt("crashCount", count).apply()
      Log.w("LftUpdater", "previous launch did not complete; crashCount=$count activeId=${LftUpdaterPath.activeUpdateId(this) ?: "<none>"}")
      if (count >= 3) {
        Log.e("LftUpdater", "crashCount reached $count, reverting to embedded bundle")
        LftUpdaterPath.revertToEmbedded(this)
        prefs.edit().putInt("crashCount", 0).apply()
      }
    } else {
      Log.i("LftUpdater", "launch starting, activeId=${LftUpdaterPath.activeUpdateId(this) ?: "<none>"}")
    }
    prefs.edit().putBoolean("launchInProgress", true).apply()
    LastTerminationHolder.set(EventReporterTombstone.consumeAndArm(this))
    RollbarReactNative.init(this, "f29180c0746c4922996ff41dfc2527d2", "android-rn")
    loadReactNative(this)
  }

  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    val label = when (level) {
      ComponentCallbacks2.TRIM_MEMORY_RUNNING_MODERATE -> "running_moderate"
      ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> "running_low"
      ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> "running_critical"
      ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> "ui_hidden"
      ComponentCallbacks2.TRIM_MEMORY_BACKGROUND -> "background"
      ComponentCallbacks2.TRIM_MEMORY_MODERATE -> "moderate"
      ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> "complete"
      else -> "level_$level"
    }
    EventReporterDispatcher.emit("android-trim-memory", mapOf("level" to label))
  }
}
