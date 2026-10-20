@file:OptIn(ExperimentalSharedTransitionApi::class)

package app.liftodroid.ui.workout

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.liftodroid.domain.LoadingProfile
import app.liftodroid.domain.PlateCalculator
import app.liftodroid.domain.PlateCount
import app.liftodroid.domain.Weight
import app.liftodroid.ui.components.FlowButton
import app.liftodroid.ui.components.FlowButtonStyle
import app.liftodroid.ui.components.FlowIconButton
import app.liftodroid.ui.components.flowCard
import app.liftodroid.ui.components.flowPressable
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius
import app.liftodroid.ui.theme.FlowSpace
import app.liftodroid.ui.theme.FlowTargets
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

sealed interface SetFlowEvent {
    /** Ready → Rest in one tap: log exactly what was prescribed. */
    data object LogAsPrescribed : SetFlowEvent
    data object OpenLogging : SetFlowEvent
    data class Reps(val delta: Int, val left: Boolean = false) : SetFlowEvent
    data class WeightStep(val up: Boolean) : SetFlowEvent
    data class Rpe(val value: Double?) : SetFlowEvent
    data class UserVar(val name: String, val delta: Double) : SetFlowEvent
    data object Save : SetFlowEvent
    data object CancelLogging : SetFlowEvent
    data object StartHold : SetFlowEvent
    data object StopHold : SetFlowEvent
    data class NudgeRest(val deltaSec: Int) : SetFlowEvent
    data object SkipRest : SetFlowEvent
    data object Finish : SetFlowEvent
}

/**
 * The one card that runs a workout. It never navigates: it morphs.
 *
 *   READY ──tap ✓──────────────▶ REST ──timer 0 / skip──▶ READY (next set)
 *     │                            ▲
 *     └─adjust / needs input─▶ LOGGING ─save─┘
 *     └─timed set─▶ HOLDING ─stop─▶ REST
 *
 * Fluid Motion: the container resizes with spring.morph (SizeTransform), content cross-fades with a
 * slight scale, and the load numeral is a shared element, so "100 kg" physically travels from the
 * hero position (Ready) into the stepper (Logging) and into the "Up next" line (Rest).
 * Light as signal: the contour glow is accent while lifting, rest-blue while resting, gold on a PR.
 */
