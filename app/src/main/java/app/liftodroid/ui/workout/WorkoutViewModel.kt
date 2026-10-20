package app.liftodroid.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.liftodroid.AppContainer
import app.liftodroid.data.ActiveWorkout
import app.liftodroid.data.DrainResult
import app.liftodroid.domain.ExerciseProgress
import app.liftodroid.domain.LoadingProfile
import app.liftodroid.domain.LoggedSet
import app.liftodroid.domain.PlateCalculator
import app.liftodroid.domain.ProgressAnalytics
import app.liftodroid.domain.WeightUnit
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WorkoutUi(
    val active: ActiveWorkout?,
    val flow: SetFlowState?,
    val targets: List<SetTarget>,
    val profiles: Map<String, LoadingProfile>,
    val sync: DrainResult,
)

class WorkoutViewModel(private val app: AppContainer) : ViewModel() {

    private val repo = app.workouts
    private val phase = MutableStateFlow<LocalPhase>(LocalPhase.Idle)
    private val focus = MutableStateFlow<String?>(null)
    private val lastWasPr = MutableStateFlow(false)
    private val profiles = MutableStateFlow<Map<String, LoadingProfile>>(emptyMap())
    private var history: Map<String, ExerciseProgress> = emptyMap()

    // Re-resolve once a second so Rest → Ready happens on time even with nothing else changing.
    private val tick = flow { while (true) { emit(System.currentTimeMillis()); delay(1000) } }

