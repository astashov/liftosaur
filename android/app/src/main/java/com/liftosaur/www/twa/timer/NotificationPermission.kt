package com.liftosaur.www.twa.timer

import android.content.Context
import android.os.Build
import androidx.core.app.NotificationManagerCompat

object NotificationPermission {
    private const val PREFS = "liftosaur_permissions"
    private const val KEY_ASKED = "notificationsAsked"

    fun status(context: Context): String {
        val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        return when {
            enabled -> "granted"
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !wasAsked(context) -> "notDetermined"
            else -> "denied"
        }
    }

    fun markAsked(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ASKED, true).apply()
    }

    private fun wasAsked(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ASKED, false)
}
