package com.velora.core.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

enum class ThemePreference {
    System,
    Light,
    Dark,
    Black,
}

data class UserSettings(
    val theme: ThemePreference = ThemePreference.Dark,
    val dynamicColor: Boolean = false,
)

@Singleton
class UserPreferencesRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    val settings: Flow<UserSettings> = dataStore.data.map { prefs ->
        UserSettings(
            theme = prefs[Keys.THEME]?.let {
                runCatching { ThemePreference.valueOf(it) }.getOrDefault(ThemePreference.Dark)
            } ?: ThemePreference.Dark,
            dynamicColor = prefs[Keys.DYNAMIC_COLOR] ?: false,
        )
    }

    suspend fun setTheme(theme: ThemePreference) {
        dataStore.edit { it[Keys.THEME] = theme.name }
    }

    suspend fun setDynamicColor(enabled: Boolean) {
        dataStore.edit { it[Keys.DYNAMIC_COLOR] = enabled }
    }

    private object Keys {
        val THEME = stringPreferencesKey("theme")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
    }
}