    val ui: StateFlow<WorkoutUi> = combine(repo.active, phase, focus, combine(lastWasPr, profiles, repo.syncState, tick) { a, b, c, d -> Quad(a, b, c, d) }) { active, ph, f, q ->
        val flow = active?.takeUnless { it.finishing }?.let {
            SetFlow.resolve(it.workout, it.pendingRewriteSetIds, it.restEndsAtMs, it.restTotalSec, ph, f, q.a, q.d)
        }
        WorkoutUi(active, flow, active?.let { SetFlow.targets(it.workout, it.pendingRewriteSetIds) }.orEmpty(), q.b, q.c)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), WorkoutUi(null, null, emptyList(), emptyMap(), DrainResult.Done))

    init {
        // A write the server refused (e.g. missing_set_input) gets parked; tell the lifter's hand too.
        viewModelScope.launch {
            var seen = -1
            repo.failedWrites.collect { failed ->
                if (seen >= 0 && failed.size > seen) app.haptics.reject()
                seen = failed.size
            }
        }
        viewModelScope.launch {
            val gyms = app.insights.gyms() ?: return@launch
            profiles.value = app.insights.loadingProfiles(gyms.currentGymId, app.insights.units())
        }
        viewModelScope.launch {
            val records = runCatching { app.insights.history(maxPages = 2) }.getOrDefault(emptyList())
            val unit = app.insights.units()
            history = ProgressAnalytics.exerciseLabels(records).associateWith { ProgressAnalytics.forExercise(records, it, unit) }
        }
    }

    fun focus(setId: String) {
        phase.value = LocalPhase.Idle
        focus.value = setId
    }

    fun onEvent(e: SetFlowEvent) {
        val state = ui.value.flow
        when (e) {
            SetFlowEvent.LogAsPrescribed -> (state as? SetFlowState.Ready)?.target?.let { save(it, SetDraft.from(it)) }
            SetFlowEvent.OpenLogging -> (state as? SetFlowState.Ready)?.target?.let { phase.value = LocalPhase.Logging(it.setId, SetDraft.from(it)) }
            SetFlowEvent.CancelLogging -> phase.value = LocalPhase.Idle
            is SetFlowEvent.Reps -> editDraft { d ->
                if (e.left) d.copy(repsLeft = ((d.repsLeft ?: 0) + e.delta).coerceAtLeast(0))
                else d.copy(reps = (d.reps + e.delta).coerceAtLeast(0))
            }
            is SetFlowEvent.WeightStep -> {
                val t = (state as? SetFlowState.Logging)?.target ?: return
                editDraft { d ->
                    val w = d.weight ?: return@editDraft d
                    val rounding = if (w.unit == WeightUnit.KG) 2.5 else 5.0
                    d.copy(weight = PlateCalculator.step(w, t.equipment?.let { profiles.value[it] }, rounding, e.up))
                }
            }
            is SetFlowEvent.Rpe -> editDraft { it.copy(rpe = e.value) }
            is SetFlowEvent.UserVar -> editDraft { d -> d.copy(userVars = d.userVars + (e.name to (d.userVars[e.name] ?: 0.0) + e.delta)) }
            SetFlowEvent.Save -> (state as? SetFlowState.Logging)?.let { save(it.target, it.draft) }
            SetFlowEvent.StartHold -> (state as? SetFlowState.Ready)?.target?.let {
                phase.value = LocalPhase.Holding(it.setId, System.currentTimeMillis())
            }
            SetFlowEvent.StopHold -> (state as? SetFlowState.Holding)?.let { h ->
                val held = ((System.currentTimeMillis() - h.startedAtMs) / 1000).toInt()
                if (h.target.isUnilateral && h.leftSideDoneSec == null) {
                    // Right side recorded; run the clock again for the left.
                    phase.value = LocalPhase.Holding(h.target.setId, System.currentTimeMillis(), leftSideDoneSec = held)
                } else {
                    val base = SetDraft.from(h.target)
                    val draft = if (h.target.isUnilateral) base.copy(holdSec = h.leftSideDoneSec, holdLeftSec = held) else base.copy(holdSec = held)
                    if (h.target.needsInput && !h.target.isUnilateral) phase.value = LocalPhase.Logging(h.target.setId, draft)
                    else save(h.target, draft)
                }
            }
            is SetFlowEvent.NudgeRest -> viewModelScope.launch { repo.adjustRest(e.deltaSec) }
            SetFlowEvent.SkipRest -> viewModelScope.launch { repo.skipRest() }
            SetFlowEvent.Finish -> viewModelScope.launch { repo.finish(notes = null) }
        }
    }

    private fun editDraft(f: (SetDraft) -> SetDraft) = phase.update { p ->
        if (p is LocalPhase.Logging) p.copy(draft = f(p.draft)) else p
    }

    private fun save(t: SetTarget, d: SetDraft) {
        val logged = LoggedSet(reps = d.reps, repsLeft = d.repsLeft, weight = d.weight, rpe = d.rpe, isAmrap = t.isAmrap)
        val pr = !t.isWarmup && ProgressAnalytics.isE1rmPr(history[labelFor(t)], logged)
        lastWasPr.value = pr
        if (pr) app.haptics.personalRecord() else app.haptics.setLogged()
        phase.value = LocalPhase.Idle
        focus.value = null
        viewModelScope.launch {
            // Fire-and-forget into Room: the UI is already in Rest from the optimistic snapshot.
            repo.logSet(t.setId, t.entryId, d.toCompleted(), restSec = t.restSec)
        }
    }

    /** History labels are "Name, Equipment" with the equipment's display name; fall back to bare name. */
    private fun labelFor(t: SetTarget): String =
        history.keys.firstOrNull { it.equals(t.exerciseName, ignoreCase = true) || it.startsWith("${t.exerciseName},", ignoreCase = true) }
            ?: t.exerciseName

    fun undo(setId: String, entryId: String) = viewModelScope.launch { repo.uncomplete(setId, entryId) }
    fun discard() = viewModelScope.launch { repo.discard() }
    fun keepRemote() = viewModelScope.launch { (ui.value.sync as? DrainResult.Conflict)?.remote?.let { repo.adoptRemote(it) } }
    fun replaceRemote() = viewModelScope.launch { (ui.value.sync as? DrainResult.Conflict)?.remote?.let { repo.discardRemoteAndRetry(it) } }

    private data class Quad<A, B, C, D>(val a: A, val b: B, val c: C, val d: D)
}
