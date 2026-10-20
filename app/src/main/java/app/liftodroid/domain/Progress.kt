package app.liftodroid.domain

import java.time.Instant

data class ProgressPoint(val at: Instant, val value: Double)

data class ExerciseProgress(
    val label: String,
    val unit: WeightUnit,
    val e1rm: List<ProgressPoint>,
    val volume: List<ProgressPoint>,
    /** Heaviest weight ever completed for each rep count: the classic rep-PR table. */
    val repPrs: Map<Int, Weight>,
) {
    val bestE1rm: ProgressPoint? get() = e1rm.maxByOrNull { it.value }
}

object ProgressAnalytics {

    /** All exercises seen in [records], most-trained first. */
    fun exerciseLabels(records: List<HistoryRecord>): List<String> =
        records.flatMap { r -> r.exercises.filter { it.sets.isNotEmpty() }.map { it.label } }
            .groupingBy { it }.eachCount()
            .entries.sortedByDescending { it.value }.map { it.key }

    fun forExercise(records: List<HistoryRecord>, label: String, unit: WeightUnit): ExerciseProgress {
        val e1rm = mutableListOf<ProgressPoint>()
        val volume = mutableListOf<ProgressPoint>()
        val prs = sortedMapOf<Int, Weight>()

        records.filter { it.date != null }.sortedBy { it.date }.forEach { record ->
            val sets = record.exercises.filter { it.label == label }.flatMap { it.sets }
            if (sets.isEmpty()) return@forEach
            sets.mapNotNull { it.e1rm?.to(unit)?.value }.maxOrNull()
                ?.let { e1rm += ProgressPoint(record.date!!, it) }
            volume += ProgressPoint(record.date!!, sets.sumOf { s -> (s.weight?.to(unit)?.value ?: 0.0) * s.totalReps })
            sets.forEach { s ->
                val w = s.weight?.to(unit) ?: return@forEach
                if (s.reps <= 0) return@forEach
                if ((prs[s.reps]?.value ?: -1.0) < w.value) prs[s.reps] = w
            }
        }
        return ExerciseProgress(label, unit, e1rm, volume, prs)
    }

    /**
     * True when [candidate] beats every earlier e1RM for the exercise. Used to fire the PR
     * celebration (haptic + glow) the moment a set is logged, before the server confirms anything.
     */
    fun isE1rmPr(history: ExerciseProgress?, candidate: LoggedSet): Boolean {
        val c = candidate.e1rm?.to(history?.unit ?: return false)?.value ?: return false
        val best = history.bestE1rm?.value ?: return false
        return c > best + 1e-6
    }
}
