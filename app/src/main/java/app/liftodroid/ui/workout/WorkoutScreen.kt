package app.liftodroid.ui.workout

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.onSizeChanged
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.liftodroid.data.DrainResult
import app.liftodroid.domain.Weight
import app.liftodroid.ui.components.FlowIconButton
import app.liftodroid.ui.components.Glass
import app.liftodroid.ui.components.flowCard
import app.liftodroid.ui.components.glass
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius
import app.liftodroid.ui.theme.FlowSpace
import app.liftodroid.ui.theme.LocalHazeState
import dev.chrisbanes.haze.haze

/**
 * Live workout. Three layers, never more (spec: content → floating chrome → modal):
 *   content   the scrollable exercise list (top 60%: reading, not reaching)
 *   chrome    glass top bar + the ActiveSetFlowCard pinned in the thumb zone (bottom 40%)
 *   modal     conflict / discard dialogs
 */
@Composable
fun WorkoutScreen(vm: WorkoutViewModel) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val active = ui.active ?: return
    val c = Flow.colors
    var cardHeight by remember { mutableStateOf(0) }
    var confirmDiscard by remember { mutableStateOf(false) }
    val density = LocalDensity.current

    Box(Modifier.fillMaxSize().background(c.bgBase)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().haze(LocalHazeState.current),
            contentPadding = PaddingValues(
                start = FlowSpace.screenMargin, end = FlowSpace.screenMargin,
                top = 96.dp, bottom = with(density) { cardHeight.toDp() } + 48.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(FlowSpace.s12),
        ) {
            val byEntry = ui.targets.groupBy { it.entryId to it.exerciseName }
            items(byEntry.entries.toList(), key = { it.key.first + it.key.second }) { (key, sets) ->
                ExerciseCard(
                    name = key.second,
                    sets = sets,
                    currentSetId = (ui.flow as? SetFlowState.Ready)?.target?.setId ?: (ui.flow as? SetFlowState.Resting)?.next?.setId,
                    onFocus = vm::focus,
                    onUndo = { vm.undo(it.setId, it.entryId) },
                )
            }
        }

        // Floating glass top bar with progressive blur; content scrolls beneath it.
        Row(
            Modifier
                .fillMaxWidth()
                .glass(androidx.compose.ui.graphics.RectangleShape, Glass.Regular, progressiveTop = true)
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = FlowSpace.screenMargin, vertical = FlowSpace.s12),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(active.workout.dayName ?: "Workout", style = Flow.type.headline, color = c.textPrimary)
                Text(listOfNotNull(active.workout.programName, elapsed(active.workout.startTime)).joinToString(" · "), style = Flow.type.caption, color = c.textSecondary)
            }
            SyncPill(active.queuedWrites, active.startConfirmed, ui.sync)
            Spacer(Modifier.size(FlowSpace.s8))
            FlowIconButton(Icons.Rounded.Delete, "Discard workout", { confirmDiscard = true }, size = 48.dp)
        }

        // Thumb zone.
        ui.flow?.let { flow ->
            ActiveSetFlowCard(
                state = flow,
                profile = (flow as? SetFlowState.Logging)?.target?.equipment?.let { ui.profiles[it] },
                onEvent = vm::onEvent,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(FlowSpace.s12)
                    .onSizeChanged { cardHeight = it.height },
            )
        }
    }

    if (confirmDiscard) {
        AlertDialog(
            onDismissRequest = { confirmDiscard = false },
            title = { Text("Discard this workout?") },
            text = { Text("Nothing from this session will be saved to Liftosaur. This can't be undone.") },
            confirmButton = { TextButton({ confirmDiscard = false; vm.discard() }) { Text("Discard", color = c.danger) } },
            dismissButton = { TextButton({ confirmDiscard = false }) { Text("Keep lifting") } },
            containerColor = c.glassThick, shape = FlowRadius.dialog,
        )
    }
    (ui.sync as? DrainResult.Conflict)?.let { conflict ->
        AlertDialog(
            onDismissRequest = {},
            title = { Text("Another workout is live") },
            text = { Text("${conflict.remote?.dayName ?: "A workout"} was started on another device. Keep that one, or replace it with this session?") },
            confirmButton = { TextButton(vm::keepRemote) { Text("Keep other") } },
            dismissButton = { TextButton(vm::replaceRemote) { Text("Use this one", color = c.danger) } },
            containerColor = c.glassThick, shape = FlowRadius.dialog,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
private fun ExerciseCard(name: String, sets: List<SetTarget>, currentSetId: String?, onFocus: (String) -> Unit, onUndo: (SetTarget) -> Unit) {
    val c = Flow.colors
    val isCurrent = sets.any { it.setId == currentSetId }
    Column(Modifier.fillMaxWidth().flowCard(FlowRadius.card, glow = if (isCurrent) c.accent.copy(alpha = 0.6f) else androidx.compose.ui.graphics.Color.Unspecified).padding(FlowSpace.s16)) {
        Text(name, style = Flow.type.headline, color = c.textPrimary)
        Spacer(Modifier.height(FlowSpace.s12))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(FlowSpace.s8), verticalArrangement = Arrangement.spacedBy(FlowSpace.s8)) {
            sets.forEach { s ->
                val done = s.completed != null
                val selected = s.setId == currentSetId
                val bg by animateColorAsState(
                    when {
                        done -> c.success.copy(alpha = 0.18f)
                        selected -> c.accent
                        else -> c.accent.copy(alpha = 0.08f)
                    }, Flow.motion.gentle(), label = "chip",
                )
                val fg = when { done -> c.success; selected -> c.onAccent; else -> c.textPrimary }
                val reps = s.completed?.reps?.toString() ?: s.repsLabel
                val w = (Weight.parse(s.completed?.weight) ?: s.weight)?.let { Weight.formatNumber(it.value) }
                Box(
                    Modifier
                        .clip(FlowRadius.pill)
                        .background(bg)
                        .combinedClickable(onClick = { if (!done) onFocus(s.setId) }, onLongClick = { if (done) onUndo(s) })
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                        .semantics { contentDescription = "${if (s.isWarmup) "Warm-up" else "Set"} ${s.number}, $reps reps${w?.let { " at $it" } ?: ""}${if (done) ", done. Long-press to undo" else ""}" },
                ) {
                    Text(listOfNotNull(w, reps).joinToString(" × "), style = Flow.type.label, color = if (s.rewritePending) c.warning else fg)
                }
            }
        }
    }
}

@Composable
private fun SyncPill(queued: Int, startConfirmed: Boolean, sync: DrainResult) {
    val c = Flow.colors
    val (icon, label, tint) = when {
        sync is DrainResult.Blocked -> Triple(Icons.Rounded.CloudOff, "Needs attention", c.danger)
        queued == 0 && startConfirmed -> Triple(Icons.Rounded.CloudDone, "Synced", c.success)
        sync is DrainResult.Retry -> Triple(Icons.Rounded.CloudOff, "Offline · $queued queued", c.warning)
        else -> Triple(Icons.Rounded.CloudUpload, "Syncing $queued", c.textSecondary)
    }
    AnimatedVisibility(true, enter = fadeIn(), exit = fadeOut()) {
        Row(
            Modifier.glass(FlowRadius.pill, Glass.Thin).padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(16.dp))
            Spacer(Modifier.size(6.dp))
            Text(label, style = Flow.type.caption, color = tint)
        }
    }
}

private fun elapsed(start: Long): String {
    val min = ((System.currentTimeMillis() - start) / 60_000).coerceAtLeast(0)
    return if (min < 60) "${min}m" else "${min / 60}h ${min % 60}m"
}
