package com.liftosaur.www

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Arguments
import java.io.File
import java.util.concurrent.Executors

class LiftosaurStorageModule(reactContext: ReactApplicationContext) :
    NativeLiftosaurStorageSpec(reactContext) {

    private val storageDir: File =
        File(reactContext.filesDir, "LiftosaurStorage").also { it.mkdirs() }
    private val executor = Executors.newSingleThreadExecutor()

    private fun sanitizeKey(key: String): String =
        key.replace(Regex("[/\\\\:*?\"<>|]"), "_")

    private fun fileForKey(key: String): File =
        File(storageDir, "${sanitizeKey(key)}.json")

    override fun getValue(key: String, promise: Promise) {
        executor.execute {
            try {
                val file = fileForKey(key)
                if (file.exists()) {
                    promise.resolve(file.readText(Charsets.UTF_8))
                } else {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }

    override fun setValue(key: String, value: String, promise: Promise) {
        executor.execute {
            try {
                val file = fileForKey(key)
                file.writeText(value, Charsets.UTF_8)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    override fun deleteValue(key: String, promise: Promise) {
        executor.execute {
            try {
                promise.resolve(fileForKey(key).delete())
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    override fun hasValue(key: String, promise: Promise) {
        executor.execute {
            promise.resolve(fileForKey(key).exists())
        }
    }

    override fun getAllKeys(promise: Promise) {
        executor.execute {
            try {
                val files = storageDir.listFiles() ?: emptyArray()
                val keys = files
                    .filter { it.name.endsWith(".json") }
                    .map { it.name.removeSuffix(".json") }
                val result = Arguments.createArray()
                keys.forEach { result.pushString(it) }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.resolve(Arguments.createArray())
            }
        }
    }

    override fun readFile(path: String, promise: Promise) {
        executor.execute {
            try {
                val uri = Uri.parse(path)
                val text = if (uri.scheme == "content") {
                    reactApplicationContext.contentResolver.openInputStream(uri)
                        ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
                } else {
                    File(uri.path ?: path).readText(Charsets.UTF_8)
                }
                promise.resolve(text)
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }
}
