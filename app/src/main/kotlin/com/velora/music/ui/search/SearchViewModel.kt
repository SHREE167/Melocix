package com.velora.music.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.velora.core.common.Result
import com.velora.core.model.Song
import com.velora.data.youtube.YoutubeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val isSearching: Boolean = false,
    val results: List<Song> = emptyList(),
    val error: String? = null,
)

@OptIn(FlowPreview::class)
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val youtubeRepository: YoutubeRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private val queryFlow = MutableStateFlow("")

    init {
        viewModelScope.launch {
            queryFlow
                .debounce(250)
                .distinctUntilChanged()
                .collect { q ->
                    if (q.isBlank()) {
                        _uiState.update {
                            it.copy(isSearching = false, results = emptyList(), error = null)
                        }
                        return@collect
                    }
                    _uiState.update { it.copy(isSearching = true, error = null) }
                    when (val result = youtubeRepository.search(q)) {
                        is Result.Success -> _uiState.update {
                            it.copy(isSearching = false, results = result.data)
                        }
                        is Result.Error -> _uiState.update {
                            it.copy(isSearching = false, error = result.message)
                        }
                    }
                }
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
        queryFlow.value = query
    }
}
