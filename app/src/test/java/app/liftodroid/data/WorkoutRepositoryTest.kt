package app.liftodroid.data

import app.liftodroid.data.local.OutboxKind
import app.liftodroid.data.local.OutboxState
import app.liftodroid.data.remote.CompletedSet
import app.liftodroid.data.remote.LiftosaurApi.Companion.LiftoJson
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WorkoutRepositoryTest {

    private val server = FakeServer()
    private val dao = FakeWorkoutDao()
    private var clock = 1_738_274_512_000L
    private val repo = WorkoutRepository(server.api(), dao, FakeCacheDao(), scheduler = {}, now = { clock })

    private fun workout(startTime: Long, ids: List<String>, completed: Set<String> = emptySet(), extraSet: String? = null, hasUpdateScript: Boolean = false): String {
        val sets = (ids + listOfNotNull(extraSet)).mapIndexed { i, id ->
            val c = if (id in completed) """{"reps":5,"weight":"100kg"}""" else "null"
            """{"setId":"$id","index":$i,"reps":5,"weight":"100kg","timer":180,"completed":$c}"""
        }.joinToString(",")
        return """{"data":{"workout":{"programId":"p1","programName":"GZCLP","dayName":"A1","dayData":{"day":1,"week":1,"dayInWeek":1},
            "startTime":$startTime,"entries":[{"entryId":"squat","exerciseId":"squat","equipment":"barbell","name":"Squat",
            "hasUpdateScript":$hasUpdateScript,"sets":[$sets]}]}}}"""
    }

    private fun preview(ids: List<String> = listOf("aaaaaa", "bbbbbb", "cccccc")) =
        LiftoJson.decodeFromString<app.liftodroid.data.remote.Envelope<app.liftodroid.data.remote.WorkoutPayload>>(workout(0, ids)).data.workout!!

    private val done = CompletedSet(reps = 5, weight = "100kg")

    @Test fun `offline session queues everything, then drains in order with remapped ids`() = runTest {
        server.online = false
        val live = repo.start(preview())
        repo.logSet("aaaaaa", "squat", done, restSec = 180)
        clock += 200_000
        repo.logSet("bbbbbb", "squat", done, restSec = 180)

        // Optimistic: UI already sees both sets complete and a rest running, with zero network.
        val a = repo.active.first()!!
        assertEquals(2, a.workout.entries[0].sets.count { it.completed != null })
        assertEquals(3, a.queuedWrites)
        assertTrue(a.restEndsAtMs > clock)
        assertEquals(DrainResult.Retry, repo.drain())

        // Signal returns. The server mints different set ids at start: queued writes must follow them.
        server.online = true
        val st = live.startTime
        server.handler = { path, _ ->
            when (path) {
                "workout/start" -> json(workout(st, listOf("xxxxxx", "yyyyyy", "zzzzzz")))
                "workout/sets" -> json(workout(st, listOf("xxxxxx", "yyyyyy", "zzzzzz"), completed = setOf("xxxxxx", "yyyyyy")))
                else -> error(path)
            }
        }
        assertEquals(DrainResult.Done, repo.drain())

        assertEquals(listOf("POST workout/start", "POST workout/sets"), server.requests.map { it.first })
        val start = LiftoJson.parseToJsonElement(server.requests[0].second).jsonObject
        assertEquals(st.toString(), start["startTime"]!!.jsonPrimitive.content) // client-chosen, becomes the history id
        val batch = server.requests[1].second
        assertTrue(batch.contains("xxxxxx") && batch.contains("yyyyyy") && !batch.contains("aaaaaa"))

        val after = repo.active.first()!!
        assertTrue(after.isSynced)
        assertEquals(listOf("xxxxxx", "yyyyyy", "zzzzzz"), after.workout.entries[0].sets.map { it.setId })
    }

    @Test fun `every write carries auth, device id and client headers`() = runTest {
        server.handler = { _, _ -> json(workout(clock, listOf("aaaaaa", "bbbbbb", "cccccc"))) }
        repo.start(preview())
        repo.drain()
        val h = server.headers.single()
        assertEquals("Bearer lftsk_test", h["Authorization"])
        assertEquals("device-1", h["X-Liftosaur-Device-Id"])
        assertEquals("LiftoDroid/test", h["X-Liftosaur-Client"])
    }

    @Test fun `writes logged while a request is in flight survive adoption of the server snapshot`() = runTest {
        val st = clock
        server.handler = { _, _ -> json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc"))) }
        repo.start(preview())
        repo.drain()

        // The server acks set a, but the lifter logs set b while that request is in the air, so the
        // response knows nothing about b. Adopting it must not wipe b out.
        var first = true
        server.handler = { _, _ ->
            if (first) {
                first = false
                repo.logSet("bbbbbb", "squat", done, restSec = null)
                json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc"), completed = setOf("aaaaaa")))
            } else {
                json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc"), completed = setOf("aaaaaa", "bbbbbb")))
            }
        }
        repo.logSet("aaaaaa", "squat", done, restSec = null)
        repo.drain()

        val a = repo.active.first()!!
        assertTrue(a.workout.entries[0].sets.take(2).all { it.completed != null })
        assertTrue(a.isSynced)
        assertEquals(listOf("POST workout/start", "POST workout/set", "POST workout/set"), server.requests.map { it.first })
    }

    @Test fun `a rejected set in a batch is isolated and parked, the rest still sync`() = runTest {
        val st = clock
        server.handler = { path, body ->
            when {
                path == "workout/start" -> json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc")))
                path == "workout/sets" -> json("""{"error":{"code":"missing_set_input","message":"rpe required"}}""", HttpStatusCode.BadRequest)
                body.contains("bbbbbb") -> json("""{"error":{"code":"missing_set_input","message":"rpe required"}}""", HttpStatusCode.BadRequest)
                else -> json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc"), completed = setOf("aaaaaa", "cccccc")))
            }
        }
        server.online = false
        repo.start(preview())
        repo.logSet("aaaaaa", "squat", done, null)
        repo.logSet("bbbbbb", "squat", done, null)
        repo.logSet("cccccc", "squat", done, null)
        server.online = true
        assertEquals(DrainResult.Done, repo.drain())

        val failed = dao.outbox.value.filter { it.state == OutboxState.FAILED }
        assertEquals(listOf("bbbbbb"), failed.map { it.setId })
        assertEquals("missing_set_input", failed.single().lastError)
        assertEquals(0, dao.outbox.value.count { it.state == OutboxState.PENDING })
    }

    @Test fun `finish captures endTime at the tap and is safe to replay`() = runTest {
        val st = clock
        server.handler = { path, _ ->
            when (path) {
                "workout/start" -> json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc")))
                "workout/finish" -> json("""{"data":{"workout":{"id":$st,"startTime":$st,"endTime":${st + 3_600_000},"dayName":"A1","nextDay":{"day":2,"dayName":"A2"}}}}""")
                "workout/next" -> json("""{"data":{"workout":null}}""")
                else -> error(path)
            }
        }
        repo.start(preview())
        repo.drain()
        server.online = false
        clock = st + 3_600_000
        repo.finish(notes = "felt heavy")
        assertTrue(repo.active.first()!!.finishing)
        clock += 7_200_000 // drive home
        server.online = true
        assertEquals(DrainResult.Done, repo.drain())

        val body = LiftoJson.parseToJsonElement(server.requests.first { it.first == "POST workout/finish" }.second).jsonObject
        assertEquals((st + 3_600_000).toString(), body["endTime"]!!.jsonPrimitive.content)
        assertEquals("felt heavy", body["notes"]!!.jsonPrimitive.content)
        assertNull(repo.active.first())
        assertEquals("A2", repo.lastFinished?.nextDay?.dayName)
    }

    @Test fun `a workout already live elsewhere is a conflict, not data loss`() = runTest {
        server.handler = { path, _ ->
            when (path) {
                "workout/start" -> json("""{"error":{"code":"workout_already_active","message":"x"}}""", HttpStatusCode.Conflict)
                "workout/current" -> json(workout(42, listOf("rrrrrr")))
                else -> error(path)
            }
        }
        repo.start(preview())
        repo.logSet("aaaaaa", "squat", done, null)
        val r = repo.drain()
        assertTrue(r is DrainResult.Conflict)
        assertEquals(42L, (r as DrainResult.Conflict).remote?.startTime)
        // Nothing dropped while the lifter decides.
        assertEquals(listOf(OutboxKind.START, OutboxKind.SET), dao.outbox.value.map { it.kind })
    }

    @Test fun `a refused start stalls the queue instead of losing the session`() = runTest {
        server.handler = { _, _ -> json("""{"error":{"code":"day_not_found","message":"x"}}""", HttpStatusCode.NotFound) }
        repo.start(preview())
        repo.logSet("aaaaaa", "squat", done, null)
        assertEquals(DrainResult.Blocked("day_not_found"), repo.drain())
        assertEquals(2, dao.pending().size)
        assertNotNull(repo.active.first())
    }

    @Test fun `un-completing sends an explicit null`() = runTest {
        val st = clock
        server.handler = { _, _ -> json(workout(st, listOf("aaaaaa", "bbbbbb", "cccccc"))) }
        repo.start(preview())
        repo.drain()
        repo.uncomplete("aaaaaa", "squat")
        repo.drain()
        val body = server.requests.last().second
        assertTrue(body, body.contains("\"completed\":null"))
    }

    @Test fun `adjacent edits collapse but appends are never collapsed away`() {
        fun w(id: String, reps: Int, append: Boolean? = null) =
            app.liftodroid.data.remote.SetWrite(id, "squat", LiftoJson.encodeToJsonElement(CompletedSet.serializer(), CompletedSet(reps = reps)), append)
        val out = WorkoutRepository.collapseAdjacent(listOf(w("aaaaaa", 5), w("aaaaaa", 6), w("kdmwpa", 8, true), w("kdmwpa", 9), w("aaaaaa", 7)))
        assertEquals(listOf("aaaaaa", "kdmwpa", "aaaaaa"), out.map { it.setId })
        assertEquals(true, out[1].append)
        assertTrue(out[1].completed.toString().contains("9"))
        assertFalse(out[0].completed.toString().contains("5"))
    }
}
