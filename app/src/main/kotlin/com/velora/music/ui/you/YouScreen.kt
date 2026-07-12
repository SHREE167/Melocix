package com.velora.music.ui.you

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.velora.core.datastore.ThemePreference
import com.velora.core.datastore.UserSettings
import com.velora.music.R

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun YouScreen(
    settings: UserSettings,
    onThemeSelected: (ThemePreference) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text(
            text = stringResource(R.string.you_title),
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.you_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(28.dp))

        Text("Appearance", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(12.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            ThemePreference.entries.forEach { theme ->
                FilterChip(
                    selected = settings.theme == theme,
                    onClick = { onThemeSelected(theme) },
                    label = { Text(theme.name) },
                )
            }
        }

        Spacer(Modifier.height(20.dp))
        Column(Modifier.fillMaxWidth()) {
            Text("Dynamic color", style = MaterialTheme.typography.titleMedium)
            Text(
                text = "Use wallpaper colors on Android 12+",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
            Switch(
                checked = settings.dynamicColor,
                onCheckedChange = onDynamicColorChange,
            )
        }

        Spacer(Modifier.height(32.dp))
        Text("About", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Velora 0.1.0-alpha\nYouTube Music client focused on speed and premium UX.\nNot affiliated with Google or YouTube.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
