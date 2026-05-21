package com.liftosaur.www.twa.lftupdater

import android.content.Context
import android.util.Base64
import android.util.Log
import com.liftosaur.www.twa.BuildConfig
import com.liftosaur.www.twa.R
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.security.Signature
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.UUID

object LftUpdater {
    private const val TAG = "LftUpdater"
    private const val FALLBACK_MANIFEST_URL = "https://www.liftosaur.com/api/updates/manifest"
    private const val CHANNEL = "production"

    private fun manifestUrl(context: Context): String =
        runCatching { context.getString(R.string.lft_updates_manifest_url) }
            .getOrDefault(FALLBACK_MANIFEST_URL)

    fun checkAndDownload(context: Context): Map<String, Any?> {
        if (BuildConfig.DISABLE_OTA) {
            Log.i(TAG, "OTA disabled at build time; checkAndDownload is a no-op")
            return mapOf("status" to "no-update")
        }
        Log.i(TAG, "checkAndDownload called (active=${LftUpdaterPath.activeUpdateId(context) ?: "<none>"})")
        return try {
            val result = performCheck(context)
            Log.i(TAG, "checkAndDownload result: $result")
            result
        } catch (e: Exception) {
            Log.e(TAG, "checkAndDownload threw", e)
            mapOf("status" to "error", "error" to (e.message ?: e.javaClass.simpleName))
        }
    }

    fun markLaunchSuccessful(context: Context) {
        val prefs = context.getSharedPreferences("LftUpdater", Context.MODE_PRIVATE)
        val had = prefs.getInt("crashCount", 0)
        prefs.edit()
            .putBoolean("launchInProgress", false)
            .putInt("crashCount", 0)
            .apply()
        Log.i(TAG, "markLaunchSuccessful (crashCount was $had)")
    }

    private fun performCheck(context: Context): Map<String, Any?> {
        val runtimeVersion = BuildConfig.VERSION_CODE.toString()
        val manifestEndpoint = manifestUrl(context)
        Log.i(TAG, "fetching manifest: url=$manifestEndpoint platform=android rv=$runtimeVersion channel=$CHANNEL")
        val (body, contentType) = httpGetManifest(manifestEndpoint, runtimeVersion)
        Log.i(TAG, "manifest http=200 bytes=${body.size}")
        val boundary = extractBoundary(contentType)
            ?: throw IllegalStateException("invalid content-type: $contentType")
        val parts = parseMultipart(body, boundary)
        Log.i(TAG, "parsed multipart: parts=${parts.size} names=${parts.joinToString(",") { it.name }}")
        val part = parts.firstOrNull() ?: throw IllegalStateException("empty multipart")
        val signature = parseSignatureHeader(part.headers["expo-signature"] ?: "")
        verifyRsaSha256(context, part.body, signature)
        Log.i(TAG, "signature verified for part name=${part.name}")

        if (part.name == "directive") {
            val type = JSONObject(String(part.body, Charsets.UTF_8)).optString("type")
            Log.i(TAG, "directive: $type")
            if (type == "rollBackToEmbedded") {
                LftUpdaterPath.revertToEmbedded(context)
            }
            return mapOf("status" to "no-update")
        }

        val json = JSONObject(String(part.body, Charsets.UTF_8))
        val id = json.getString("id")
        val launchAsset = json.getJSONObject("launchAsset")
        val url = launchAsset.getString("url")
        val expectedHash = launchAsset.getString("hash")
        Log.i(TAG, "manifest decoded: id=$id rv=${json.optString("runtimeVersion")} launchAsset.url=$url hash=$expectedHash")
        if (id == LftUpdaterPath.activeUpdateId(context)) {
            Log.i(TAG, "manifest id matches active bundle; skipping download")
            return mapOf("status" to "no-update")
        }

        Log.i(TAG, "downloading bundle: $url")
        val bundleBytes = downloadAndVerify(url, expectedHash)
        Log.i(TAG, "bundle downloaded: bytes=${bundleBytes.size} hash ok")
        val tmpDir = File(context.cacheDir, "ota-staging-${UUID.randomUUID()}")
        if (!tmpDir.mkdirs()) throw IllegalStateException("can't create staging dir")
        try {
            val tmpBundle = File(tmpDir, LftUpdaterPath.BUNDLE_NAME)
            FileOutputStream(tmpBundle).use { it.write(bundleBytes) }
            LftUpdaterPath.setActive(context, id, tmpBundle)
        } finally {
            tmpDir.deleteRecursively()
        }
        Log.i(TAG, "active bundle swapped to id=$id")
        return mapOf("status" to "updated", "updateId" to id)
    }

