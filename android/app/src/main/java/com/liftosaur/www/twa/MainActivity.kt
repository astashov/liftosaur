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
    super.onCreate(savedInstanceState)
    handleLiveActivityIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleLiveActivityIntent(intent)
  }

  private fun handleLiveActivityIntent(intent: Intent?) {
    if (intent?.action != LiveUpdateActionReceiver.ACTION_OPEN_AND_COMPLETE_SET) return
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
}
