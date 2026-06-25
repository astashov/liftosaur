package com.liftosaur.www.twa

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.liftosaur.www.twa.liveactivity.LiveActivityEventDispatcher
import com.liftosaur.www.twa.liveactivity.LiveUpdateActionReceiver
import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Liftosaur"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    HealthConnectPermissionDelegate.setPermissionDelegate(this)
    // react-native-screens fragments can't be restored; passing null prevents Android
    // from re-instantiating them after the process is killed in the background.
    // https://github.com/software-mansion/react-native-screens/issues/17#issuecomment-424704067
    super.onCreate(null)
    handleLiveActivityIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleLiveActivityIntent(intent)
  }

  private fun handleLiveActivityIntent(intent: Intent?) {
    when (intent?.action) {
      LiveUpdateActionReceiver.ACTION_OPEN_AND_COMPLETE_SET -> {
        val entryIndex = intent.getIntExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, -1)
        val setIndex = intent.getIntExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, -1)
        if (entryIndex < 0 || setIndex < 0) return
        val event = Arguments.createMap().apply {
          putString("action", "completeSet")
          putInt("entryIndex", entryIndex)
          putInt("setIndex", setIndex)
        }
        LiveActivityEventDispatcher.emit(event)
        intent.removeExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX)
        intent.removeExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX)
        intent.action = null
      }

      LiveUpdateActionReceiver.ACTION_OPEN_AND_RECORD_SET_TIMER -> {
        val entryIndex = intent.getIntExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX, -1)
        val setIndex = intent.getIntExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX, -1)
        val setTimerSince = intent.getLongExtra(LiveUpdateActionReceiver.EXTRA_SET_TIMER_SINCE, 0)
        val keepTiming = intent.getBooleanExtra(LiveUpdateActionReceiver.EXTRA_KEEP_TIMING, false)
        if (entryIndex < 0 || setIndex < 0) return
        val elapsedSeconds = if (setTimerSince > 0) {
          maxOf(0L, (System.currentTimeMillis() - setTimerSince) / 1000L).toInt()
        } else 0
        val event = Arguments.createMap().apply {
          putString("action", "recordSetTimer")
          putInt("entryIndex", entryIndex)
          putInt("setIndex", setIndex)
          putInt("elapsedSeconds", elapsedSeconds)
          putBoolean("keepTiming", keepTiming)
        }
        LiveActivityEventDispatcher.emit(event)
        intent.removeExtra(LiveUpdateActionReceiver.EXTRA_ENTRY_INDEX)
        intent.removeExtra(LiveUpdateActionReceiver.EXTRA_SET_INDEX)
        intent.removeExtra(LiveUpdateActionReceiver.EXTRA_SET_TIMER_SINCE)
        intent.removeExtra(LiveUpdateActionReceiver.EXTRA_KEEP_TIMING)
        intent.action = null
      }
    }
  }
}
