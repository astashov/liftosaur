package app.liftodroid.ui.theme

import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/*
 * Living Flow tokens for LiftoDroid. Values follow the attached spec (best-estimate approximations of
 * ColorOS 17's language, not official OPPO values), with three gym-driven deviations, each marked GYM:
 *   1. Contrast is pushed past 4.5:1 and glass is thicker, for harsh overhead lighting.
 *   2. Touch targets for in-workout controls are 64–88dp, not 48dp: chalky, sweaty, gloved fingers.
 *   3. Numerals that matter mid-set are display-sized and tabular so they read from a bench.
 */

@Immutable
data class FlowColors(
    val accent: Color,
    val accentPressed: Color,
    val onAccent: Color,
    val bgBase: Color,
    val surfaceSolid: Color,
    val surfaceRaised: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textTertiary: Color,
    val divider: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    /** Rest state hue: cool, calm. Distinct from accent so state is legible by colour alone at a glance. */
    val rest: Color,
    /** PR celebration hue. */
    val record: Color,
    /** Single-series chart mark. Validated separately from accent: dark accent is too light for marks. */
    val chartSeries: Color,
    val glassThin: Color,
    val glassRegular: Color,
    val glassThick: Color,
    val scrim: Color,
    val contourTop: Color,
    val contourBottom: Color,
    val touchGlow: Color,
    val isDark: Boolean,
)

// Brand accent: Liftosaur's purple, lifted for contrast on both bases.
private val Accent = Color(0xFF7C4DFF)

val LightFlowColors = FlowColors(
    accent = Accent,
    accentPressed = Color(0xFF6A3DF0),
    onAccent = Color.White,
    bgBase = Color(0xFFF2F3F5),
    surfaceSolid = Color.White,
    surfaceRaised = Color(0xFFF7F7F9),
    textPrimary = Color(0xE6000000),
    textSecondary = Color(0x99000000), // GYM: 60% (spec 55%) to hold 4.5:1 on glass
    textTertiary = Color(0x66000000),
    divider = Color(0x14000000),
    success = Color(0xFF1E9E53),
    warning = Color(0xFFE08600),
    danger = Color(0xFFE0362E),
    rest = Color(0xFF0A84C6),
    record = Color(0xFFFFB020),
    chartSeries = Color(0xFF7C4DFF),
    glassThin = Color(0x99FFFFFF),   // GYM: 0.60 (spec 0.55)
    glassRegular = Color(0xB3FFFFFF),
    glassThick = Color(0xD6FAFAFC),
    scrim = Color(0x2E000000),
    contourTop = Color(0xBFFFFFFF),
    contourBottom = Color(0x33FFFFFF),
    touchGlow = Color(0x24FFFFFF),
    isDark = false,
)

val DarkFlowColors = FlowColors(
    accent = Color(0xFF9E7BFF),
    accentPressed = Color(0xFF8C66FF),
    onAccent = Color(0xFF12002E),
    bgBase = Color.Black, // OLED: also the gym default, saves battery over a 90-minute session
    surfaceSolid = Color(0xFF1C1C1E),
    surfaceRaised = Color(0xFF2A2A2D),
    textPrimary = Color(0xEBFFFFFF),
    textSecondary = Color(0xA3FFFFFF),
    textTertiary = Color(0x61FFFFFF),
    divider = Color(0x1AFFFFFF),
    success = Color(0xFF34C77B),
    warning = Color(0xFFFFA31A),
    danger = Color(0xFFFF5A52),
    rest = Color(0xFF4CC2FF),
    record = Color(0xFFFFC94D),
    chartSeries = Color(0xFF8F66FF),
    glassThin = Color(0x8C28282C),
    glassRegular = Color(0xA6242428),
    glassThick = Color(0xC71E1E22),
    scrim = Color(0x66000000),
    contourTop = Color(0x38FFFFFF),
    contourBottom = Color(0x0DFFFFFF),
    touchGlow = Color(0x1AFFFFFF),
    isDark = true,
)

