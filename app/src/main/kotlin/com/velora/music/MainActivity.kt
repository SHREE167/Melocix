package com.velora.music

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.velora.core.datastore.ThemePreference
import com.velora.core.datastore.UserPreferencesRepository
import com.velora.core.designsystem.theme.VeloraTheme
import com.velora.core.designsystem.theme.VeloraThemeMode
import com.velora.music.ui.shell.VeloraAppShell
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var userPreferences: UserPreferencesRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val settings by userPreferences.settings.collectAsStateWithLifecycle(
                initialValue = com.velora.core.datastore.UserSettings(),
            )
            VeloraTheme(
                themeMode = settings.theme.toThemeMode(),
                dynamicColor = settings.dynamicColor,
            ) {
                VeloraAppShell()
            }
        }
    }
}

private fun ThemePreference.toThemeMode(): VeloraThemeMode = when (this) {
    ThemePreference.System -> VeloraThemeMode.System
    ThemePreference.Light -> VeloraThemeMode.Light
    ThemePreference.Dark -> VeloraThemeMode.Dark
    ThemePreference.Black -> VeloraThemeMode.Black
}
