package app.liftodroid.ui.shell

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Insights
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import app.liftodroid.AppContainer
import app.liftodroid.data.DrainResult
import app.liftodroid.session.WorkoutSessionService
import app.liftodroid.ui.components.FlowButton
import app.liftodroid.ui.dashboard.DashboardScreen
import app.liftodroid.ui.dashboard.DashboardViewModel
import app.liftodroid.ui.insights.HistoryScreen
import app.liftodroid.ui.insights.InsightsViewModel
import app.liftodroid.ui.insights.ProgressScreen
import app.liftodroid.ui.theme.Flow
import app.liftodroid.ui.theme.FlowRadius
import app.liftodroid.ui.theme.FlowSpace
import app.liftodroid.ui.workout.WorkoutScreen
import app.liftodroid.ui.workout.WorkoutViewModel
import kotlinx.coroutines.launch

private enum class Root { Onboarding, Tabs, Workout }

/**
 * Root. A live workout takes the whole screen (no tabs, no island: nothing to mis-tap mid-set).
 * Entering or leaving it is a container morph (scale + fade on spring.morph), not a navigation push.
 */
@Composable
fun AppShell(app: AppContainer) {
    val prefs by app.settings.prefs.collectAsStateWithLifecycle(initialValue = null)
    val active by app.workouts.active.collectAsStateWithLifecycle(initialValue = null)
    val context = LocalContext.current
    val motion = Flow.motion

    LaunchedEffect(prefs?.hasApiKey) {
        if (prefs?.hasApiKey == true) {
            app.workouts.reconcileWithServer()
            app.workouts.requestSync() // a new key un-sticks a queue parked on AuthRequired
        }
    }
    LaunchedEffect(active != null && active?.finishing != true) {
        if (active != null && active?.finishing != true) WorkoutSessionService.start(context)
    }

    val root = when {
        prefs == null -> null
        prefs?.hasApiKey != true -> Root.Onboarding
        active != null && active?.finishing != true -> Root.Workout
        else -> Root.Tabs
    } ?: return

    val sync by app.workouts.syncState.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    if (sync is DrainResult.AuthRequired && root != Root.Onboarding) {
        AlertDialog(
            onDismissRequest = {},
            title = { Text("Reconnect to Liftosaur") },
            text = { Text("Your API key was rejected or Premium has lapsed. Your logged sets are safe on this phone and will sync after you reconnect.") },
            confirmButton = { TextButton({ scope.launch { app.settings.setApiKey(null) } }) { Text("Enter new key") } },
            containerColor = Flow.colors.glassThick, shape = FlowRadius.dialog,
        )
    }

    AnimatedContent(
        root,
        transitionSpec = { (fadeIn(motion.gentle()) + scaleIn(motion.morph(), 0.92f)) togetherWith (fadeOut(motion.gentle()) + scaleOut(motion.morph(), 1.04f)) },
        label = "root",
    ) { r ->
        when (r) {
            Root.Onboarding -> ApiKeyScreen(app)
            Root.Workout -> WorkoutScreen(viewModel { WorkoutViewModel(app) })
            Root.Tabs -> Tabs(app)
        }
    }
}

@Composable
private fun Tabs(app: AppContainer) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val dashboard = viewModel { DashboardViewModel(app) }
    val insights = viewModel { InsightsViewModel(app) }
    val islandSpace = 64.dp + 16.dp + 24.dp // island height + float gap + nav-bar allowance
    // Back from a workout: the server just advanced the program, so Up Next must refetch.
    LaunchedEffect(Unit) { dashboard.refresh() }

    val motion = Flow.motion
    Box(Modifier.fillMaxSize().background(Flow.colors.bgBase)) {
        AnimatedContent(tab, transitionSpec = { fadeIn(motion.gentle()) togetherWith fadeOut(motion.gentle()) }, label = "tab") { t ->
            when (t) {
                0 -> DashboardScreen(dashboard, onStarted = {}, bottomInset = islandSpace)
                1 -> HistoryScreen(insights, islandSpace)
                else -> ProgressScreen(insights, islandSpace)
            }
        }
        FloatingIsland(
            tabs = listOf(
                IslandTab("Up next", Icons.Outlined.PlayCircle, Icons.Rounded.PlayCircle),
                IslandTab("History", Icons.Outlined.History, Icons.Rounded.History),
                IslandTab("Progress", Icons.Outlined.Insights, Icons.Rounded.Insights),
            ),
            selected = tab,
            onSelect = { tab = it },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 12.dp)
                .fillMaxWidth(),
        )
    }
}

/** One-time setup: Liftosaur premium API key. Stored encrypted with a Keystore key. */
@Composable
private fun ApiKeyScreen(app: AppContainer) {
    val c = Flow.colors
    val scope = rememberCoroutineScope()
    var key by rememberSaveable { mutableStateOf("") }
    Column(
        Modifier.fillMaxSize().background(c.bgBase).statusBarsPadding().navigationBarsPadding().padding(FlowSpace.s24),
    ) {
        Spacer(Modifier.height(48.dp))
        Text("LiftoDroid", style = Flow.type.display, color = c.textPrimary)
        Text(
            "Your gym-floor companion for Liftosaur. Programs stay in Liftosaur; this app runs the workout.",
            style = Flow.type.bodyLg, color = c.textSecondary,
        )
        Spacer(Modifier.height(32.dp))
        OutlinedTextField(
            value = key, onValueChange = { key = it.trim() },
            label = { Text("API key (lftsk_…)") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Text("Create one in Liftosaur → Settings → API keys. Requires Premium.", style = Flow.type.caption, color = c.textSecondary, modifier = Modifier.padding(top = 8.dp))
        Spacer(Modifier.weight(1f))
        FlowButton("Connect", { scope.launch { app.settings.setApiKey(key) } }, Modifier.fillMaxWidth(), enabled = key.startsWith("lftsk_"))
    }
}
