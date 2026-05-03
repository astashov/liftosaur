package com.liftosaur.www.share

import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.tiktok.open.sdk.share.Format
import com.tiktok.open.sdk.share.MediaType
import com.tiktok.open.sdk.share.ShareApi
import com.tiktok.open.sdk.share.ShareRequest
import com.tiktok.open.sdk.share.model.MediaContent
import java.io.File
import java.io.FileOutputStream

class LiftosaurShareModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurShareSpec(reactContext) {

    private val igAppId = "3448767138535273"
    private val tiktokClientKey = "awotgboh9ncnqq9w"
    private val instagramPackage = "com.instagram.android"
    private val tiktokPackages = listOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill")

    private fun pathToFile(path: String): File? {
        val trimmed = if (path.startsWith("file://")) path.substring("file://".length) else path
        val file = File(trimmed)
        return if (file.exists()) file else null
    }

    private fun copyToShareCache(srcPath: String, fileName: String): Uri? {
        val cacheDir = File(reactApplicationContext.cacheDir, "shareimages").apply { mkdirs() }
        val dest = File(cacheDir, fileName)
        if (srcPath.startsWith("data:")) {
            val commaIdx = srcPath.indexOf(',')
            if (commaIdx < 0) return null
            val base64 = srcPath.substring(commaIdx + 1)
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            FileOutputStream(dest).use { it.write(bytes) }
        } else {
            val src = pathToFile(srcPath) ?: return null
            src.inputStream().use { input ->
                FileOutputStream(dest).use { output -> input.copyTo(output) }
            }
        }
        val authority = "${reactApplicationContext.packageName}.shareprovider"
        return FileProvider.getUriForFile(reactApplicationContext, authority, dest)
    }

    private fun copyAssetToShareCache(assetName: String): Uri? {
        val cacheDir = File(reactApplicationContext.cacheDir, "shareimages").apply { mkdirs() }
        val dest = File(cacheDir, assetName)
        if (!dest.exists()) {
            reactApplicationContext.assets.open(assetName).use { input ->
                FileOutputStream(dest).use { output -> input.copyTo(output) }
            }
        }
        val authority = "${reactApplicationContext.packageName}.shareprovider"
        return FileProvider.getUriForFile(reactApplicationContext, authority, dest)
    }

    override fun shareToIGStory(workoutImagePath: String, backgroundImagePath: String?, promise: Promise) {
        try {
            val activity = currentActivity ?: run {
                promise.reject("no_activity", "No current activity")
                return
            }
            val workoutUri = copyToShareCache(workoutImagePath, "workoutimage.png") ?: run {
                promise.reject("invalid_image", "Failed to read workout image")
                return
            }
            val backgroundUri: Uri? = if (!backgroundImagePath.isNullOrEmpty()) {
                copyToShareCache(backgroundImagePath, "backgroundimage.jpg")
            } else {
                runCatching { copyAssetToShareCache("workoutsharebg.jpg") }.getOrNull()
            }

            val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
                putExtra("source_application", igAppId)
                if (backgroundUri != null) {
                    setDataAndType(backgroundUri, "image/jpeg")
                }
                putExtra("interactive_asset_uri", workoutUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.grantUriPermission(instagramPackage, workoutUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            backgroundUri?.let {
                activity.grantUriPermission(instagramPackage, it, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            if (activity.packageManager.resolveActivity(intent, 0) == null) {
                promise.reject("instagram_not_installed", "Instagram is not installed")
                return
            }
            activity.startActivityForResult(intent, 0)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("share_failed", e.message ?: "Unknown error", e)
        }
    }

    override fun shareToIGFeed(workoutImagePath: String, promise: Promise) {
        try {
            val activity = currentActivity ?: run {
                promise.reject("no_activity", "No current activity")
                return
            }
            val uri = copyToShareCache(workoutImagePath, "workoutimage.png") ?: run {
                promise.reject("invalid_image", "Failed to read workout image")
                return
            }
            val share = Intent(Intent.ACTION_SEND).apply {
                setType("image/png")
                putExtra(Intent.EXTRA_STREAM, uri)
                setPackage(instagramPackage)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.grantUriPermission(instagramPackage, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            activity.startActivity(share)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("share_failed", e.message ?: "Unknown error", e)
        }
    }

    override fun shareToTiktok(workoutImagePath: String, promise: Promise) {
        try {
            val activity = currentActivity ?: run {
                promise.reject("no_activity", "No current activity")
                return
            }
            val uri = copyToShareCache(workoutImagePath, "workoutimage.png") ?: run {
                promise.reject("invalid_image", "Failed to read workout image")
                return
            }
            tiktokPackages.forEach { pkg ->
                activity.grantUriPermission(pkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val mediaContent = MediaContent(
                mediaType = MediaType.IMAGE,
                mediaPaths = arrayListOf(uri.toString()),
            )
            val request = ShareRequest(
                clientKey = tiktokClientKey,
                mediaContent = mediaContent,
                shareFormat = Format.DEFAULT,
                packageName = reactApplicationContext.packageName,
                resultActivityFullPath = "${reactApplicationContext.packageName}.MainActivity"
            )
            ShareApi(activity = activity).share(request)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("share_failed", e.message ?: "Unknown error", e)
        }
    }
}
