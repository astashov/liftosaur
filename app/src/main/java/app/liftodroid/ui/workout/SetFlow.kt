package app.liftodroid.ui.workout

import app.liftodroid.data.remote.CompletedSet
import app.liftodroid.data.remote.EntryDto
import app.liftodroid.data.remote.SetDto
import app.liftodroid.data.remote.WorkoutDto
import app.liftodroid.domain.PlateCount
import app.liftodroid.domain.Weight
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/** One prescribed set, flattened with everything the card needs to render and validate it. */
data class SetTarget(
    val entryId: String,
    val exerciseName: String,
    val exerciseKey: String,
    val equipment: String?,
    val setId: String,
    val number: Int,
    val count: Int,
    val isWarmup: Boolean,
    val reps: Int?,
    val minReps: Int?,
    val isAmrap: Boolean,
    val weight: Weight?,
    val originalWeight: String?,
    val plates: List<PlateCount>,
    val targetRpe: Double?,
    val logRpe: Boolean,
    val askWeight: Boolean,
    val isUnilateral: Boolean,
    val restSec: Int?,
    val holdSec: Int?,
    val promptedVars: List<String>,
    val completed: CompletedSet?,
    /** An update script may still rewrite this target once queued writes reach the server. */
    val rewritePending: Boolean,
) {
    val isTimed get() = holdSec != null
    /** Sets the API won't accept without lifter input. Mirrors the `missing_set_input` table. */
    val needsInput get() = isAmrap || askWeight || logRpe || promptedVars.isNotEmpty() || (isTimed && isUnilateral)
    val repsLabel get() = when {
        reps == null -> ""
        minReps != null && minReps != reps -> "$minReps–$reps"
        else -> "$reps"
    } + if (isAmrap) "+" else ""
}

/** What the lifter is entering right now. Prefilled from the target, so "as prescribed" is zero taps. */
data class SetDraft(
    val reps: Int,
    val repsLeft: Int?,
    val weight: Weight?,
    val rpe: Double?,
    val holdSec: Int?,
    val holdLeftSec: Int?,
    val userVars: Map<String, Double>,
) {
    fun toCompleted() = CompletedSet(
        reps = reps,
        repsLeft = repsLeft,
        weight = weight?.toApi(),
        rpe = rpe,
        setTimer = holdSec,
        setTimerLeft = holdLeftSec,
        userVars = userVars.takeIf { it.isNotEmpty() }?.let { m -> JsonObject(m.mapValues { JsonPrimitive(it.value) }) },
    )

    companion object {
        fun from(t: SetTarget) = SetDraft(
            reps = t.completed?.reps ?: t.reps ?: 0,
            repsLeft = if (t.isUnilateral) (t.completed?.repsLeft ?: t.reps ?: 0) else null,
            weight = Weight.parse(t.completed?.weight) ?: t.weight,
            rpe = t.completed?.rpe ?: t.targetRpe?.takeIf { t.logRpe },
            holdSec = t.completed?.setTimer ?: t.holdSec,
            holdLeftSec = if (t.isTimed && t.isUnilateral) (t.completed?.setTimerLeft ?: t.holdSec) else null,
            userVars = t.promptedVars.associateWith { 0.0 },
        )
    }
}

/** Ephemeral, UI-only phase. Everything durable (completions, rest deadline) lives in Room. */
sealed interface LocalPhase {
    data object Idle : LocalPhase
    data class Logging(val setId: String, val draft: SetDraft) : LocalPhase
    data class Holding(val setId: String, val startedAtMs: Long, val leftSideDoneSec: Int? = null) : LocalPhase
}

sealed interface SetFlowState {
    /** AnimatedContent key: changes only when the card should morph, not on every stepper tap. */
    val phaseKey: String

    data class Ready(val target: SetTarget) : SetFlowState {
        override val phaseKey get() = "ready:${target.setId}"
    }

    data class Logging(val target: SetTarget, val draft: SetDraft) : SetFlowState {
        override val phaseKey get() = "logging:${target.setId}"
    }

    data class Holding(val target: SetTarget, val startedAtMs: Long, val leftSideDoneSec: Int?) : SetFlowState {
        override val phaseKey get() = "holding:${target.setId}:${leftSideDoneSec != null}"
    }

    data class Resting(val endsAtMs: Long, val totalSec: Int, val next: SetTarget?, val isPr: Boolean) : SetFlowState {
        override val phaseKey get() = "resting"
    }

    data object Complete : SetFlowState {
        override val phaseKey get() = "complete"
    }
}

object SetFlow {

    fun targets(workout: WorkoutDto, rewritePending: Set<String> = emptySet()): List<SetTarget> =
        workout.entries.flatMap { e ->
            val warm = e.warmupSets.mapIndexed { i, s -> s.toTarget(e, i + 1, e.warmupSets.size, rewritePending) }
            val work = e.sets.mapIndexed { i, s -> s.toTarget(e, i + 1, e.sets.size, rewritePending) }
            warm + work
        }

    /**
     * The single source of truth for what the bottom card shows.
     * Priority: an explicit in-progress interaction (logging / holding) > rest countdown > next set.
     */
    fun resolve(
        workout: WorkoutDto,
        rewritePending: Set<String>,
        restEndsAtMs: Long,
        restTotalSec: Int,
        phase: LocalPhase,
        focusSetId: String?,
        lastWasPr: Boolean,
        now: Long,
    ): SetFlowState {
        val all = targets(workout, rewritePending)
        val byId = all.associateBy { it.setId }
        when (phase) {
            is LocalPhase.Logging -> byId[phase.setId]?.let { return SetFlowState.Logging(it, phase.draft) }
            is LocalPhase.Holding -> byId[phase.setId]?.let { return SetFlowState.Holding(it, phase.startedAtMs, phase.leftSideDoneSec) }
            LocalPhase.Idle -> Unit
        }
        val next = focusSetId?.let(byId::get)?.takeIf { it.completed == null } ?: all.firstOrNull { it.completed == null }
        if (restEndsAtMs > now) return SetFlowState.Resting(restEndsAtMs, restTotalSec, next, lastWasPr)
        return next?.let { SetFlowState.Ready(it) } ?: SetFlowState.Complete
    }

    private fun SetDto.toTarget(e: EntryDto, number: Int, count: Int, rewrite: Set<String>) = SetTarget(
        entryId = e.entryId,
        exerciseName = e.name,
        exerciseKey = listOfNotNull(e.exerciseId, e.equipment).joinToString("_"),
        equipment = e.equipment,
        setId = setId,
        number = number,
        count = count,
        isWarmup = isWarmup,
        reps = reps,
        minReps = minReps,
        isAmrap = isAmrap,
        weight = Weight.parse(weight),
        originalWeight = originalWeight,
        plates = plates.orEmpty().mapNotNull { p -> Weight.parse(p.weight)?.let { PlateCount(it, p.num) } },
        targetRpe = rpe,
        logRpe = logRpe,
        askWeight = askWeight,
        isUnilateral = isUnilateral,
        restSec = timer,
        holdSec = setTimer,
        promptedVars = e.promptedVars.mapNotNull { v ->
            (v as? JsonPrimitive)?.contentOrNull ?: (v as? JsonObject)?.get("name")?.jsonPrimitive?.contentOrNull
        },
        completed = completed,
        rewritePending = setId in rewrite,
    )
}