@Composable
fun ActiveSetFlowCard(
    state: SetFlowState,
    profile: LoadingProfile?,
    onEvent: (SetFlowEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = Flow.colors
    val motion = Flow.motion
    val glow by animateColorAsState(
        when (state) {
            is SetFlowState.Resting -> if (state.isPr) c.record else c.rest
            is SetFlowState.Complete -> c.success
            else -> c.accent
        },
        motion.gentle(), label = "stateGlow",
    )
    // The card's corner radius breathes slightly between states: rounder (calmer) while resting.
    val radius by animateDpAsState(if (state is SetFlowState.Resting) 40.dp else 32.dp, motion.morph(), label = "radius")

    SharedTransitionLayout(modifier) {
        AnimatedContent(
            targetState = state,
            contentKey = { it.phaseKey },
            transitionSpec = {
                (fadeIn(motion.gentle()) + scaleIn(motion.morph(), initialScale = 0.94f)) togetherWith
                    (fadeOut(motion.gentle()) + scaleOut(motion.morph(), targetScale = 1.03f)) using
                    SizeTransform(clip = false) { _, _ -> motion.morph() }
            },
            label = "setFlow",
            modifier = Modifier
                .fillMaxWidth()
                .flowCard(RoundedCornerShape(radius), glow = glow),
        ) { s ->
            val shared = SharedScope(this@SharedTransitionLayout, this)
            Column(Modifier.fillMaxWidth().padding(FlowSpace.s20)) {
                when (s) {
                    is SetFlowState.Ready -> ReadyContent(s.target, shared, onEvent)
                    is SetFlowState.Logging -> LoggingContent(s.target, s.draft, profile, shared, onEvent)
                    is SetFlowState.Holding -> HoldingContent(s, onEvent)
                    is SetFlowState.Resting -> RestingContent(s, shared, onEvent)
                    SetFlowState.Complete -> CompleteContent(onEvent)
                }
            }
        }
    }
}

/** Bundles the two scopes a shared element needs, so content functions stay readable. */
class SharedScope(val transition: SharedTransitionScope, val visibility: AnimatedVisibilityScope)

@Composable
private fun Modifier.shared(key: String, scope: SharedScope): Modifier = with(scope.transition) {
    this@shared.sharedBounds(rememberSharedContentState(key), scope.visibility)
}

// ---------------------------------------------------------------- READY

@Composable
private fun ReadyContent(t: SetTarget, shared: SharedScope, onEvent: (SetFlowEvent) -> Unit) {
    val c = Flow.colors
    SetHeader(t, shared)
    Spacer(Modifier.height(FlowSpace.s8))
    Row(verticalAlignment = Alignment.Bottom) {
        Text(
            t.weight?.let { Weight.formatNumber(it.value) } ?: "BW",
            style = Flow.type.numeralHero, color = c.textPrimary,
            modifier = Modifier.shared("load:${t.setId}", shared),
        )
        Text(t.weight?.unit?.suffix.orEmpty(), style = Flow.type.titleMd, color = c.textSecondary, modifier = Modifier.padding(start = 6.dp, bottom = 14.dp))
        Spacer(Modifier.weight(1f))
        Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(bottom = 8.dp)) {
            Text(
                if (t.isTimed) "${t.holdSec}s" else "× ${t.repsLabel}",
                style = Flow.type.numeralLarge, color = c.textPrimary,
                modifier = Modifier.shared("reps:${t.setId}", shared),
            )
            t.targetRpe?.let { Text("@ RPE ${Weight.formatNumber(it)}", style = Flow.type.label, color = c.textSecondary) }
        }
    }
    if (t.rewritePending) PendingRewriteNote()
    if (t.plates.isNotEmpty()) {
        Spacer(Modifier.height(FlowSpace.s12))
        PlateStrip(t.plates, modifier = Modifier.shared("plates:${t.setId}", shared))
    }
    Spacer(Modifier.height(FlowSpace.s20))
    // Thumb zone: the primary action spans the card's full width at the very bottom of the screen.
    Row(horizontalArrangement = Arrangement.spacedBy(FlowSpace.s12), verticalAlignment = Alignment.CenterVertically) {
        FlowIconButton(Icons.Rounded.Tune, "Adjust set", onClick = { onEvent(SetFlowEvent.OpenLogging) }, size = FlowTargets.primary)
        when {
            t.isTimed -> FlowButton("Start hold", { onEvent(SetFlowEvent.StartHold) }, Modifier.weight(1f), icon = Icons.Rounded.Timer, height = FlowTargets.primary)
            t.needsInput -> FlowButton(if (t.isAmrap) "Log reps" else "Log set", { onEvent(SetFlowEvent.OpenLogging) }, Modifier.weight(1f), icon = Icons.Rounded.Check, height = FlowTargets.primary)
            else -> FlowButton("Done", { onEvent(SetFlowEvent.LogAsPrescribed) }, Modifier.weight(1f), icon = Icons.Rounded.Check, height = FlowTargets.primary)
        }
    }
}

// ---------------------------------------------------------------- LOGGING

@Composable
private fun LoggingContent(t: SetTarget, d: SetDraft, profile: LoadingProfile?, shared: SharedScope, onEvent: (SetFlowEvent) -> Unit) {
    val c = Flow.colors
    SetHeader(t, shared)
    Spacer(Modifier.height(FlowSpace.s16))

    Stepper(
        label = if (t.isUnilateral) "Reps · right" else "Reps",
        value = d.reps.toString(),
        onMinus = { onEvent(SetFlowEvent.Reps(-1)) },
        onPlus = { onEvent(SetFlowEvent.Reps(+1)) },
        valueModifier = Modifier.shared("reps:${t.setId}", shared),
    )
    if (t.isUnilateral && d.repsLeft != null) {
        Spacer(Modifier.height(FlowSpace.s12))
        Stepper("Reps · left", d.repsLeft.toString(), { onEvent(SetFlowEvent.Reps(-1, left = true)) }, { onEvent(SetFlowEvent.Reps(+1, left = true)) })
    }
    if (d.weight != null) {
        Spacer(Modifier.height(FlowSpace.s12))
        Stepper(
            label = "Weight",
            value = d.weight.display(),
            onMinus = { onEvent(SetFlowEvent.WeightStep(up = false)) },
            onPlus = { onEvent(SetFlowEvent.WeightStep(up = true)) },
            valueModifier = Modifier.shared("load:${t.setId}", shared),
            repeatOnHold = true,
        )
        profile?.let { PlateCalculator.breakdown(d.weight, it) }?.let { b ->
            Spacer(Modifier.height(FlowSpace.s8))
            PlateStrip(b.perSide, modifier = Modifier.shared("plates:${t.setId}", shared))
            if (!b.isExact) Text("Closest loadable: ${b.achieved.display()}", style = Flow.type.caption, color = c.warning)
        }
    }
    t.promptedVars.forEach { name ->
        Spacer(Modifier.height(FlowSpace.s12))
        Stepper(name, Weight.formatNumber(d.userVars[name] ?: 0.0), { onEvent(SetFlowEvent.UserVar(name, -1.0)) }, { onEvent(SetFlowEvent.UserVar(name, 1.0)) })
    }
    if (t.logRpe || d.rpe != null) {
        Spacer(Modifier.height(FlowSpace.s16))
        RpePicker(d.rpe) { onEvent(SetFlowEvent.Rpe(it)) }
    }
    Spacer(Modifier.height(FlowSpace.s20))
    Row(horizontalArrangement = Arrangement.spacedBy(FlowSpace.s12)) {
        FlowIconButton(Icons.Rounded.Close, "Cancel", onClick = { onEvent(SetFlowEvent.CancelLogging) }, size = FlowTargets.primary)
        FlowButton(
            "Save set", { onEvent(SetFlowEvent.Save) }, Modifier.weight(1f), icon = Icons.Rounded.Check,
            enabled = !(t.logRpe && d.rpe == null),
        )
    }
}

