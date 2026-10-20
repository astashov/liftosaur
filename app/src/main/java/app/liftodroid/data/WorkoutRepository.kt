package app.liftodroid.data

import app.liftodroid.data.local.ActiveWorkoutEntity
import app.liftodroid.data.local.CacheDao
import app.liftodroid.data.local.CacheEntity
import app.liftodroid.data.local.OutboxEntity
import app.liftodroid.data.local.OutboxKind
import app.liftodroid.data.local.WorkoutDao
import app.liftodroid.data.remote.ApiException
import app.liftodroid.data.remote.CompletedSet
import app.liftodroid.data.remote.DiscardRequest
import app.liftodroid.data.remote.FinishRequest
import app.liftodroid.data.remote.FinishedWorkoutDto
import app.liftodroid.data.remote.LiftosaurApi
import app.liftodroid.data.remote.LiftosaurApi.Companion.LiftoJson
import app.liftodroid.data.remote.SetBatch
import app.liftodroid.data.remote.SetWrite
import app.liftodroid.data.remote.StartRequest
import app.liftodroid.data.remote.WorkoutDto
import app.liftodroid.domain.SetIds
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.encodeToJsonElement

/** The live workout as the UI should render it. */
data class ActiveWorkout(
    val workout: WorkoutDto,
    val startConfirmed: Boolean,
    val queuedWrites: Int,
    val pendingRewriteSetIds: Set<String>,
    val restEndsAtMs: Long,
    val restTotalSec: Int,
    val finishing: Boolean,
) {
    val isSynced get() = queuedWrites == 0 && startConfirmed
}

sealed interface DrainResult {
    data object Done : DrainResult
    /** No signal or a 5xx. Leave the queue alone; WorkManager retries with backoff. */
    data object Retry : DrainResult
    data object AuthRequired : DrainResult
    /** A different workout is live on the server (started on another device). Needs the lifter. */
    data class Conflict(val remote: WorkoutDto?) : DrainResult
    /**
     * The server refused to start this workout (e.g. `day_not_found` after a program edit). The queue
     * stalls on purpose: draining on would 404 every logged set and lose the session.
     */
    data class Blocked(val code: String) : DrainResult
}

fun interface SyncScheduler {
    /** Ask for a drain as soon as there's a network (WorkManager in prod, no-op in tests). */
    fun schedule()
}

/**
 * Offline-first workout cycle: every action is written to Room first (snapshot + outbox row in one
 * transaction), the UI updates from Room, and the outbox drains to the API whenever it can.
 *
 * Invariants:
 *  - Outbox rows are sent strictly in order. Consecutive SET rows are one `POST /workout/sets`.
 *  - Every request is replay-safe: start (same day = 200), set writes (last-writer-wins by setId,
 *    appends deduped by setId), finish (repeat returns the original summary).
 *  - After every server response, the snapshot = server workout + still-queued writes re-applied.
 */
