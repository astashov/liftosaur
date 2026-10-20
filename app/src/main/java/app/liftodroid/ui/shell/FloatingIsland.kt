package app.liftodroid.ui.shell

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.liftodroid.ui.components.Glass
import app.liftodroid.ui.components.flowPressable
import app.liftodroid.ui.components.glass
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius

data class IslandTab(val label: String, val icon: ImageVector, val selectedIcon: ImageVector)

/**
 * Floating glass pill nav. The lighter inner indicator springs between tabs and STRETCHES in the
 * direction of travel (its leading edge runs ahead on a stiffer spring than its trailing edge), and
 * a horizontal swipe across the bar switches tabs with a detent tick per tab crossed.
 */
@Composable
fun FloatingIsland(tabs: List<IslandTab>, selected: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val c = Flow.colors
    val motion = Flow.motion
    val haptic = LocalHapticFeedback.current
    val density = LocalDensity.current
    var widthPx by remember { mutableIntStateOf(0) }
    val tabW = with(density) { (widthPx / tabs.size).toDp() }

    // Two edges on different springs = the stretch-then-settle morph from the spec.
    val movingRight = remember { mutableFloatStateOf(0f) }
    val lead by animateDpAsState(tabW * (selected + 1), if (movingRight.floatValue >= 0) motion.press() else motion.morph(), label = "lead")
    val trail by animateDpAsState(tabW * selected, if (movingRight.floatValue >= 0) motion.morph() else motion.press(), label = "trail")

    var dragAcc by remember { mutableFloatStateOf(0f) }
    fun select(i: Int) {
        if (i == selected || i !in tabs.indices) return
        movingRight.floatValue = (i - selected).toFloat()
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        onSelect(i)
    }

    Box(
        modifier
            .height(64.dp)
            .glass(FlowRadius.pill, Glass.Thin)
            .onSizeChanged { widthPx = it.width }
            .pointerInput(selected, widthPx) {
                detectHorizontalDragGestures(onDragEnd = { dragAcc = 0f }) { _, dx ->
                    dragAcc += dx
                    val step = widthPx / tabs.size * 0.6f
                    if (dragAcc > step) { select(selected + 1); dragAcc = 0f }
                    if (dragAcc < -step) { select(selected - 1); dragAcc = 0f }
                }
            }
            .selectableGroup(),
    ) {
        Box(
            Modifier
                .offset(x = trail + 4.dp)
                .padding(vertical = 6.dp)
                .width((lead - trail - 8.dp).coerceAtLeast(0.dp))
                .fillMaxHeight()
                .clip(FlowRadius.pill)
                .background(c.accent.copy(alpha = if (c.isDark) 0.28f else 0.16f)),
        )
        Row(Modifier.fillMaxWidth().fillMaxHeight()) {
            tabs.forEachIndexed { i, t ->
                val on = i == selected
                Column(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .semantics { role = Role.Tab; this.selected = on }
                        .flowPressable(small = true) { select(i) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
                ) {
                    Icon(if (on) t.selectedIcon else t.icon, null, tint = if (on) c.accent else c.textPrimary)
                    Text(t.label, style = Flow.type.caption, color = if (on) c.accent else c.textSecondary)
                }
            }
        }
    }
}