@Composable
private fun Stepper(
    label: String,
    value: String,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    valueModifier: Modifier = Modifier,
    repeatOnHold: Boolean = false,
) {
    val c = Flow.colors
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        FlowIconButton(Icons.Rounded.Remove, "Decrease $label", onMinus, onLongPress = if (repeatOnHold) onMinus else null)
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label.uppercase(), style = Flow.type.caption, color = c.textSecondary)
            Text(
                value, style = Flow.type.display, color = c.textPrimary, textAlign = TextAlign.Center,
                modifier = valueModifier.semantics { liveRegion = LiveRegionMode.Polite; contentDescription = "$label $value" },
            )
        }
        FlowIconButton(Icons.Rounded.Add, "Increase $label", onPlus, onLongPress = if (repeatOnHold) onPlus else null)
    }
}

@Composable
private fun RpePicker(selected: Double?, onPick: (Double?) -> Unit) {
    val c = Flow.colors
    val options = listOf(6.0, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0)
    Text("RPE", style = Flow.type.caption, color = c.textSecondary)
    Spacer(Modifier.height(FlowSpace.s8))
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(FlowSpace.s8)) {
        options.forEach { v ->
            val on = selected == v
            val bg by animateColorAsState(if (on) c.accent else c.accent.copy(alpha = 0.10f), Flow.motion.gentle(), label = "rpe")
            Box(
                Modifier
                    .size(width = 64.dp, height = 56.dp)
                    .flowPressable(small = true) { onPick(if (on) null else v) }
                    .clip(FlowRadius.pill)
                    .background(bg),
                contentAlignment = Alignment.Center,
            ) {
                Text(Weight.formatNumber(v), style = Flow.type.headline, color = if (on) c.onAccent else c.accent)
            }
        }
    }
}

// ---------------------------------------------------------------- HOLDING (timed sets)

@Composable
private fun HoldingContent(s: SetFlowState.Holding, onEvent: (SetFlowEvent) -> Unit) {
    val c = Flow.colors
    val now = rememberFrameClock()
    val elapsed = ((now - s.startedAtMs) / 1000).toInt().coerceAtLeast(0)
    val target = s.target.holdSec ?: 0
    Text(
        listOfNotNull(s.target.exerciseName, if (s.target.isUnilateral) (if (s.leftSideDoneSec == null) "right side" else "left side") else null).joinToString(" · "),
        style = Flow.type.headline, color = c.textSecondary,
    )
    Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) {
        LuminousRing(progress = if (target > 0) elapsed / target.toFloat() else 0f, color = if (elapsed >= target) c.success else c.accent, modifier = Modifier.size(200.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(formatClock(elapsed), style = Flow.type.numeralLarge, color = c.textPrimary)
            Text("of ${formatClock(target)}", style = Flow.type.label, color = c.textSecondary)
        }
    }
    FlowButton(
        if (s.target.isUnilateral && s.leftSideDoneSec == null) "Switch side" else "Stop",
        { onEvent(SetFlowEvent.StopHold) }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Stop, height = FlowTargets.hero,
    )
}

// ---------------------------------------------------------------- RESTING