class WorkoutRepository(
    private val api: LiftosaurApi,
    private val dao: WorkoutDao,
    private val cache: CacheDao,
    private val scheduler: SyncScheduler,
    private val now: () -> Long = System::currentTimeMillis,
) {
    private val stateLock = Mutex()
    private val drainLock = Mutex()

    val active: Flow<ActiveWorkout?> =
        combine(dao.observeActive(), dao.observePendingCount()) { e, pending ->
            e?.let {
                ActiveWorkout(
                    workout = decode(it.snapshotJson),
                    startConfirmed = it.startConfirmed,
                    queuedWrites = pending,
                    pendingRewriteSetIds = it.pendingRewriteSetIds.split(',').filter(String::isNotEmpty).toSet(),
                    restEndsAtMs = it.restEndsAtMs,
                    restTotalSec = it.restTotalSec,
                    finishing = it.finishRequestedAtMs > 0,
                )
            }
        }

    val failedWrites = dao.observeFailed()

    // ------------------------------------------------------------------ reads

    /** Up Next. Network first, cache fallback, so the start button works in a basement gym. */
    suspend fun next(): WorkoutDto? = try {
        api.next()?.also { cache.put(CacheEntity(KEY_NEXT, LiftoJson.encodeToString(WorkoutDto.serializer(), it), now())) }
    } catch (e: ApiException.Offline) {
        cachedNext()
    }

    suspend fun cachedNext(): WorkoutDto? = cache.get(KEY_NEXT)?.let { decode(it.json) }

    /** On launch: if the server has a live workout we don't know about (phone app), adopt it. */
    suspend fun reconcileWithServer() {
        if (dao.pending().isNotEmpty()) return requestSync()
        val remote = try {
            api.current()
        } catch (e: ApiException) {
            return // offline or unauthorized: keep whatever we have
        }
        stateLock.withLock {
            // Nothing live on the server and nothing queued here: our row was finished elsewhere.
            if (remote == null) dao.clearActive()
            else writeSnapshot(remote, confirmed = true, rest = dao.active()?.takeIf { it.startTime == remote.startTime })
        }
    }

    // ------------------------------------------------------------------ the cycle

    /**
     * One tap from Up Next. Builds the live workout from the preview immediately (so the lifter is
     * lifting before the request even leaves) and queues the real `POST /workout/start`.
     * `startTime` is chosen here: the API accepts it, and it becomes the history record id.
     */
    suspend fun start(preview: WorkoutDto): WorkoutDto = stateLock.withLock {
        dao.active()?.let { return decode(it.snapshotJson) }
        val startTime = now()
        val live = preview.copy(startTime = startTime)
        val req = StartRequest(
            programId = preview.programId,
            week = preview.dayData?.week,
            dayInWeek = preview.dayData?.dayInWeek,
            startTime = startTime,
        )
        dao.replaceActiveAndEnqueue(
            ActiveWorkoutEntity(startTime = startTime, snapshotJson = encode(live), startConfirmed = false, updatedAtMs = now()),
            OutboxEntity(kind = OutboxKind.START, startTime = startTime, payloadJson = LiftoJson.encodeToString(StartRequest.serializer(), req), createdAtMs = now()),
        )
        live
    }.also { requestSync() }

    /** Log (or re-log) a set exactly as performed. */
    suspend fun logSet(setId: String, entryId: String?, completed: CompletedSet, restSec: Int?) =
        write(SetWrite(setId = setId, entryId = entryId, completed = LiftoJson.encodeToJsonElement(completed)), restSec)

    /** Undo a completion. The API's spelling of this is `"completed": null`. */
    suspend fun uncomplete(setId: String, entryId: String?) =
        write(SetWrite(setId = setId, entryId = entryId, completed = JsonNull), restSec = null)

    /** "One more set". The id is ours, so a replayed append is a no-op on the server. */
    suspend fun appendSet(entryId: String, completed: CompletedSet, restSec: Int?): String {
        val id = SetIds.next()
        write(SetWrite(setId = id, entryId = entryId, completed = LiftoJson.encodeToJsonElement(completed), append = true), restSec)
        return id
    }

    suspend fun adjustRest(deltaSec: Int) = stateLock.withLock {
        val a = dao.active() ?: return@withLock
        if (a.restEndsAtMs <= now()) return@withLock
        dao.upsertActive(a.copy(restEndsAtMs = (a.restEndsAtMs + deltaSec * 1000L).coerceAtLeast(now()), restTotalSec = (a.restTotalSec + deltaSec).coerceAtLeast(1), updatedAtMs = now()))
    }

    suspend fun skipRest() = stateLock.withLock {
        val a = dao.active() ?: return@withLock
        dao.upsertActive(a.copy(restEndsAtMs = 0, restTotalSec = 0, updatedAtMs = now()))
    }

    /** endTime is captured at the tap, not when the request finally goes out after the drive home. */
    suspend fun finish(notes: String?, intervals: List<List<Long>>? = null) {
        stateLock.withLock {
            val a = dao.active() ?: return
            if (a.finishRequestedAtMs > 0) return
            val tap = now()
            val req = FinishRequest(startTime = a.startTime, endTime = tap, notes = notes?.takeIf { it.isNotBlank() }, intervals = intervals)
            dao.replaceActiveAndEnqueue(
                a.copy(finishRequestedAtMs = tap, restEndsAtMs = 0, updatedAtMs = tap),
                OutboxEntity(kind = OutboxKind.FINISH, startTime = a.startTime, payloadJson = LiftoJson.encodeToString(FinishRequest.serializer(), req), createdAtMs = tap),
            )
        }
        requestSync()
    }

    /** Throws the workout away. Queued sets are dropped; nothing of this session reaches history. */
    suspend fun discard() {
        stateLock.withLock {
            val a = dao.active() ?: return
            dao.dropWorkout(a.startTime)
            dao.clearActive()
            if (a.startConfirmed) {
                dao.enqueue(OutboxEntity(kind = OutboxKind.DISCARD, startTime = a.startTime, payloadJson = LiftoJson.encodeToString(DiscardRequest.serializer(), DiscardRequest(a.startTime)), createdAtMs = now()))
            }
        }
        requestSync()
    }

    /** Conflict resolution: throw away the other device's live workout and start ours. */
    suspend fun discardRemoteAndRetry(remote: WorkoutDto): DrainResult {
        runCatching { api.discard(DiscardRequest(remote.startTime)) }
        return drain()
    }

    /** Conflict resolution: keep the workout already live on the server, drop ours. */
    suspend fun adoptRemote(remote: WorkoutDto) = stateLock.withLock {
        dao.active()?.let { dao.dropWorkout(it.startTime) }
        writeSnapshot(remote, confirmed = true, rest = null)
    }

    // ------------------------------------------------------------------ drain

    @Volatile var lastFinished: FinishedWorkoutDto? = null
        private set

    fun requestSync() = scheduler.schedule()

    private val _syncState = MutableStateFlow<DrainResult>(DrainResult.Done)
    /** Last drain outcome; drives the sync pill and the conflict / blocked sheets. */
    val syncState: StateFlow<DrainResult> = _syncState

    suspend fun drain(): DrainResult = drainLock.withLock { drainLoop() }.also { _syncState.value = it }

    private suspend fun drainLoop(): DrainResult {
        while (true) {
            val ops = dao.pending()
            val head = ops.firstOrNull() ?: return DrainResult.Done
            try {
                val outcome = when (head.kind) {
                    OutboxKind.START -> drainStart(head)
                    OutboxKind.SET -> drainSets(ops.takeWhile { it.kind == OutboxKind.SET && it.startTime == head.startTime })
                    OutboxKind.FINISH -> drainFinish(head)
                    OutboxKind.DISCARD -> drainDiscard(head)
                }
                if (outcome != null) return outcome
            } catch (e: ApiException.Offline) {
                dao.bumpAttempts(listOf(head.seq), e.message ?: "offline")
                return DrainResult.Retry
            } catch (e: ApiException.Http) {
                when {
                    e.isAuth -> return DrainResult.AuthRequired
                    e.status >= 500 || e.status == 429 -> {
                        dao.bumpAttempts(listOf(head.seq), e.code)
                        return DrainResult.Retry
                    }
                    // Any other 4xx will never succeed on replay: park it as "needs attention" and keep
                    // draining, so one bad row can't block the rest of the session (or the finish).
                    else -> dao.markFailed(head.seq, e.code)
                }
            }
        }
    }

    private suspend fun drainStart(op: OutboxEntity): DrainResult? {
        val req = LiftoJson.decodeFromString(StartRequest.serializer(), op.payloadJson)
        val started = try {
            api.start(req)
        } catch (e: ApiException.Http) {
            if (e.code == "workout_already_active") return DrainResult.Conflict(runCatching { api.current() }.getOrNull())
            if (e.isAuth || e.status >= 500) throw e
            return DrainResult.Blocked(e.code)
        }
        stateLock.withLock {
            val local = dao.active()
            val preview = local?.let { decode(it.snapshotJson) }
            val remap = preview?.let { WorkoutMerge.remapSetIds(it, started) }.orEmpty()
            if (remap.isNotEmpty()) {
                dao.pending().filter { it.kind == OutboxKind.SET && it.startTime == op.startTime }.forEach { row ->
                    val w = decodeWrite(row.payloadJson)
                    val newId = remap[w.setId] ?: return@forEach
                    dao.rewrite(row.seq, newId, encodeWrite(w.copy(setId = newId)))
                }
            }
            dao.ack(listOf(op.seq))
            writeSnapshot(started, confirmed = true, rest = local)
        }
        return null
    }

    private suspend fun drainSets(rows: List<OutboxEntity>): DrainResult? {
        val writes = collapseAdjacent(rows.map { decodeWrite(it.payloadJson) })
        try {
            val server = if (writes.size == 1) api.logSet(writes[0]) else api.logSets(SetBatch(writes))
            adopt(server, acked = rows.map { it.seq })
        } catch (e: ApiException.Http) {
            when (e.code) {
                "no_active_workout" -> {
                    // Finished or discarded elsewhere. Our sets have nowhere to go.
                    stateLock.withLock { dao.dropWorkout(rows.first().startTime); dao.clearActive() }
                }
                "missing_set_input", "invalid_set_input", "set_not_found", "entry_not_found", "ambiguous_entry" -> {
                    if (rows.size > 1) {
                        // The batch is one transaction: isolate the bad write by sending one at a time.
                        rows.forEach { drainSets(listOf(it))?.let { r -> return r } }
                    } else {
                        dao.markFailed(rows.single().seq, e.code)
                        runCatching { api.current() }.getOrNull()?.let { adopt(it, acked = emptyList()) }
                    }
                }
                else -> throw e // handled by drainLoop
            }
        }
        return null
    }

    private suspend fun drainFinish(op: OutboxEntity): DrainResult? {
        val req = LiftoJson.decodeFromString(FinishRequest.serializer(), op.payloadJson)
        val summary = try {
            api.finish(req)
        } catch (e: ApiException.Http) {
            if (e.code != "no_active_workout") throw e
            null // Already finished (a retry after a lost response). Nothing left to do.
        }
        lastFinished = summary
        stateLock.withLock {
            dao.ack(listOf(op.seq))
            if (dao.active()?.startTime == op.startTime) dao.clearActive()
        }
        // The server just advanced the program pointer and rewrote 1RMs: the cached preview is stale.
        runCatching { next() }
        return null
    }

    private suspend fun drainDiscard(op: OutboxEntity): DrainResult? {
        try {
            api.discard(LiftoJson.decodeFromString(DiscardRequest.serializer(), op.payloadJson))
        } catch (e: ApiException.Http) {
            if (e.status != 404 && e.code != "workout_mismatch") throw e
        }
        dao.ack(listOf(op.seq))
        return null
    }

    // ------------------------------------------------------------------ internals

    private suspend fun write(w: SetWrite, restSec: Int?) {
        stateLock.withLock {
            val a = dao.active() ?: error("No active workout")
            val updated = WorkoutMerge.apply(decode(a.snapshotJson), w)
            val queued = dao.pending().filter { it.kind == OutboxKind.SET }.map { decodeWrite(it.payloadJson) } + w
            val resting = restSec?.takeIf { it > 0 && w.completed !is JsonNull }
            dao.replaceActiveAndEnqueue(
                a.copy(
                    snapshotJson = encode(updated),
                    pendingRewriteSetIds = WorkoutMerge.pendingRewrites(updated, queued).joinToString(","),
                    restEndsAtMs = resting?.let { now() + it * 1000L } ?: a.restEndsAtMs,
                    restTotalSec = resting ?: a.restTotalSec,
                    updatedAtMs = now(),
                ),
                OutboxEntity(kind = OutboxKind.SET, startTime = a.startTime, setId = w.setId, payloadJson = encodeWrite(w), createdAtMs = now()),
            )
        }
        requestSync()
    }

    /** Server snapshot wins; writes still queued (logged while the request was in flight) are re-applied. */
    private suspend fun adopt(server: WorkoutDto, acked: List<Long>) = stateLock.withLock {
        if (acked.isNotEmpty()) dao.ack(acked)
        writeSnapshot(server, confirmed = true, rest = dao.active())
    }

    private suspend fun writeSnapshot(server: WorkoutDto, confirmed: Boolean, rest: ActiveWorkoutEntity?) {
        val queued = dao.pending()
            .filter { it.kind == OutboxKind.SET && it.startTime == server.startTime }
            .map { decodeWrite(it.payloadJson) }
        val merged = WorkoutMerge.rebase(server, queued)
        dao.upsertActive(
            ActiveWorkoutEntity(
                startTime = server.startTime,
                snapshotJson = encode(merged),
                startConfirmed = confirmed,
                pendingRewriteSetIds = WorkoutMerge.pendingRewrites(merged, queued).joinToString(","),
                restEndsAtMs = rest?.restEndsAtMs ?: 0,
                restTotalSec = rest?.restTotalSec ?: 0,
                finishRequestedAtMs = rest?.finishRequestedAtMs ?: 0,
                updatedAtMs = now(),
            ),
        )
    }

    private fun decode(json: String) = LiftoJson.decodeFromString(WorkoutDto.serializer(), json)
    private fun encode(w: WorkoutDto) = LiftoJson.encodeToString(WorkoutDto.serializer(), w)
    private fun decodeWrite(json: String) = LiftoJson.decodeFromString(SetWrite.serializer(), json)
    private fun encodeWrite(w: SetWrite) = LiftoJson.encodeToString(SetWrite.serializer(), w)

    internal companion object {
        const val KEY_NEXT = "workout_next"

        /**
         * Adjacent writes to the same set collapse to the last one: last-writer-wins makes that
         * equivalent on the server. An append is never collapsed away, since later edits address the
         * set it creates; instead the append carries the newest value.
         */
        fun collapseAdjacent(writes: List<SetWrite>): List<SetWrite> = writes.fold(mutableListOf()) { acc, w ->
            val prev = acc.lastOrNull()
            when {
                prev == null || prev.setId != w.setId || w.append == true -> acc += w
                prev.append == true -> acc[acc.lastIndex] = prev.copy(completed = w.completed)
                else -> acc[acc.lastIndex] = w
            }
            acc
        }
    }
}
