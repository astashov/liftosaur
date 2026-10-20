package app.liftodroid

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.liftodroid.ui.shell.AppShell
import app.liftodroid.ui.theme.FlowTheme

class MainActivity : ComponentActivity() {
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        // Edge-to-edge so content runs under the floating glass chrome.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        // The rest timer lives in a notification; without this permission it can't be seen from the lock screen.
        if (Build.VERSION.SDK_INT >= 33) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)

        val app = (application as LiftoDroidApp).container
        setContent {
            val prefs by app.settings.prefs.collectAsStateWithLifecycle(initialValue = null)
            FlowTheme(reduceTransparency = prefs?.reduceTransparency == true) {
                AppShell(app)
            }
        }
    }
}
