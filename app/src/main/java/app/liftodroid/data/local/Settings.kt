package app.liftodroid.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.liftodroid.data.remote.ClientIdentity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

private val Context.dataStore by preferencesDataStore("liftodroid")

data class UserPrefs(
    val hasApiKey: Boolean,
    val reduceTransparency: Boolean,
    val units: String,
)

class SettingsStore(private val context: Context, private val clientVersion: String) {

    private val ds get() = context.dataStore

    val prefs: Flow<UserPrefs> = ds.data.map {
        UserPrefs(
            hasApiKey = it[API_KEY] != null,
            reduceTransparency = it[REDUCE_TRANSPARENCY] ?: false,
            units = it[UNITS] ?: "kg",
        )
    }

    suspend fun apiKey(): String? = ds.data.first()[API_KEY]?.let(KeyCipher::decrypt)

    suspend fun setApiKey(key: String?) = ds.edit {
        if (key.isNullOrBlank()) it.remove(API_KEY) else it[API_KEY] = KeyCipher.encrypt(key.trim())
    }

    suspend fun setReduceTransparency(on: Boolean) = ds.edit { it[REDUCE_TRANSPARENCY] = on }
    suspend fun setUnits(units: String) = ds.edit { it[UNITS] = units }

    /** Stable for the life of the installation; the API uses it to attribute writes. */
    suspend fun identity(): ClientIdentity {
        val existing = ds.data.first()[DEVICE_ID]
        val id = existing ?: UUID.randomUUID().toString().also { fresh -> ds.edit { it[DEVICE_ID] = fresh } }
        return ClientIdentity(deviceId = id, client = "LiftoDroid/$clientVersion")
    }

    private companion object {
        val API_KEY = stringPreferencesKey("api_key_enc")
        val DEVICE_ID = stringPreferencesKey("device_id")
        val REDUCE_TRANSPARENCY = booleanPreferencesKey("reduce_transparency")
        val UNITS = stringPreferencesKey("units")
    }
}

/** AES-GCM with a non-exportable Android Keystore key, so the premium API key never sits in plaintext. */
private object KeyCipher {
    private const val ALIAS = "liftodroid_api_key"
    private const val TRANSFORM = "AES/GCM/NoPadding"

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(
                KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build(),
            )
        }.generateKey()
    }

    fun encrypt(plain: String): String {
        val c = Cipher.getInstance(TRANSFORM).apply { init(Cipher.ENCRYPT_MODE, key()) }
        val out = c.iv + c.doFinal(plain.toByteArray())
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    fun decrypt(enc: String): String? = runCatching {
        val bytes = Base64.decode(enc, Base64.NO_WRAP)
        val c = Cipher.getInstance(TRANSFORM)
        c.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes, 0, 12))
        String(c.doFinal(bytes, 12, bytes.size - 12))
    }.getOrNull()
}
