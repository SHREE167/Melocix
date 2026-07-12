package com.velora.music.ui.shell

import androidx.lifecycle.ViewModel
import com.velora.core.model.Song
import com.velora.media.player.PlayerController
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val playerController: PlayerController,
) : ViewModel() {
    val state = playerController.state

    fun play(song: Song) = playerController.play(song)

    fun togglePlayPause() = playerController.togglePlayPause()
}
