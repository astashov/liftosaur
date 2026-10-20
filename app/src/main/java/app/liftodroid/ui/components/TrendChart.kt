package app.liftodroid.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.liftodroid.domain.ProgressPoint
import app.liftodroid.domain.Weight
import app.liftodroid.ui.theme.Flow
import java.time.ZoneId
import java.time.format.DateTimeFormatter

enum class TrendStyle { Line, Bars }

/**
 * One series, one axis. Line for continuous trends (e1RM, bodyweight), bars for per-session totals
 * (volume). Recessive grid, 2dp line, 4dp rounded bar ends, direct label on the latest point only.
 * Scrub with a finger: a crosshair snaps to the nearest session with a readout above the plot and a
 * detent tick per point crossed, the touch analogue of a hover tooltip.
 */
@Composable
fun TrendChart(
    points: List<ProgressPoint>,
    unitLabel: String,
    modifier: Modifier = Modifier,
    style: TrendStyle = TrendStyle.Line,
) {
    val c = Flow.colors
    val haptic = LocalHapticFeedback.current
    var scrub by remember(points) { mutableStateOf<Int?>(null) }
    val fmt = remember { DateTimeFormatter.ofPattern("d MMM yyyy").withZone(ZoneId.systemDefault()) }

    if (points.size < 2) {
        Text("Log a few more sessions to see a trend.", style = Flow.type.body, color = c.textSecondary, modifier = modifier.padding(vertical = 24.dp))
        return
    }
    val shown = scrub?.let { points[it] } ?: points.last()
    val minV = points.minOf { it.value }.let { if (style == TrendStyle.Bars) 0.0 else it }
    val maxV = points.maxOf { it.value }
    val span = (maxV - minV).takeIf { it > 0 } ?: 1.0

    Column(modifier) {
        // Readout: text tokens only, never the series colour.
        Row {
            Text("${Weight.formatNumber(shown.value)} $unitLabel", style = Flow.type.titleMd, color = c.textPrimary)
            Spacer(Modifier.padding(start = 8.dp))
            Text(fmt.format(shown.at), style = Flow.type.label, color = c.textSecondary, modifier = Modifier.padding(top = 6.dp))
        }
        Spacer(Modifier.height(8.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(180.dp)
                .semantics {
                    contentDescription = "Trend from ${Weight.formatNumber(points.first().value)} to ${Weight.formatNumber(points.last().value)} $unitLabel over ${points.size} sessions"
                }
                .pointerInput(points) {
                    fun indexAt(x: Float) = ((x / size.width) * (points.size - 1)).toInt().coerceIn(0, points.lastIndex)
                    detectTapGestures(onPress = { scrub = indexAt(it.x); tryAwaitRelease(); scrub = null })
                }
                .pointerInput(points) {
                    fun indexAt(x: Float) = (((x / size.width) * (points.size - 1)) + 0.5f).toInt().coerceIn(0, points.lastIndex)
                    detectDragGestures(onDragEnd = { scrub = null }, onDragCancel = { scrub = null }) { change, _ ->
                        val i = indexAt(change.position.x)
                        if (i != scrub) haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        scrub = i
                    }
                },
        ) {
            Canvas(Modifier.fillMaxWidth().height(180.dp)) {
                val pad = 8.dp.toPx()
                val w = size.width
                val h = size.height - pad * 2
                fun x(i: Int) = if (points.size == 1) w / 2 else i * w / (points.size - 1)
                fun y(v: Double) = pad + (h - ((v - minV) / span * h)).toFloat()

                // Recessive grid: three hairlines.
                repeat(3) { g ->
                    val gy = pad + h * g / 2f
                    drawLine(c.divider, Offset(0f, gy), Offset(w, gy), 1.dp.toPx())
                }

                when (style) {
                    TrendStyle.Line -> {
                        val line = Path().apply {
                            points.forEachIndexed { i, p -> if (i == 0) moveTo(x(i), y(p.value)) else lineTo(x(i), y(p.value)) }
                        }
                        val area = Path().apply {
                            addPath(line)
                            lineTo(x(points.lastIndex), size.height)
                            lineTo(0f, size.height)
                            close()
                        }
                        drawPath(area, Brush.verticalGradient(listOf(c.chartSeries.copy(alpha = 0.22f), Color.Transparent)))
                        drawPath(line, c.chartSeries, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
                        // Luminous latest point: light marks "now".
                        val last = Offset(x(points.lastIndex), y(points.last().value))
                        drawCircle(Brush.radialGradient(listOf(c.chartSeries.copy(alpha = 0.45f), Color.Transparent), last, 16.dp.toPx()), 16.dp.toPx(), last)
                        drawCircle(c.surfaceSolid, 6.dp.toPx(), last)
                        drawCircle(c.chartSeries, 4.dp.toPx(), last)
                    }
                    TrendStyle.Bars -> {
                        val slot = w / points.size
                        val bw = (slot - 2.dp.toPx()).coerceAtLeast(2.dp.toPx())
                        points.forEachIndexed { i, p ->
                            val top = y(p.value)
                            drawRoundRect(
                                if (scrub == null || scrub == i) c.chartSeries else c.chartSeries.copy(alpha = 0.35f),
                                Offset(i * slot + 1.dp.toPx(), top), Size(bw, size.height - pad - top),
                                CornerRadius(minOf(4.dp.toPx(), bw / 2)),
                            )
                        }
                    }
                }

                scrub?.let { i ->
                    val sx = if (style == TrendStyle.Bars) (i + 0.5f) * w / points.size else x(i)
                    drawLine(c.textTertiary, Offset(sx, 0f), Offset(sx, size.height), 1.dp.toPx())
                    if (style == TrendStyle.Line) {
                        val sp = Offset(sx, y(points[i].value))
                        drawCircle(c.surfaceSolid, 7.dp.toPx(), sp)
                        drawCircle(c.chartSeries, 5.dp.toPx(), sp)
                    }
                }
            }
        }
    }
}