@Composable
private fun RestingContent(s: SetFlowState.Resting, shared: SharedScope, onEvent: (SetFlowEvent) -> Unit) {
    val c = Flow.colors
    val now = rememberFrameClock()
    val leftMs = (s.endsAtMs - now).coerceAtLeast(0)
    val progress = 1f - leftMs / (s.totalSec * 1000f).coerceAtLeast(1f)
    val ringColor = if (s.isPr) c.record else c.rest

    if (s.isPr) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.EmojiEvents, null, tint = c.record)
            Spacer(Modifier.width(8.dp))
            Text("New estimated 1RM", style = Flow.type.headline, color = c.record)
        }
        Spacer(Modifier.height(FlowSpace.s8))
    }
    Box(Modifier.fillMaxWidth().height(256.dp), contentAlignment = Alignment.Center) {
        LuminousRing(progress, ringColor, Modifier.size(244.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("REST", style = Flow.type.caption, color = c.textSecondary)
            Text(
                formatClock(((leftMs + 999) / 1000).toInt()),
                // Sized to sit inside the ring with margin; still ~2x the type of any other label.
                style = Flow.type.numeralHero.copy(fontSize = 68.sp, lineHeight = 72.sp), color = c.textPrimary,
                modifier = Modifier.semantics { contentDescription = "Rest, ${leftMs / 1000} seconds left" },
            )
        }
    }
    s.next?.let { n ->
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("UP NEXT", style = Flow.type.caption, color = c.textSecondary)
                Text(n.exerciseName, style = Flow.type.headline, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(n.weight?.display() ?: "BW", style = Flow.type.titleMd, color = c.textPrimary, modifier = Modifier.shared("load:${n.setId}", shared))
            Text("  × ${n.repsLabel}", style = Flow.type.titleMd, color = c.textSecondary, modifier = Modifier.shared("reps:${n.setId}", shared))
        }
        if (n.plates.isNotEmpty()) {
            Spacer(Modifier.height(FlowSpace.s8))
            PlateStrip(n.plates, compact = true, modifier = Modifier.shared("plates:${n.setId}", shared))
        }
        Spacer(Modifier.height(FlowSpace.s16))
    }
    Row(horizontalArrangement = Arrangement.spacedBy(FlowSpace.s12), verticalAlignment = Alignment.CenterVertically) {
        FlowIconButton(Icons.Rounded.Remove, "Rest 15 seconds less", { onEvent(SetFlowEvent.NudgeRest(-15)) }, size = FlowTargets.primary) {
            Text("−15", style = Flow.type.headline, color = c.textPrimary)
        }
        FlowButton("Lift", { onEvent(SetFlowEvent.SkipRest) }, Modifier.weight(1f), icon = Icons.Rounded.SkipNext, color = ringColor)
        FlowIconButton(Icons.Rounded.Add, "Rest 30 seconds more", { onEvent(SetFlowEvent.NudgeRest(30)) }, size = FlowTargets.primary) {
            Text("+30", style = Flow.type.headline, color = c.textPrimary)
        }
    }
}

// ---------------------------------------------------------------- COMPLETE

@Composable
private fun CompleteContent(onEvent: (SetFlowEvent) -> Unit) {
    val c = Flow.colors
    Text("Every set logged", style = Flow.type.titleLg, color = c.textPrimary)
    Text("Finishing hands your sets to Liftosaur, which runs your progression.", style = Flow.type.body, color = c.textSecondary)
    Spacer(Modifier.height(FlowSpace.s20))
    FlowButton("Finish workout", { onEvent(SetFlowEvent.Finish) }, Modifier.fillMaxWidth(), color = c.success, icon = Icons.Rounded.Check, height = FlowTargets.hero)
}

// ---------------------------------------------------------------- pieces

@Composable
private fun SetHeader(t: SetTarget, shared: SharedScope) {
    val c = Flow.colors
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.shared("header:${t.setId}", shared)) {
        Text(t.exerciseName, style = Flow.type.titleMd, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
        Spacer(Modifier.width(10.dp))
        Text(
            (if (t.isWarmup) "Warm-up ${t.number}/${t.count}" else "Set ${t.number}/${t.count}"),
            style = Flow.type.label, color = if (t.isWarmup) c.warning else c.accent,
        )
    }
}

@Composable
private fun PendingRewriteNote() {
    Text(
        "Target may update once your last set syncs",
        style = Flow.type.caption, color = Flow.colors.warning,
        modifier = Modifier.padding(top = 4.dp),
    )
}

