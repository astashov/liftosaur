package com.liftosaur.www.twa.liveactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments

class LiveUpdateActionReceiver : BroadcastReceiver() {
    companion object {
        const val ACTION_COMPLETE_SET = "com.liftosaur.www.twa.ACTION_COMPLETE_SET"
        const val ACTION_OPEN_AND_COMPLETE_SET = "com.liftosaur.www.twa.ACTION_OPEN_AND_COMPLETE_SET"
        const val ACTION_ADJUST_TIMER_PLUS = "com.liftosaur.www.twa.ACTION_ADJUST_TIMER_PLUS"
        const val ACTION_ADJUST_TIMER_MINUS = "com.liftosaur.www.twa.ACTION_ADJUST_TIMER_MINUS"

        const val EXTRA_ENTRY_INDEX = "entryIndex"
        const val EXTRA_SET_INDEX = "setIndex"
        const val EXTRA_REST_TIMER = "restTimer"
        const val EXTRA_REST_TIMER_SINCE = "restTimerSince"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val entryIndex = intent.getIntExtra(EXTRA_ENTRY_INDEX, -1)
        val setIndex = intent.getIntExtra(EXTRA_SET_INDEX, -1)
        val restTimer = intent.getIntExtra(EXTRA_REST_TIMER, 0)
        val restTimerSince = intent.getLongExtra(EXTRA_REST_TIMER_SINCE, 0)

        when (intent.action) {
            ACTION_COMPLETE_SET -> {
                val event = Arguments.createMap().apply {
                    putString("action", "completeSet")
                    putInt("entryIndex", entryIndex)
                    putInt("setIndex", setIndex)
                }
                LiveActivityEventDispatcher.emit(event)
            }

            ACTION_ADJUST_TIMER_PLUS, ACTION_ADJUST_TIMER_MINUS -> {
                val addSeconds = if (intent.action == ACTION_ADJUST_TIMER_PLUS) 15 else -15
                val newRestTimer = maxOf(0, restTimer + addSeconds)

                val manager = LiveActivityEventDispatcher.getManager()
                Handler(Looper.getMainLooper()).post {
                    manager?.adjustRestTimer(newRestTimer, restTimerSince)
                }

                val event = Arguments.createMap().apply {
                    putString("action", "addRestTime")
                    putInt("entryIndex", entryIndex)
                    putInt("setIndex", setIndex)
                    putInt("addSeconds", addSeconds)
                }
                LiveActivityEventDispatcher.emit(event)
            }
        }
    }
}
