package app.liftodroid.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.isSpecified
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowBlur
import app.liftodroid.ui.theme.GlassLevel
import app.liftodroid.ui.theme.LocalGlassEnabled
import app.liftodroid.ui.theme.LocalHazeState
import dev.chrisbanes.haze.HazeProgressive
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeChild

enum class Glass { Thin, Regular, Thick }

@Composable
fun Glass.level(): GlassLevel = when (this) {
    Glass.Thin -> GlassLevel(FlowBlur.thin, Flow.colors.glassThin)
    Glass.Regular -> GlassLevel(FlowBlur.regular, Flow.colors.glassRegular)
    Glass.Thick -> GlassLevel(FlowBlur.thick, Flow.colors.glassThick)
}

/**
 * Frosted glass + contour glow. Blur comes from Haze over whatever was marked `Modifier.haze(...)`
 * beneath; where blur is unavailable or reduce-transparency is on, the fill is already opaque
 * (see FlowColors.opaque) and only the 1px contour remains, as a divider.
 *
 * [glow] = light-as-signal: tints the contour with a state colour (accent / rest / record) plus a
 * soft outer halo. Animated, so state changes read as light shifting, not a hard swap.
 */
fun Modifier.glass(
    shape: Shape,
    level: Glass = Glass.Regular,
    glow: Color = Color.Unspecified,
    progressiveTop: Boolean = false,
): Modifier = composed {
    val c = Flow.colors
    val lvl = level.level()
    val glowColor by animateColorAsState(if (glow.isSpecified) glow else Color.Transparent, Flow.motion.gentle(), label = "glow")
    val contour = if (glow.isSpecified) {
        Brush.verticalGradient(listOf(glowColor.copy(alpha = 0.6f), glowColor.copy(alpha = 0.25f)))
    } else {
        Brush.verticalGradient(listOf(c.contourTop, c.contourBottom))
    }
    val glassOn = LocalGlassEnabled.current
    val haze = LocalHazeState.current

    this
        .drawBehind {
            if (glowColor.alpha > 0f) {
                // Outer halo, ~12dp: a radial falloff drawn under the surface.
                drawRoundRectGlow(glowColor.copy(alpha = glowColor.alpha * if (c.isDark) 0.18f else 0.25f))
            }
        }
        .shadow(if (c.isDark) 0.dp else 8.dp, shape, ambientColor = Color.Black.copy(alpha = 0.08f), spotColor = Color.Black.copy(alpha = 0.08f))
        .clip(shape)
        .then(
            if (glassOn) {
                Modifier.hazeChild(haze, HazeStyle(backgroundColor = c.bgBase, tint = HazeTint(lvl.fill), blurRadius = lvl.blur, noiseFactor = 0f)) {
                    if (progressiveTop) progressive = HazeProgressive.verticalGradient(startIntensity = 1f, endIntensity = 0f)
                }
            } else {
                Modifier.background(lvl.fill)
            },
        )
        .border(1.dp, contour, shape)
}

/** Calm, near-opaque content card: content stays readable, chrome is what floats. */
fun Modifier.flowCard(shape: Shape, glow: Color = Color.Unspecified): Modifier = composed {
    val c = Flow.colors
    val glowColor by animateColorAsState(if (glow.isSpecified) glow else Color.Transparent, Flow.motion.gentle(), label = "cardGlow")
    this
        .drawBehind { if (glowColor.alpha > 0f) drawRoundRectGlow(glowColor.copy(alpha = 0.22f)) }
        .clip(shape)
        .background(if (c.isDark) c.surfaceRaised else c.surfaceSolid)
        .border(
            if (glowColor.alpha > 0f) 1.5.dp else 1.dp,
            if (glowColor.alpha > 0f) Brush.verticalGradient(listOf(glowColor.copy(alpha = 0.7f), glowColor.copy(alpha = 0.3f)))
            else Brush.verticalGradient(listOf(c.contourTop, c.contourBottom)),
            shape,
        )
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawRoundRectGlow(color: Color) {
    val spread = 12.dp.toPx()
    for (i in 3 downTo 1) {
        val inset = -spread * i / 3f
        drawRoundRect(
            color = color.copy(alpha = color.alpha / (i + 1)),
            topLeft = androidx.compose.ui.geometry.Offset(inset, inset),
            size = androidx.compose.ui.geometry.Size(size.width - inset * 2, size.height - inset * 2),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(28.dp.toPx() + spread * i / 3f),
        )
    }
}
