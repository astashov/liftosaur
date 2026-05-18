package com.liftosaur.www.twa.lftupdater

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import java.io.File

object LftUpdaterPath {
    private const val TAG = "LftUpdater"
    private const val PREFS_NAME = "LftUpdater"
    private const val KEY_ACTIVE_UPDATE_ID = "activeUpdateId"
    const val BUNDLE_NAME = "index.android.bundle"

    fun otaRoot(context: Context): File = File(context.filesDir, "ota")
    fun activeDir(context: Context): File = File(otaRoot(context), "active")
    fun activeBundleFile(context: Context): File = File(activeDir(context), BUNDLE_NAME)

    fun effectiveBundleFilePath(context: Context): String? {
        val f = activeBundleFile(context)
        return if (f.exists()) {
            Log.i(TAG, "effectiveBundleFilePath: using OTA bundle at ${f.absolutePath} (id=${activeUpdateId(context) ?: "<none>"})")
            f.absolutePath
        } else {
            Log.i(TAG, "effectiveBundleFilePath: using embedded bundle")
            null
        }
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun activeUpdateId(context: Context): String? =
        prefs(context).getString(KEY_ACTIVE_UPDATE_ID, null)

    fun setActive(context: Context, updateId: String, srcBundle: File) {
        val root = otaRoot(context)
        if (!root.exists() && !root.mkdirs()) {
            throw IllegalStateException("can't create ota root")
        }
        val staging = File(root, "staging-$updateId")
        if (staging.exists()) staging.deleteRecursively()
        if (!staging.mkdirs()) throw IllegalStateException("can't create staging dir")
        val dst = File(staging, BUNDLE_NAME)
        srcBundle.copyTo(dst, overwrite = true)
        val active = activeDir(context)
        val hadPrevious = active.exists()
        if (hadPrevious && !active.deleteRecursively()) {
            throw IllegalStateException("can't remove previous active bundle")
        }
        if (!staging.renameTo(active)) {
            throw IllegalStateException("atomic rename failed")
        }
        prefs(context).edit().putString(KEY_ACTIVE_UPDATE_ID, updateId).apply()
        Log.i(TAG, "setActive: id=$updateId replacedPrevious=$hadPrevious path=${active.absolutePath}")
    }

    fun revertToEmbedded(context: Context) {
        val active = activeDir(context)
        val hadActive = active.exists()
        if (hadActive) active.deleteRecursively()
        prefs(context).edit().remove(KEY_ACTIVE_UPDATE_ID).apply()
        Log.i(TAG, "revertToEmbedded: hadActive=$hadActive")
    }
}
