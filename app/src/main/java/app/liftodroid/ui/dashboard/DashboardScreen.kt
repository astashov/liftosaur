@file:OptIn(ExperimentalMaterial3Api::class)

package app.liftodroid.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.liftodroid.AppContainer
import app.liftodroid.data.remote.FinishedWorkoutDto
import app.liftodroid.data.remote.GymsPayload
import app.liftodroid.data.remote.WorkoutDto
import app.liftodroid.domain.Weight
import app.liftodroid.ui.components.FlowButton
import app.liftodroid.ui.components.Glass
import app.liftodroid.ui.components.flowCard
import app.liftodroid.ui.components.flowPressable
import app.liftodroid.ui.components.glass
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius
import app.liftodroid.ui.theme.FlowSpace
import app.liftodroid.ui.theme.FlowTargets
import app.liftodroid.ui.theme.LocalHazeState
import dev.chrisbanes.haze.haze
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardUi(
    val next: WorkoutDto? = null,
    val loading: Boolean = true,
    val gyms: GymsPayload? = null,
    val lastFinished: FinishedWorkoutDto? = null,
    val starting: Boolean = false,
)

class DashboardViewModel(private val app: AppContainer) : ViewModel() {
    val ui = MutableStateFlow(DashboardUi(next = null))

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        ui.update { it.copy(next = app.workouts.cachedNext() ?: it.next, lastFinished = app.workouts.lastFinished) }
        val next = runCatching { app.workouts.next() }.getOrNull()
        val gyms = runCatching { app.insights.gyms() }.getOrNull()
        ui.update { it.copy(next = next ?: it.next, gyms = gyms ?: it.gyms, loading = false) }
    }

    fun start(onStarted: () -> Unit) {
        val preview = ui.value.next ?: return
        ui.update { it.copy(starting = true) }
        viewModelScope.launch {
            app.workouts.start(preview)
            onStarted()
            ui.update { it.copy(starting = false) }
        }
    }

    fun switchGym(id: String) = viewModelScope.launch {
        runCatching { app.insights.switchGym(id) }
        refresh() // new gym → new rounding and plates in the preview
    }
}

/**
 * Up Next. Glanceable from the doorway: day name huge, what's on the bar listed plainly, one giant
 * Start pill parked in the thumb zone just above the floating island.
 */
@Composable
fun DashboardScreen(vm: DashboardViewModel, onStarted: () -> Unit, bottomInset: androidx.compose.ui.unit.Dp) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val c = Flow.colors
    var gymSheet by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize().background(c.bgBase)) {
        Column(
            Modifier
                .fillMaxSize()
                .haze(LocalHazeState.current)
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .padding(horizontal = FlowSpace.screenMargin)
                .padding(bottom = bottomInset + FlowTargets.hero + 32.dp),
        ) {
            Spacer(Modifier.height(FlowSpace.s24))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Up next", style = Flow.type.titleLg, color = c.textPrimary, modifier = Modifier.weight(1f))
                ui.gyms?.let { g ->
                    Row(
                        Modifier
                            .flowPressable(small = true) { gymSheet = true }
                            .glass(FlowRadius.pill, Glass.Thin)
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.Place, null, tint = c.accent, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.size(6.dp))
                        Text(g.gyms.firstOrNull { it.id == g.currentGymId }?.name ?: "Gym", style = Flow.type.label, color = c.textPrimary)
                    }
                }
            }
            ui.lastFinished?.let { f ->
                Spacer(Modifier.height(FlowSpace.s16))
                Text(
                    "Saved ${f.dayName ?: "workout"}. Liftosaur has run your progression.",
                    style = Flow.type.body, color = c.success,
                )
            }
            Spacer(Modifier.height(FlowSpace.s16))
            val next = ui.next
            if (next == null) {
                Text(if (ui.loading) "Loading your program…" else "No scheduled workout. Pick a program in Liftosaur.", style = Flow.type.bodyLg, color = c.textSecondary)
            } else {
                Column(Modifier.fillMaxWidth().flowCard(FlowRadius.card).padding(FlowSpace.s20)) {
                    Text(next.programName.orEmpty().uppercase(), style = Flow.type.caption, color = c.accent)
                    Text(next.dayName ?: "Day ${next.dayData?.day ?: ""}", style = Flow.type.display, color = c.textPrimary)
                    next.dayData?.let { d ->
                        Text(listOfNotNull(d.week?.let { "Week $it" }, d.dayInWeek?.let { "Day $it" }).joinToString(" · "), style = Flow.type.label, color = c.textSecondary)
                    }
                    Spacer(Modifier.height(FlowSpace.s16))
                    next.entries.forEach { e ->
                        val work = e.sets.filterNot { it.isWarmup }
                        val top = work.mapNotNull { Weight.parse(it.weight) }.maxOrNull()
                        Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.FitnessCenter, null, tint = c.textTertiary, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.size(12.dp))
                            Text(e.name, style = Flow.type.bodyLg, color = c.textPrimary, modifier = Modifier.weight(1f))
                            Text(
                                listOfNotNull("${work.size}×${work.firstOrNull()?.reps ?: "-"}${if (work.any { it.isAmrap }) "+" else ""}", top?.display()).joinToString("  "),
                                style = Flow.type.label, color = c.textSecondary,
                            )
                        }
                    }
                }
            }
        }

        FlowButton(
            text = if (ui.starting) "Starting…" else "Start workout",
            onClick = { vm.start(onStarted) },
            icon = Icons.Rounded.PlayArrow,
            height = FlowTargets.hero,
            enabled = ui.next != null && !ui.starting,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = FlowSpace.screenMargin)
                .padding(bottom = bottomInset + FlowSpace.s16),
        )
    }

    if (gymSheet) {
        ModalBottomSheet(onDismissRequest = { gymSheet = false }, containerColor = c.glassThick, shape = FlowRadius.sheet) {
            Column(Modifier.padding(horizontal = FlowSpace.screenMargin).padding(bottom = FlowSpace.s32), verticalArrangement = Arrangement.spacedBy(FlowSpace.s8)) {
                Text("Where are you lifting?", style = Flow.type.titleMd, color = c.textPrimary)
                Text("Weights and plates are rounded to this gym's equipment.", style = Flow.type.body, color = c.textSecondary)
                Spacer(Modifier.height(FlowSpace.s8))
                ui.gyms?.gyms?.forEach { g ->
                    val on = g.id == ui.gyms?.currentGymId
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(FlowTargets.stepper)
                            .flowPressable { vm.switchGym(g.id); gymSheet = false }
                            .flowCard(FlowRadius.card, glow = if (on) c.accent else androidx.compose.ui.graphics.Color.Unspecified)
                            .padding(horizontal = FlowSpace.s20),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(g.name, style = Flow.type.headline, color = c.textPrimary)
                            Text("${g.equipmentCount} equipment", style = Flow.type.caption, color = c.textSecondary)
                        }
                        if (on) Icon(Icons.Rounded.Check, "Current gym", tint = c.accent)
                    }
                }
            }
        }
    }
}
