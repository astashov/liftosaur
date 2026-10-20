package app.liftodroid.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import app.liftodroid.domain.PlateCount
import app.liftodroid.domain.Weight
import app.liftodroid.domain.WeightUnit
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowTheme
import app.liftodroid.ui.workout.ActiveSetFlowCard
import app.liftodroid.ui.workout.SetDraft
import app.liftodroid.ui.workout.SetFlowState
import app.liftodroid.ui.workout.SetTarget
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders each card state to docs/screens/ so the design can be reviewed without a device. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xxhdpi")
class SetFlowCardScreenshotTest {
    @get:Rule val compose = createComposeRule()

    private fun kg(v: Double) = Weight(v, WeightUnit.KG)
    private val squat = SetTarget(
        entryId = "squat", exerciseName = "Squat", exerciseKey = "squat_barbell", equipment = "barbell",
        setId = "cccccc", number = 3, count = 4, isWarmup = false, reps = 5, minReps = null, isAmrap = false,
        weight = kg(102.5), originalWeight = "85%",
        plates = listOf(PlateCount(kg(25.0), 1), PlateCount(kg(10.0), 1), PlateCount(kg(5.0), 1), PlateCount(kg(1.25), 1)),
        targetRpe = 8.0, logRpe = true, askWeight = false, isUnilateral = false, restSec = 180, holdSec = null,
        promptedVars = emptyList(), completed = null, rewritePending = false,
    )

    private fun shot(name: String, dark: Boolean, state: SetFlowState) {
        // The rest ring redraws every frame, so Compose is never idle: drive the clock by hand.
        compose.mainClock.autoAdvance = false
        compose.setContent { Frame(dark) { ActiveSetFlowCard(state, profile = null, onEvent = {}) } }
        compose.mainClock.advanceTimeBy(1_500)
        compose.onRoot().captureRoboImage("../docs/screens/$name-${if (dark) "dark" else "light"}.png")
    }

    @Composable
    private fun Frame(dark: Boolean, content: @Composable () -> Unit) = FlowTheme(dark = dark, reduceTransparency = true) {
        Box(Modifier.fillMaxWidth().background(Flow.colors.bgBase).padding(12.dp)) { content() }
    }

    private val draft = SetDraft.from(squat).copy(reps = 6, rpe = 8.5)
    private fun rest(pr: Boolean = false) =
        SetFlowState.Resting(System.currentTimeMillis() + if (pr) 150_000 else 102_000, 180, squat.copy(setId = "dddddd", number = 4), isPr = pr)

    @Test fun readyDark() = shot("1-ready", true, SetFlowState.Ready(squat.copy(logRpe = false)))
    @Test fun readyLight() = shot("1-ready", false, SetFlowState.Ready(squat.copy(logRpe = false)))
    @Test fun loggingDark() = shot("2-logging", true, SetFlowState.Logging(squat, draft))
    @Test fun loggingLight() = shot("2-logging", false, SetFlowState.Logging(squat, draft))
    @Test fun restDark() = shot("3-rest", true, rest())
    @Test fun restLight() = shot("3-rest", false, rest())
    @Test fun restPrDark() = shot("4-rest-pr", true, rest(pr = true))
}
