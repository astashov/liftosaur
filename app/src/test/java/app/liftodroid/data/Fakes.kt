package app.liftodroid.data

import app.liftodroid.data.local.ActiveWorkoutEntity
import app.liftodroid.data.local.CacheDao
import app.liftodroid.data.local.CacheEntity
import app.liftodroid.data.local.OutboxEntity
import app.liftodroid.data.local.OutboxState
import app.liftodroid.data.local.WorkoutDao
import app.liftodroid.data.remote.ClientIdentity
import app.liftodroid.data.remote.LiftosaurApi
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.headersOf
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import java.io.IOException

class FakeWorkoutDao : WorkoutDao {
    val activeRow = MutableStateFlow<ActiveWorkoutEntity?>(null)
    val outbox = MutableStateFlow<List<OutboxEntity>>(emptyList())
    private var seq = 0L

    override fun observeActive() = activeRow
    override suspend fun active() = activeRow.value
    override suspend fun upsertActive(e: ActiveWorkoutEntity) { activeRow.value = e }
    override suspend fun clearActive() { activeRow.value = null }
    override suspend fun enqueue(op: OutboxEntity): Long { val s = ++seq; outbox.value += op.copy(seq = s); return s }
    override suspend fun pending() = outbox.value.filter { it.state == OutboxState.PENDING }.sortedBy { it.seq }
    override fun observePendingCount(): Flow<Int> = outbox.map { l -> l.count { it.state == OutboxState.PENDING } }
    override fun observeFailed(): Flow<List<OutboxEntity>> = outbox.map { l -> l.filter { it.state == OutboxState.FAILED } }
    override suspend fun ack(seqs: List<Long>) { outbox.value = outbox.value.filterNot { it.seq in seqs } }
    override suspend fun bumpAttempts(seqs: List<Long>, error: String) {
        outbox.value = outbox.value.map { if (it.seq in seqs) it.copy(attempts = it.attempts + 1, lastError = error) else it }
    }
    override suspend fun markFailed(seq: Long, error: String) {
        outbox.value = outbox.value.map { if (it.seq == seq) it.copy(state = OutboxState.FAILED, lastError = error) else it }
    }
    override suspend fun rewrite(seq: Long, setId: String?, payload: String) {
        outbox.value = outbox.value.map { if (it.seq == seq) it.copy(setId = setId, payloadJson = payload) else it }
    }
    override suspend fun dropWorkout(startTime: Long) { outbox.value = outbox.value.filterNot { it.startTime == startTime } }
}

class FakeCacheDao : CacheDao {
    private val map = MutableStateFlow<Map<String, CacheEntity>>(emptyMap())
    override suspend fun get(key: String) = map.value[key]
    override fun observe(key: String) = map.map { it[key] }
    override suspend fun put(e: CacheEntity) { map.value += (e.key to e) }
}

/** A scriptable Liftosaur. Flip [online] to simulate walking into the basement. */
class FakeServer {
    var online = true
    val requests = mutableListOf<Pair<String, String>>()
    val headers = mutableListOf<Map<String, String>>()
    var handler: suspend MockRequestHandleScope.(path: String, body: String) -> HttpResponseData = { _, _ -> error("no handler") }

    val engine = MockEngine { req ->
        if (!online) throw IOException("no route to host")
        val path = req.url.encodedPath.removePrefix("/api/v1/")
        val body = req.bodyText()
        requests += "${req.method.value} $path" to body
        headers += req.headers.names().associateWith { req.headers[it]!! }
        handler(path, body)
    }

    fun api() = LiftosaurApi(engine, "https://www.liftosaur.com/api/v1/", { "lftsk_test" }, { ClientIdentity("device-1", "LiftoDroid/test") })

    private fun HttpRequestData.bodyText(): String = when (val b = body) {
        is OutgoingContent.ByteArrayContent -> b.bytes().decodeToString()
        else -> ""
    }
}

fun MockRequestHandleScope.json(body: String, status: HttpStatusCode = HttpStatusCode.OK) =
    respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))
