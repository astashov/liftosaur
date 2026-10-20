package app.liftodroid.ui.insights

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.liftodroid.AppContainer
import app.liftodroid.domain.HistoryRecord
import app.liftodroid.domain.ProgressAnalytics
import app.liftodroid.domain.ProgressPoint
import app.liftodroid.domain.Weight
import app.liftodroid.domain.WeightUnit
import app.liftodroid.ui.components.TrendChart
import app.liftodroid.ui.components.TrendStyle
import app.liftodroid.ui.components.flowCard
import app.liftodroid.ui.components.flowPressable
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius
import app.liftodroid.ui.theme.FlowSpace
import app.liftodroid.ui.theme.LocalHazeState
import dev.chrisbanes.haze.haze
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class InsightsUi(
    val loading: Boolean = true,
    val records: List<HistoryRecord> = emptyList(),
    val exercises: List<String> = emptyList(),
    val bodyweight: List<ProgressPoint> = emptyList(),
    val unit: WeightUnit = WeightUnit.KG,
)

class InsightsViewModel(private val app: AppContainer) : ViewModel() {
    val ui = MutableStateFlow(InsightsUi())

    init {
        viewModelScope.launch {
            val unit = app.insights.units()
            val records = runCatching { app.insights.history() }.getOrDefault(emptyList())
            val bw = runCatching { app.insights.bodyweight() }.getOrDefault(emptyList())
                .map { (ts, w) -> ProgressPoint(Instant.ofEpochMilli(ts), w.to(unit).value) }
            ui.value = InsightsUi(false, records, ProgressAnalytics.exerciseLabels(records), bw, unit)
        }
    }
}

private val dayFmt = DateTimeFormatter.ofPattern("EEE d MMM").withZone(ZoneId.systemDefault())

/** History feed: calm, opaque cards; tap to expand into the full set log (animateContentSize morph). */
@Composable
fun HistoryScreen(vm: InsightsViewModel, bottomInset: Dp) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val c = Flow.colors
    LazyColumn(
        Modifier.fillMaxSize().background(c.bgBase).haze(LocalHazeState.current),
        contentPadding = PaddingValues(
            start = FlowSpace.screenMargin, end = FlowSpace.screenMargin,
            top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + FlowSpace.s24,
            bottom = bottomInset + FlowSpace.s24,
        ),
        verticalArrangement = Arrangement.spacedBy(FlowSpace.s12),
    ) {
        item { Text("History", style = Flow.type.titleLg, color = c.textPrimary) }
        if (!ui.loading && ui.records.isEmpty()) item { Text("No workouts yet. Your first one lands here.", style = Flow.type.body, color = c.textSecondary) }
        items(ui.records, key = { it.id }) { r -> HistoryCard(r) }
    }
}

@Composable
private fun HistoryCard(r: HistoryRecord) {
    val c = Flow.colors
    var open by rememberSaveable(r.id) { mutableStateOf(false) }
    Column(
        Modifier
            .fillMaxWidth()
            .flowPressable { open = !open }
            .flowCard(FlowRadius.card)
            .animateContentSize(Flow.motion.morph())
            .padding(FlowSpace.s16),
    ) {
        Row {
            Column(Modifier.weight(1f)) {
                Text(r.dayName ?: "Workout", style = Flow.type.headline, color = c.textPrimary)
                Text(listOfNotNull(r.date?.let(dayFmt::format), r.program, r.durationSec?.let { "${it / 60} min" }).joinToString(" · "), style = Flow.type.caption, color = c.textSecondary)
            }
            r.totalVolume.entries.firstOrNull()?.let { (u, v) ->
                Text("${Weight.formatNumber(v / 1000)}k ${u.suffix}", style = Flow.type.label, color = c.textSecondary)
            }
        }
        Spacer(Modifier.height(FlowSpace.s8))
        val shown = if (open) r.exercises else r.exercises.take(3)
        shown.forEach { e ->
            Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                Text(e.name, style = Flow.type.body, color = c.textPrimary, modifier = Modifier.weight(1f))
                Text(summarize(e.sets, open), style = Flow.type.body, color = c.textSecondary)
            }
        }
        if (!open && r.exercises.size > 3) Text("+${r.exercises.size - 3} more", style = Flow.type.caption, color = c.accent)
        if (open) r.note?.let { Text("“$it”", style = Flow.type.body, color = c.textSecondary, modifier = Modifier.padding(top = 8.dp)) }
    }
}

