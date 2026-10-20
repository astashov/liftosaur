package app.liftodroid.ui.theme

import android.provider.Settings
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import dev.chrisbanes.haze.HazeState

val LocalFlowColors = staticCompositionLocalOf { DarkFlowColors }
val LocalFlowType = staticCompositionLocalOf { flowType() }
val LocalFlowMotion = staticCompositionLocalOf { FlowMotion(reduced = false) }
/** Glass is enabled only when the OS can blur (API 31+) and the user hasn't asked for opacity. */
val LocalGlassEnabled = staticCompositionLocalOf { true }
/** Backdrop source for floating chrome. Content opts in with Modifier.haze(state). */
val LocalHazeState = staticCompositionLocalOf { HazeState() }

object Flow {
    val colors: FlowColors @Composable get() = LocalFlowColors.current
    val type: FlowType @Composable get() = LocalFlowType.current
    val motion: FlowMotion @Composable get() = LocalFlowMotion.current
}

@Composable
fun FlowTheme(
    dark: Boolean = isSystemInDarkTheme(),
    reduceTransparency: Boolean = false,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    // ANIMATOR_DURATION_SCALE = 0 is Android's "Remove animations": swap springs for fades.
    val reducedMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    val glass = !reduceTransparency && android.os.Build.VERSION.SDK_INT >= 31
    val base = if (dark) DarkFlowColors else LightFlowColors
    val colors = if (glass) base else base.opaque()

    val material = if (dark) {
        darkColorScheme(primary = colors.accent, onPrimary = colors.onAccent, background = colors.bgBase, surface = colors.surfaceSolid, onSurface = colors.textPrimary, error = colors.danger)
    } else {
        lightColorScheme(primary = colors.accent, onPrimary = colors.onAccent, background = colors.bgBase, surface = colors.surfaceSolid, onSurface = colors.textPrimary, error = colors.danger)
    }

    CompositionLocalProvider(
        LocalFlowColors provides colors,
        LocalFlowMotion provides FlowMotion(reducedMotion),
        LocalGlassEnabled provides glass,
        LocalHazeState provides remember { HazeState() },
    ) {
        MaterialTheme(colorScheme = material, content = content)
    }
}
