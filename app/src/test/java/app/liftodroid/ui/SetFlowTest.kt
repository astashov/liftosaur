package app.liftodroid.ui

import app.liftodroid.data.remote.CompletedSet
import app.liftodroid.data.remote.EntryDto
import app.liftodroid.data.remote.SetDto
import app.liftodroid.data.remote.WorkoutDto
import app.liftodroid.ui.workout.LocalPhase
import app.liftodroid.ui.workout.SetDraft
import app.liftodroid.ui.workout.SetFlow
import app.liftodroid.ui.workout.SetFlowState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SetFlowTest {
    private fun set(id: String, done: Boolean = false, amrap: Boolean = false) =
        SetDto(setId = id, index = 0, reps = 5, weight = "100kg", isAmrap = amrap, timer = 120, completed = if (done) CompletedSet(reps = 5) else null)

    private val w = WorkoutDto(startTime = 1, entries = listOf(EntryDto("squat", "squat", "barbell", "Squat", sets = listOf(set("a", done = true), set("b"), set("c", amrap = true)))))

    @Test fun `ready shows first incomplete set`() {
        val s = SetFlow.resolve(w, emptySet(), 0, 0, LocalPhase.Idle, null, false, now = 100)
        assertEquals("b", (s as SetFlowState.Ready).target.setId)
    }

    @Test fun `rest wins over ready and previews the next set`() {
        val s = SetFlow.resolve(w, emptySet(), restEndsAtMs = 500, restTotalSec = 120, LocalPhase.Idle, null, false, now = 100)
        assertEquals("b", (s as SetFlowState.Resting).next?.setId)
    }

    @Test fun `logging wins over rest so a lifter can fix a set mid-rest`() {
        val t = SetFlow.targets(w).first { it.setId == "c" }
        val s = SetFlow.resolve(w, emptySet(), 500, 120, LocalPhase.Logging("c", SetDraft.from(t)), null, false, 100)
        assertTrue(s is SetFlowState.Logging)
        assertTrue((s as SetFlowState.Logging).target.needsInput) // AMRAP must collect reps
    }

    @Test fun `all done is complete`() {
        val all = w.copy(entries = listOf(w.entries[0].copy(sets = w.entries[0].sets.map { it.copy(completed = CompletedSet(reps = 5)) })))
        assertEquals(SetFlowState.Complete, SetFlow.resolve(all, emptySet(), 0, 0, LocalPhase.Idle, null, false, 100))
    }

    @Test fun `phase key is stable across draft edits so steppers do not re-trigger the morph`() {
        val t = SetFlow.targets(w).first { it.setId == "b" }
        val a = SetFlowState.Logging(t, SetDraft.from(t))
        val b = SetFlowState.Logging(t, SetDraft.from(t).copy(reps = 9))
        assertEquals(a.phaseKey, b.phaseKey)
    }
}
