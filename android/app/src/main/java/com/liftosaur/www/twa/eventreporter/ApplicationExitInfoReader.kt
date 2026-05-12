package com.liftosaur.www.twa.eventreporter

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build

object ApplicationExitInfoReader {
    private const val PREF_NAME = "liftosaur.eventreporter.exitinfo"
    private const val KEY_LAST_SEEN_TIMESTAMP = "last_seen_timestamp"

    fun emitNewExits(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return
        val prefs = context.applicationContext.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val lastSeen = prefs.getLong(KEY_LAST_SEEN_TIMESTAMP, 0L)
        val exits = try {
            am.getHistoricalProcessExitReasons(null, 0, 0)
        } catch (e: Exception) {
            return
        }
        if (exits.isEmpty()) return
        var newest = lastSeen
        for (info in exits) {
            if (info.timestamp <= lastSeen) continue
            if (info.timestamp > newest) newest = info.timestamp
            EventReporterDispatcher.emit(
                "android-exit-info",
                mapOf(
                    "reason" to reasonName(info.reason),
                    "status" to info.status.toString(),
                    "importance" to info.importance.toString(),
                    "description" to (info.description ?: ""),
                    "process_name" to info.processName,
                    "exit_timestamp" to info.timestamp.toString(),
                )
            )
        }
        if (newest != lastSeen) {
            prefs.edit().putLong(KEY_LAST_SEEN_TIMESTAMP, newest).apply()
        }
    }

    private fun reasonName(reason: Int): String = when (reason) {
        ApplicationExitInfo.REASON_UNKNOWN -> "unknown"
        ApplicationExitInfo.REASON_EXIT_SELF -> "exit_self"
        ApplicationExitInfo.REASON_SIGNALED -> "signaled"
        ApplicationExitInfo.REASON_LOW_MEMORY -> "low_memory"
        ApplicationExitInfo.REASON_CRASH -> "crash"
        ApplicationExitInfo.REASON_CRASH_NATIVE -> "crash_native"
        ApplicationExitInfo.REASON_ANR -> "anr"
        ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "initialization_failure"
        ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "permission_change"
        ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "excessive_resource_usage"
        ApplicationExitInfo.REASON_USER_REQUESTED -> "user_requested"
        ApplicationExitInfo.REASON_USER_STOPPED -> "user_stopped"
        ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "dependency_died"
        ApplicationExitInfo.REASON_OTHER -> "other"
        else -> "code_$reason"
    }
}
