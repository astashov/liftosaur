package com.liftosaur.www.twa.imageresizer

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.liftosaur.www.twa.specs.NativeLiftosaurImageResizerSpec
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.roundToInt

class LiftosaurImageResizerModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurImageResizerSpec(reactContext) {

    private fun pathToFile(uri: String): File? {
        val trimmed = if (uri.startsWith("file://")) uri.substring("file://".length) else uri
        val decoded = java.net.URLDecoder.decode(trimmed, "UTF-8")
        val file = File(decoded)
        return if (file.exists()) file else null
    }

    // BitmapFactory ignores EXIF orientation (iOS UIImage applies it for us), so cameras that store a
    // rotate-90/270 tag instead of rotating pixels come out sideways. Apply the tag ourselves.
    private fun exifOrientation(filePath: String): Int =
        try {
            ExifInterface(filePath).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
        } catch (e: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }

    private fun swapsDimensions(orientation: Int): Boolean =
        orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
            orientation == ExifInterface.ORIENTATION_ROTATE_270 ||
            orientation == ExifInterface.ORIENTATION_TRANSPOSE ||
            orientation == ExifInterface.ORIENTATION_TRANSVERSE

    // Largest power-of-2 subsample that still keeps the decoded bitmap >= the requested size, so a
    // big camera photo isn't fully decoded into ARGB before we shrink it to ~600x900 (avoids OOM).
    private fun calculateInSampleSize(width: Int, height: Int, reqWidth: Int, reqHeight: Int): Int {
        var inSampleSize = 1
        if (width > reqWidth || height > reqHeight) {
            val halfWidth = width / 2
            val halfHeight = height / 2
            while (halfWidth / inSampleSize >= reqWidth && halfHeight / inSampleSize >= reqHeight) {
                inSampleSize *= 2
            }
        }
        return inSampleSize
    }

    private fun orientationMatrix(orientation: Int): Matrix? {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.postRotate(90f); matrix.postScale(-1f, 1f) }
            ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.postRotate(270f); matrix.postScale(-1f, 1f) }
            else -> return null
        }
        return matrix
    }

    override fun getSize(uri: String, promise: Promise) {
        try {
            val srcFile = pathToFile(uri) ?: run {
                promise.reject("invalid_image", "Failed to read image at $uri")
                return
            }
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(srcFile.absolutePath, options)
            if (options.outWidth <= 0 || options.outHeight <= 0) {
                promise.reject("decode_failed", "Failed to decode image")
                return
            }
            val swap = swapsDimensions(exifOrientation(srcFile.absolutePath))
            val result = Arguments.createMap().apply {
                putDouble("width", (if (swap) options.outHeight else options.outWidth).toDouble())
                putDouble("height", (if (swap) options.outWidth else options.outHeight).toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("getsize_failed", e.message ?: "Unknown error", e)
        }
    }

    override fun drawToCanvas(
        uri: String,
        canvasWidth: Double,
        canvasHeight: Double,
        destX: Double,
        destY: Double,
        destWidth: Double,
        destHeight: Double,
        format: String,
        quality: Double,
        backgroundColor: Double,
        promise: Promise
    ) {
        try {
            val srcFile = pathToFile(uri) ?: run {
                promise.reject("invalid_image", "Failed to read image at $uri")
                return
            }
            // Orientation may swap axes, so request the larger target dim on both to never undersample.
            val req = maxOf(destWidth, destHeight).roundToInt().coerceAtLeast(1)
            val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(srcFile.absolutePath, boundsOptions)
            // ARGB_8888 keeps the alpha channel so transparent padding/pixels aren't flattened onto black.
            val options = BitmapFactory.Options().apply {
                inPreferredConfig = Bitmap.Config.ARGB_8888
                inSampleSize = calculateInSampleSize(boundsOptions.outWidth, boundsOptions.outHeight, req, req)
            }
            val decoded = BitmapFactory.decodeFile(srcFile.absolutePath, options) ?: run {
                promise.reject("decode_failed", "Failed to decode image")
                return
            }
            val matrix = orientationMatrix(exifOrientation(srcFile.absolutePath))
            val source = if (matrix != null) {
                Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
                    .also { if (it != decoded) decoded.recycle() }
            } else {
                decoded
            }

            val isPng = format.lowercase() == "png"
            val cw = canvasWidth.roundToInt().coerceAtLeast(1)
            val ch = canvasHeight.roundToInt().coerceAtLeast(1)

            val canvasBitmap = Bitmap.createBitmap(cw, ch, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(canvasBitmap)
            // ARGB int (0xAARRGGBB); a transparent (alpha 0) color is a no-op so png padding stays clear.
            canvas.drawColor(backgroundColor.toLong().toInt())
            val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
            val dst = RectF(
                destX.toFloat(),
                destY.toFloat(),
                (destX + destWidth).toFloat(),
                (destY + destHeight).toFloat()
            )
            canvas.drawBitmap(source, null, dst, paint)

            val compressFormat = if (isPng) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG
            val compressQuality = if (isPng) 100 else (quality * 100).toInt().coerceIn(0, 100)
            val ext = if (isPng) "png" else "jpg"

            val outDir = File(reactApplicationContext.cacheDir, "resizedimages").apply { mkdirs() }
            val outFile = File(outDir, "liftosaur-resized-${UUID.randomUUID()}.$ext")
            FileOutputStream(outFile).use { out ->
                canvasBitmap.compress(compressFormat, compressQuality, out)
            }
            source.recycle()
            canvasBitmap.recycle()

            promise.resolve("file://${outFile.absolutePath}")
        } catch (e: Exception) {
            promise.reject("draw_failed", e.message ?: "Unknown error", e)
        }
    }
}