/** Reduced-transparency variants: glass becomes opaque surfaces, contour becomes a plain divider. */
fun FlowColors.opaque(): FlowColors = copy(
    glassThin = surfaceSolid,
    glassRegular = surfaceSolid,
    glassThick = surfaceRaised,
    contourTop = divider,
    contourBottom = divider,
)

@Immutable
data class GlassLevel(val blur: Dp, val fill: Color)

object FlowRadius {
    val xs = 8.dp
    val sm = 12.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp
    val card = RoundedCornerShape(lg)
    val sheet = RoundedCornerShape(topStart = xl, topEnd = xl)
    val dialog = RoundedCornerShape(xl)
    val pill = RoundedCornerShape(percent = 50)
}

object FlowSpace {
    val s4 = 4.dp
    val s8 = 8.dp
    val s12 = 12.dp
    val s16 = 16.dp
    val s20 = 20.dp
    val s24 = 24.dp
    val s32 = 32.dp
    val s40 = 40.dp
    val s48 = 48.dp
    val screenMargin = 16.dp
}

/** GYM: in-workout touch targets. */
object FlowTargets {
    val min = 48.dp
    val stepper = 72.dp
    val primary = 76.dp
    val hero = 88.dp
}

object FlowBlur {
    val thin = 24.dp
    val regular = 32.dp
    val thick = 44.dp
}

@Immutable
data class FlowType(
    /** Giant tabular numerals: weight and countdown. Readable at ~1m. */
    val numeralHero: TextStyle,
    val numeralLarge: TextStyle,
    val display: TextStyle,
    val titleLg: TextStyle,
    val titleMd: TextStyle,
    val headline: TextStyle,
    val bodyLg: TextStyle,
    val body: TextStyle,
    val label: TextStyle,
    val caption: TextStyle,
)

private const val TABULAR = "tnum"

fun flowType(family: FontFamily = FontFamily.SansSerif) = FlowType(
    numeralHero = TextStyle(fontFamily = family, fontSize = 88.sp, lineHeight = 92.sp, fontWeight = FontWeight.Medium, fontFeatureSettings = TABULAR, letterSpacing = (-2).sp),
    numeralLarge = TextStyle(fontFamily = family, fontSize = 56.sp, lineHeight = 60.sp, fontWeight = FontWeight.Medium, fontFeatureSettings = TABULAR, letterSpacing = (-1).sp),
    display = TextStyle(fontFamily = family, fontSize = 40.sp, lineHeight = 48.sp, fontWeight = FontWeight.Medium, fontFeatureSettings = TABULAR),
    titleLg = TextStyle(fontFamily = family, fontSize = 28.sp, lineHeight = 36.sp, fontWeight = FontWeight.Medium),
    titleMd = TextStyle(fontFamily = family, fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Medium),
    headline = TextStyle(fontFamily = family, fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold),
    bodyLg = TextStyle(fontFamily = family, fontSize = 16.sp, lineHeight = 24.sp),
    body = TextStyle(fontFamily = family, fontSize = 15.sp, lineHeight = 22.sp),
    label = TextStyle(fontFamily = family, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    caption = TextStyle(fontFamily = family, fontSize = 12.sp, lineHeight = 16.sp, fontFeatureSettings = TABULAR),
)

/** Spring-first motion. Reduced motion swaps every spec for a short fade-friendly tween or a snap. */
@Immutable
data class FlowMotion(val reduced: Boolean) {
    fun <T> press(): FiniteAnimationSpec<T> = if (reduced) snap() else spring(dampingRatio = 0.80f, stiffness = 800f)
    fun <T> release(): FiniteAnimationSpec<T> = if (reduced) snap() else spring(dampingRatio = 0.55f, stiffness = 450f)
    fun <T> morph(): FiniteAnimationSpec<T> = if (reduced) tween(150) else spring(dampingRatio = 0.82f, stiffness = 380f)
    fun <T> gentle(): FiniteAnimationSpec<T> = if (reduced) tween(150) else spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = 200f)

    val pressScale get() = if (reduced) 1f else 0.96f
    val pressScaleSmall get() = if (reduced) 1f else 0.92f
}
