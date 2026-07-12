package com.velora.media.player

import com.velora.core.model.PlayerUiState
import com.velora.core.model.Song
import com.velora.data.youtube.YoutubeRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * App-level playback façade for Phase 0.
 * Phase 1 swaps the body for Media3 ExoPlayer + foreground service.
 */
@Singleton
class PlayerController @Inject constructor(
    private val youtubeRepository: YoutubeRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _state = MutableStateFlow(PlayerUiState())
    val state: StateFlow<PlayerUiState> = _state.asStateFlow()

    private val queue = mutableListOf<Song>()

    fun play(song: Song, asNewQueue: Boolean = true) {
        if (asNewQueue) {
            queue.clear()
            queue.add(song)
        }
        scope.launch {
            val stream = youtubeRepository.getStreamUrl(song.id)
            stream.onSuccess {
                Timber.d("Stream ready for ${song.title}: $it")
                _state.update {
                    it.copy(
                        currentSong = song,
                        isPlaying = true,
                        positionMs = 0L,
                        durationMs = song.durationMs,
                        queueSize = queue.size,
                    )
                }
            }.onError { err ->
                Timber.e(err.cause, "Stream failed: ${err.message}")
                _state.update {
                    it.copy(currentSong = song, isPlaying = false, queueSize = queue.size)
                }
            }
        }
    }

    fun togglePlayPause() {
        _state.update { current ->
            if (current.currentSong == null) current
            else current.copy(isPlaying = !current.isPlaying)
        }
    }

    fun stop() {
        _state.value = PlayerUiState()
        queue.clear()
    }
}