/** One side of the bar, heaviest plate innermost. Plate height scales with weight; colours follow kg convention. */
@Composable
fun PlateStrip(perSide: List<PlateCount>, modifier: Modifier = Modifier, compact: Boolean = false) {
    val c = Flow.colors
    val h = if (compact) 36.dp else 56.dp
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Canvas(Modifier.width(if (compact) 120.dp else 168.dp).height(h)) {
            val sleeveY = size.height / 2
            drawRoundRect(c.textTertiary, Offset(0f, sleeveY - 3.dp.toPx()), Size(size.width, 6.dp.toPx()), androidx.compose.ui.geometry.CornerRadius(3.dp.toPx()))
            var x = 4.dp.toPx()
            val maxKg = 25.0
            perSide.forEach { p ->
                val kg = p.weight.to(app.liftodroid.domain.WeightUnit.KG).value
                val ph = (size.height * (0.35 + 0.65 * (kg / maxKg).coerceAtMost(1.0))).toFloat()
                val pw = (if (kg >= 10) 9.dp else 6.dp).toPx()
                repeat(p.num) {
                    val corner = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx())
                    drawRoundRect(plateColor(kg), Offset(x, sleeveY - ph / 2), Size(pw, ph), corner)
                    // Hairline edge so white/grey plates still read on a white card.
                    drawRoundRect(c.textTertiary, Offset(x, sleeveY - ph / 2), Size(pw, ph), corner, style = Stroke(1.dp.toPx()))
                    x += pw + 2.dp.toPx()
                }
            }
        }
        Spacer(Modifier.width(FlowSpace.s12))
        Text(
            perSide.joinToString("  ") { "${Weight.formatNumber(it.weight.value)}×${it.num}" }.ifEmpty { "Empty bar" },
            style = if (compact) Flow.type.caption else Flow.type.label, color = c.textSecondary,
            modifier = Modifier.semantics { contentDescription = "Plates per side: " + perSide.joinToString { "${it.num} of ${it.weight.display()}" } },
        )
    }
}

private fun plateColor(kg: Double): Color = when {
    kg >= 24 -> Color(0xFFE5383B)
    kg >= 19 -> Color(0xFF2F6BFF)
    kg >= 14 -> Color(0xFFF5C518)
    kg >= 9 -> Color(0xFF22B35E)
    kg >= 4 -> Color(0xFFE8E8EA)
    else -> Color(0xFF8E8E93)
}

/** Progress ring with a luminous "comet" head at the leading edge: light as progress signal. */
@Composable
fun LuminousRing(progress: Float, color: Color, modifier: Modifier = Modifier) {
    val track = Flow.colors.divider
    Canvas(modifier) {
        val stroke = 14.dp.toPx()
        val inset = stroke / 2 + 8.dp.toPx()
        val arcSize = Size(size.width - inset * 2, size.height - inset * 2)
        val topLeft = Offset(inset, inset)
        val sweep = 360f * progress.coerceIn(0f, 1f)
        drawArc(track, 0f, 360f, false, topLeft, arcSize, style = Stroke(stroke))
        // sweepGradient starts at 3 o'clock; rotate so it starts at 12 and brightens toward the head.
        rotate(-90f) {
            drawArc(
                Brush.sweepGradient(
                    0f to color.copy(alpha = 0.35f),
                    (sweep / 360f).coerceIn(0.001f, 0.998f) to color,
                    1f to color.copy(alpha = 0.35f), // the round start cap wraps to ~360°: keep it dim
                    center = center,
                ),
                0f, sweep, false, topLeft, arcSize, style = Stroke(stroke, cap = StrokeCap.Round),
            )
        }
        if (sweep > 0f) {
            val a = (sweep - 90f) * PI.toFloat() / 180f
            val r = arcSize.width / 2
            val head = Offset(center.x + r * cos(a), center.y + r * sin(a))
            drawCircle(Brush.radialGradient(listOf(color.copy(alpha = 0.55f), Color.Transparent), head, stroke * 1.8f), stroke * 1.8f, head)
            drawCircle(Color.White.copy(alpha = 0.9f), stroke * 0.28f, head)
        }
    }
}

/** Wall-clock that ticks every frame while composed, for smooth ring motion. */
@Composable
fun rememberFrameClock(): Long {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) withFrameMillis { now = System.currentTimeMillis() }
    }
    return now
}

fun formatClock(sec: Int): String = "%d:%02d".format(sec / 60, sec % 60)
