package com.liftosaur.www.twa.eventreporter

import android.content.Context
import android.content.SharedPreferences

object EventReporterTombstone {
    private const val PREF_NAME = "liftosaur.eventreporter.tombstone"
    private const val KEY_REASON = "reason"
    private const val KEY_TIMESTAMP = "timestamp"

    const val REASON_KILLED = "killed"
    const val REASON_USER_TERMINATED = "user_terminated"

    data class Info(val reason: String, val timestamp: Long)

    fun consumeAndArm(context: Context): Info? {
        val prefs = prefs(context)
        val previousReason = prefs.getString(KEY_REASON, null)
        val previousTimestamp = if (prefs.contains(KEY_TIMESTAMP)) prefs.getLong(KEY_TIMESTAMP, 0L) else null
        prefs.edit()
            .putString(KEY_REASON, REASON_KILLED)
            .remove(KEY_TIMESTAMP)
            .apply()
        if (previousReason == null) return null
        return Info(previousReason, previousTimestamp ?: System.currentTimeMillis())
    }

    fun markGracefulTermination(context: Context) {
        prefs(context).edit()
            .putString(KEY_REASON, REASON_USER_TERMINATED)
            .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
}