private fun summarize(sets: List<app.liftodroid.domain.LoggedSet>, detailed: Boolean): String {
    if (sets.isEmpty()) return "—"
    if (detailed) return sets.joinToString(", ") { s -> "${s.reps}${s.weight?.let { " × ${Weight.formatNumber(it.value)}" } ?: ""}" }
    val top = sets.maxBy { it.weight?.value ?: 0.0 }
    return "${sets.size} sets · top ${top.reps}${top.weight?.let { " × ${it.display()}" } ?: ""}"
}

/**
 * Progress: pick an exercise (chips, most-trained first), see e1RM and per-session volume as two
 * separate single-axis charts, rep PRs as a table, then bodyweight. Everything is computed on-device
 * from history because the API exposes no per-exercise series.
 */
@Composable
fun ProgressScreen(vm: InsightsViewModel, bottomInset: Dp) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val c = Flow.colors
    var selected by rememberSaveable { mutableStateOf<String?>(null) }
    val label = selected ?: ui.exercises.firstOrNull()
    val progress = remember(ui.records, label, ui.unit) { label?.let { ProgressAnalytics.forExercise(ui.records, it, ui.unit) } }

    LazyColumn(
        Modifier.fillMaxSize().background(c.bgBase).haze(LocalHazeState.current),
        contentPadding = PaddingValues(
            start = FlowSpace.screenMargin, end = FlowSpace.screenMargin,
            top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + FlowSpace.s24,
            bottom = bottomInset + FlowSpace.s24,
        ),
        verticalArrangement = Arrangement.spacedBy(FlowSpace.s16),
    ) {
        item { Text("Progress", style = Flow.type.titleLg, color = c.textPrimary) }
        item {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(FlowSpace.s8)) {
                ui.exercises.take(12).forEach { ex ->
                    val on = ex == label
                    Box(
                        Modifier
                            .flowPressable(small = true) { selected = ex }
                            .clip(FlowRadius.pill)
                            .background(if (on) c.accent else c.accent.copy(alpha = 0.10f))
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                    ) { Text(ex, style = Flow.type.label, color = if (on) c.onAccent else c.textPrimary) }
                }
            }
        }
        progress?.let { p ->
            item {
                Column(Modifier.fillMaxWidth().flowCard(FlowRadius.card).padding(FlowSpace.s16)) {
                    Text("Estimated 1RM", style = Flow.type.headline, color = c.textPrimary)
                    p.bestE1rm?.let { Text("Best ${Weight.formatNumber(it.value)} ${p.unit.suffix} · ${dayFmt.format(it.at)}", style = Flow.type.caption, color = c.textSecondary) }
                    Spacer(Modifier.height(FlowSpace.s12))
                    TrendChart(p.e1rm, p.unit.suffix)
                }
            }
            item {
                Column(Modifier.fillMaxWidth().flowCard(FlowRadius.card).padding(FlowSpace.s16)) {
                    Text("Volume per session", style = Flow.type.headline, color = c.textPrimary)
                    Spacer(Modifier.height(FlowSpace.s12))
                    TrendChart(p.volume, p.unit.suffix, style = TrendStyle.Bars)
                }
            }
            if (p.repPrs.isNotEmpty()) item {
                Column(Modifier.fillMaxWidth().flowCard(FlowRadius.card).padding(FlowSpace.s16)) {
                    Text("Rep records", style = Flow.type.headline, color = c.textPrimary)
                    Spacer(Modifier.height(FlowSpace.s8))
                    p.repPrs.entries.take(10).forEach { (reps, w) ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                            Text("$reps RM", style = Flow.type.bodyLg, color = c.textSecondary, modifier = Modifier.weight(1f))
                            Text(w.display(), style = Flow.type.bodyLg, color = c.textPrimary)
                        }
                    }
                }
            }
        }
        item {
            Column(Modifier.fillMaxWidth().flowCard(FlowRadius.card).padding(FlowSpace.s16)) {
                Text("Bodyweight", style = Flow.type.headline, color = c.textPrimary)
                Spacer(Modifier.height(FlowSpace.s12))
                TrendChart(ui.bodyweight, ui.unit.suffix)
            }
        }
    }
}
