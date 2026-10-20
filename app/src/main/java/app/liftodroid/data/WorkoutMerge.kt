package app.liftodroid.data

import app.liftodroid.data.remote.CompletedSet
import app.liftodroid.data.remote.EntryDto
import app.liftodroid.data.remote.LiftosaurApi.Companion.LiftoJson
import app.liftodroid.data.remote.SetWrite
import app.liftodroid.data.remote.WorkoutDto
import kotlinx.serialization.json.JsonNull

/**
 * Pure functions for keeping the on-device workout honest:
 *  - apply a local write optimistically,
 *  - rebase still-queued writes onto a fresh server snapshot,
 *  - translate set ids when a workout started offline gets its real ids from the server.
 *
 * The server is always the authority on targets. We only ever overlay `completed`, and for
 * exercises with update scripts we flag the untouched remainder as "pending rewrite" instead of
 * guessing what the script will do.
 */
object WorkoutMerge {

    fun apply(workout: WorkoutDto, write: SetWrite): WorkoutDto {
        val completed = if (write.completed is JsonNull) null
        else LiftoJson.decodeFromJsonElement(CompletedSet.serializer(), write.completed)

        if (write.append == true) {
            val idx = workout.entries.indexOfFirst { it.entryId == write.entryId }
            if (idx < 0) return workout
            val entry = workout.entries[idx]
            if (entry.sets.any { it.setId == write.setId }) return workout // replay: no-op, like the server
            val template = entry.sets.lastOrNull() ?: return workout
            val appended = template.copy(setId = write.setId, index = template.index + 1, completed = completed)
            return workout.replaceEntry(idx, entry.copy(sets = entry.sets + appended))
        }

        return workout.copy(entries = workout.entries.map { e ->
            if (e.sets.none { it.setId == write.setId } && e.warmupSets.none { it.setId == write.setId }) e
            else e.copy(
                sets = e.sets.map { if (it.setId == write.setId) it.copy(completed = completed) else it },
                warmupSets = e.warmupSets.map { if (it.setId == write.setId) it.copy(completed = completed) else it },
            )
        })
    }

    fun rebase(server: WorkoutDto, stillQueued: List<SetWrite>): WorkoutDto =
        stillQueued.fold(server, ::apply)

    /**
     * Uncompleted sets that a queued write could still rewrite: every not-yet-done set of an
     * update-script exercise that has a queued write. The UI dims their targets until the server answers.
     */
    fun pendingRewrites(workout: WorkoutDto, stillQueued: List<SetWrite>): Set<String> {
        val touched = stillQueued.map { it.setId }.toSet()
        return workout.entries
            .filter { e -> e.hasUpdateScript && e.sets.any { it.setId in touched } }
            .flatMap { e -> e.sets.filter { it.completed == null && it.setId !in touched }.map { it.setId } }
            .toSet()
    }

    /**
     * A workout started offline runs on the set ids of the cached `/workout/next` preview. When
     * `/workout/start` finally answers, map preview ids to real ids by position. Only entries whose
     * exercise matches positionally are mapped; anything else is left alone and will surface as
     * `set_not_found`, which the drain turns into a visible "needs attention" row.
     */
    fun remapSetIds(preview: WorkoutDto, started: WorkoutDto): Map<String, String> {
        val map = mutableMapOf<String, String>()
        preview.entries.zip(started.entries).forEach { (p, s) ->
            if (p.exerciseId != s.exerciseId) return@forEach
            p.warmupSets.zip(s.warmupSets).forEach { (a, b) -> if (a.setId != b.setId) map[a.setId] = b.setId }
            p.sets.zip(s.sets).forEach { (a, b) -> if (a.setId != b.setId) map[a.setId] = b.setId }
        }
        return map
    }

    fun findSet(workout: WorkoutDto, setId: String) =
        workout.entries.firstNotNullOfOrNull { e ->
            (e.warmupSets + e.sets).firstOrNull { it.setId == setId }?.let { e to it }
        }

    private fun WorkoutDto.replaceEntry(i: Int, e: EntryDto) =
        copy(entries = entries.toMutableList().also { it[i] = e })
}
