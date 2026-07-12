package com.velora.music.ui.you

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.velora.core.datastore.ThemePreference
import com.velora.core.datastore.UserPreferencesRepository
import com.velora.core.datastore.UserSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class YouViewModel @Inject constructor(
    private val userPreferences: UserPreferencesRepository,
) : ViewModel() {

    val settings: StateFlow<UserSettings> = userPreferences.settings.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UserSettings(),
    )

    fun setTheme(theme: ThemePreference) {
        viewModelScope.launch { userPreferences.setTheme(theme) }
    }

    fun setDynamicColor(enabled: Boolean) {
        viewModelScope.launch { userPreferences.setDynamicColor(enabled) }
    }
}
