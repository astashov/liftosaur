package app.liftodroid.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.isSpecified
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.isSpecified
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius
import app.liftodroid.ui.theme.FlowTargets
import kotlin.math.min

/**
 * Flexible feedback: compress on press (spring.press), rebound with one overshoot on release
 * (spring.release), a radial touch glow that follows the finger, and a light haptic tick.
 * Long-press support lets steppers repeat.
 */
fun Modifier.flowPressable(
    enabled: Boolean = true,
    small: Boolean = false,
    onLongPress: (() -> Unit)? = null,
    onClick: () -> Unit,
): Modifier = composed {
    val motion = Flow.motion
    val glowColor = Flow.colors.touchGlow
    val haptic = LocalHapticFeedback.current
    var pressed by remember { mutableStateOf(false) }
    var touch by remember { mutableStateOf(Offset.Unspecified) }
    val scale by animateFloatAsState(
        targetValue = if (pressed) (if (small) motion.pressScaleSmall else motion.pressScale) else 1f,
        animationSpec = if (pressed) motion.press() else motion.release(),
        label = "press",
    )
    val glow by animateFloatAsState(if (pressed) 1f else 0f, motion.gentle(), label = "touchGlow")

    this
        .semantics { role = Role.Button }
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .alpha(if (enabled) 1f else 0.38f)
        .drawWithContent {
            drawContent()
            if (glow > 0f && touch.isSpecified) {
                drawCircle(
                    brush = Brush.radialGradient(listOf(glowColor.copy(alpha = glowColor.alpha * glow), Color.Transparent), touch, min(size.width, size.height) * 1.2f),
                    radius = min(size.width, size.height) * 1.2f,
                    center = touch,
                )
            }
        }
        .then(
            if (!enabled) Modifier else Modifier.pointerInput(onClick, onLongPress) {
                detectTapGestures(
                    onPress = { at ->
                        touch = at
                        pressed = true
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        tryAwaitRelease()
                        pressed = false
                    },
                    onLongPress = onLongPress?.let { lp -> { _ -> haptic.performHapticFeedback(HapticFeedbackType.LongPress); lp() } },
                    onTap = { onClick() },
                )
            },
        )
}

enum class FlowButtonStyle { Primary, Tonal, Glass, Danger }

@Composable
fun FlowButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: FlowButtonStyle = FlowButtonStyle.Primary,
    height: Dp = FlowTargets.primary,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    color: Color = Color.Unspecified,
) {
    val c = Flow.colors
    val tint = if (color.isSpecified) color else c.accent
    val (bg, fg) = when (style) {
        FlowButtonStyle.Primary -> tint to c.onAccent
        FlowButtonStyle.Danger -> c.danger to Color.White
        FlowButtonStyle.Tonal -> tint.copy(alpha = 0.14f) to tint
        FlowButtonStyle.Glass -> Color.Transparent to c.textPrimary
    }
    val shape = FlowRadius.pill
    Box(
        modifier = modifier
            .defaultMinSize(minHeight = height, minWidth = height)
            .flowPressable(enabled = enabled, onClick = onClick)
            .then(
                if (style == FlowButtonStyle.Glass) Modifier.glass(shape, Glass.Thin)
                else Modifier.background(bg, shape),
            ),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 24.dp)) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.padding(end = 10.dp))
            }
            Text(text, style = Flow.type.headline, color = fg)
        }
    }
}

/** Round icon control (steppers, timer nudges). Always has a content description. */
@Composable
fun FlowIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = FlowTargets.stepper,
    onLongPress: (() -> Unit)? = null,
    tint: Color = Color.Unspecified,
    content: (@Composable BoxScope.() -> Unit)? = null,
) {
    Box(
        modifier
            .defaultMinSize(size, size)
            .flowPressable(small = true, onLongPress = onLongPress, onClick = onClick)
            .glass(FlowRadius.pill, Glass.Thin)
            .semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center,
    ) {
        content?.invoke(this) ?: Icon(icon, contentDescription = null, tint = if (tint.isSpecified) tint else Flow.colors.textPrimary)
    }
}
