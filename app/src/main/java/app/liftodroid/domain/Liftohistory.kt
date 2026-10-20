package app.liftodroid.domain

import java.time.Instant

/**
 * The API has no per-exercise history endpoint, so progress curves are computed on-device from
 * `GET /history`, whose records arrive as Liftohistory text. Only the parts the analytics need
 * are parsed (header metadata and *completed* sets); unknown fragments are skipped, never fatal.
 */
data class HistoryRecord(
    val id: Long,
    val date: Instant?,
    val program: String?,
    val dayName: String?,
    val durationSec: Long?,
    val note: String?,
    val exercises: List<LoggedExercise>,
) {
    val totalVolume: Map<WeightUnit, Double>
        get() = exercises.flatMap { it.sets }
            .mapNotNull { s -> s.weight?.let { it.unit to it.value * s.totalReps } }
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, v) -> v.sum() }
}

data class LoggedExercise(
    val name: String,
    val equipment: String?,
    val sets: List<LoggedSet>,
    val warmups: List<LoggedSet>,
) {
    val label: String get() = if (equipment == null) name else "$name, $equipment"
}

data class LoggedSet(
    val reps: Int,
    val repsLeft: Int? = null,
    val weight: Weight?,
    val rpe: Double? = null,
    val isAmrap: Boolean = false,
    val holdSec: Int? = null,
) {
    val totalReps: Int get() = reps + (repsLeft ?: 0)

    /** Epley estimate; a single is its own 1RM. Sets above 12 reps are too noisy to count. */
    val e1rm: Weight?
        get() {
            val w = weight ?: return null
            if (reps <= 0 || reps > 12 || w.value <= 0) return null
            return if (reps == 1) w else Weight(w.value * (1 + reps / 30.0), w.unit)
        }
}

object Liftohistory {

    private val header = Regex("""^(\S+)\s*/(.*)exercises:\s*\{\s*$""")
    private val quoted = Regex("""(\w+):\s*"([^"]*)"""")
    private val bare = Regex("""(\w+):\s*([^/"]+)""")
    private val setGroup = Regex("""^(\d+)x(\d+)(\+)?(?:\|(\d+))?$""")

    fun parse(id: Long, text: String): HistoryRecord {
        val lines = text.lines()
        var note: String? = null
        var date: Instant? = null
        var program: String? = null
        var dayName: String? = null
        var duration: Long? = null
        val exercises = mutableListOf<LoggedExercise>()
        var inBody = false

        for (rawLine in lines) {
            val line = rawLine.trim()
            if (line.isEmpty()) continue
            if (line.startsWith("//")) {
                if (!inBody) note = line.removePrefix("//").trim()
                continue
            }
            if (!inBody) {
                val m = header.matchEntire(line) ?: continue
                date = runCatching { Instant.parse(m.groupValues[1]) }.getOrNull()
                val meta = m.groupValues[2]
                quoted.findAll(meta).forEach {
                    when (it.groupValues[1]) {
                        "program" -> program = it.groupValues[2]
                        "dayName" -> dayName = it.groupValues[2]
                    }
                }
                bare.findAll(meta).forEach {
                    if (it.groupValues[1] == "duration") duration = it.groupValues[2].trim().removeSuffix("s").toLongOrNull()
                }
                inBody = true
                continue
            }
            if (line == "}") break
            parseExercise(line)?.let(exercises::add)
        }
        return HistoryRecord(id, date, program, dayName, duration, note, exercises)
    }

    internal fun parseExercise(line: String): LoggedExercise? {
        val segments = line.split(" / ").map { it.trim() }
        if (segments.isEmpty() || segments[0].isEmpty()) return null
        val nameParts = segments[0].split(", ", limit = 2)
        var completed = emptyList<LoggedSet>()
        var warmups = emptyList<LoggedSet>()
        for (seg in segments.drop(1)) {
            when {
                seg.startsWith("target:") -> Unit
                seg.startsWith("warmup:") -> warmups = parseSets(seg.removePrefix("warmup:"))
                else -> completed = parseSets(seg)
            }
        }
        return LoggedExercise(nameParts[0], nameParts.getOrNull(1), completed, warmups)
    }

    internal fun parseSets(segment: String): List<LoggedSet> =
        segment.split(",").flatMap { group -> parseGroup(group.trim()) }

    private fun parseGroup(group: String): List<LoggedSet> {
        val tokens = group.split(" ").filter { it.isNotBlank() }
        val head = tokens.firstOrNull()?.let(setGroup::matchEntire) ?: return emptyList()
        val count = head.groupValues[1].toInt()
        val reps = head.groupValues[2].toInt()
        val isAmrap = head.groupValues[3].isNotEmpty()
        val repsLeft = head.groupValues[4].toIntOrNull()
        var weight: Weight? = null
        var rpe: Double? = null
        var hold: Int? = null
        for (t in tokens.drop(1)) {
            when {
                t.startsWith("@") -> rpe = t.drop(1).removeSuffix("+").toDoubleOrNull()
                Weight.parse(t) != null -> weight = Weight.parse(t)
                t.endsWith("s") -> hold = t.substringBefore('|').removeSuffix("s").toIntOrNull()
            }
        }
        return List(count) { LoggedSet(reps, repsLeft, weight, rpe, isAmrap, hold) }
    }
}