    private fun httpGetManifest(manifestUrl: String, runtimeVersion: String): Pair<ByteArray, String> {
        val conn = (URL(manifestUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("expo-protocol-version", "1")
            setRequestProperty("expo-platform", "android")
            setRequestProperty("expo-runtime-version", runtimeVersion)
            setRequestProperty("expo-channel-name", CHANNEL)
            setRequestProperty("expo-expect-signature", "true")
            connectTimeout = 15_000
            readTimeout = 30_000
        }
        try {
            val code = conn.responseCode
            if (code != 200) throw IllegalStateException("manifest http $code")
            val ct = conn.getHeaderField("Content-Type") ?: ""
            val body = conn.inputStream.use { it.readBytes() }
            return body to ct
        } finally {
            conn.disconnect()
        }
    }

    private fun extractBoundary(contentType: String): String? {
        for (raw in contentType.split(";")) {
            val p = raw.trim()
            if (p.startsWith("boundary=")) {
                var v = p.removePrefix("boundary=")
                if (v.startsWith("\"") && v.endsWith("\"")) v = v.substring(1, v.length - 1)
                return v
            }
        }
        return null
    }

    private data class MultipartPart(
        val name: String,
        val headers: Map<String, String>,
        val body: ByteArray
    )

    private fun parseMultipart(body: ByteArray, boundary: String): List<MultipartPart> {
        val delim = "--$boundary".toByteArray(Charsets.UTF_8)
        val crlfCrlf = byteArrayOf(0x0d, 0x0a, 0x0d, 0x0a)
        val out = mutableListOf<MultipartPart>()
        var cursor = 0
        while (cursor < body.size) {
            val bStart = indexOf(body, delim, cursor, body.size)
            if (bStart < 0) break
            val afterB = bStart + delim.size
            if (afterB + 2 <= body.size &&
                body[afterB] == '-'.code.toByte() &&
                body[afterB + 1] == '-'.code.toByte()
            ) break
            val partStart = afterB + 2
            if (partStart > body.size) break
            val nextB = indexOf(body, delim, partStart, body.size)
            if (nextB < 0) break
            val partEnd = nextB - 2
            if (partEnd <= partStart) { cursor = nextB; continue }
            val sep = indexOf(body, crlfCrlf, partStart, partEnd)
            if (sep < 0) { cursor = nextB; continue }
            val headerStr = String(body, partStart, sep - partStart, Charsets.UTF_8)
            val partBody = body.copyOfRange(sep + 4, partEnd)
            val headers = parseHeaders(headerStr)
            var name = ""
            val cd = headers["content-disposition"]
            if (cd != null) {
                val idx = cd.indexOf("name=\"")
                if (idx >= 0) {
                    val close = cd.indexOf('"', idx + 6)
                    if (close > 0) name = cd.substring(idx + 6, close)
                }
            }
            out.add(MultipartPart(name, headers, partBody))
            cursor = nextB
        }
        return out
    }

    private fun parseHeaders(s: String): Map<String, String> {
        val out = mutableMapOf<String, String>()
        for (line in s.split("\r\n")) {
            if (line.isEmpty()) continue
            val colon = line.indexOf(':')
            if (colon < 0) continue
            val k = line.substring(0, colon).trim().lowercase()
            val v = line.substring(colon + 1).trim()
            out[k] = v
        }
        return out
    }

    private fun parseSignatureHeader(header: String): String {
        for (raw in header.split(",")) {
            val p = raw.trim()
            if (p.startsWith("sig=")) {
                var v = p.removePrefix("sig=")
                if (v.startsWith("\"") && v.endsWith("\"")) v = v.substring(1, v.length - 1)
                return v
            }
        }
        throw IllegalStateException("missing sig in expo-signature")
    }

    private fun verifyRsaSha256(context: Context, body: ByteArray, signatureBase64: String) {
        val signature = Base64.decode(signatureBase64, Base64.DEFAULT)
        val pem = context.getString(R.string.lft_updates_signing_certificate)
        val stripped = pem
            .replace("-----BEGIN CERTIFICATE-----", "")
            .replace("-----END CERTIFICATE-----", "")
            .replace("\\s".toRegex(), "")
        val certBytes = Base64.decode(stripped, Base64.DEFAULT)
        val cert = CertificateFactory.getInstance("X.509")
            .generateCertificate(ByteArrayInputStream(certBytes)) as X509Certificate
        val verifier = Signature.getInstance("SHA256withRSA")
        verifier.initVerify(cert.publicKey)
        verifier.update(body)
        if (!verifier.verify(signature)) {
            throw IllegalStateException("signature verify failed")
        }
    }

    private fun downloadAndVerify(urlString: String, expectedHashBase64Url: String): ByteArray {
        val conn = (URL(urlString).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 30_000
            readTimeout = 120_000
        }
        try {
            if (conn.responseCode != 200) {
                throw IllegalStateException("bundle download http ${conn.responseCode}")
            }
            val data = conn.inputStream.use { it.readBytes() }
            val hash = sha256Base64Url(data)
            if (hash != expectedHashBase64Url) {
                throw IllegalStateException("bundle hash mismatch: got $hash want $expectedHashBase64Url")
            }
            return data
        } finally {
            conn.disconnect()
        }
    }

    private fun sha256Base64Url(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(data)
        return Base64.encodeToString(digest, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
    }

    private fun indexOf(haystack: ByteArray, needle: ByteArray, fromIndex: Int, toIndex: Int): Int {
        if (needle.isEmpty()) return fromIndex
        val end = toIndex - needle.size
        outer@ for (i in fromIndex..end) {
            for (j in needle.indices) {
                if (haystack[i + j] != needle[j]) continue@outer
            }
            return i
        }
        return -1
    }
}
