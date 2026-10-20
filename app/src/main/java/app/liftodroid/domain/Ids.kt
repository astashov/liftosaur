package app.liftodroid.domain

import java.security.SecureRandom

/**
 * Client-generated set ids for appended sets. The API requires six lowercase letters,
 * and a repeated append with the same id is a no-op, which is what makes replays safe.
 */
object SetIds {
    private val random = SecureRandom()

    fun next(): String = buildString(6) {
        repeat(6) { append('a' + random.nextInt(26)) }
    }

    fun isValid(id: String): Boolean = id.length == 6 && id.all { it in 'a'..'z' }
}
