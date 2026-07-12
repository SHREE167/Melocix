package com.velora.core.model

import kotlinx.serialization.Serializable

@Serializable
data class Thumbnail(
    val url: String,
    val width: Int = 0,
    val height: Int = 0,
)

@Serializable
data class ArtistRef(
    val id: String,
    val name: String,
)

@Serializable
data class Song(
    val id: String,
    val title: String,
    val artists: List<ArtistRef> = emptyList(),
    val albumId: String? = null,
    val albumName: String? = null,
    val durationMs: Long = 0L,
    val thumbnails: List<Thumbnail> = emptyList(),
    val explicit: Boolean = false,
) {
    val artistLine: String
        get() = artists.joinToString { it.name }.ifBlank { "Unknown artist" }

    val bestThumbnail: String?
        get() = thumbnails.maxByOrNull { it.width * it.height }?.url
            ?: thumbnails.firstOrNull()?.url
}

@Serializable
data class Album(
    val id: String,
    val title: String,
    val artists: List<ArtistRef> = emptyList(),
    val year: Int? = null,
    val songCount: Int = 0,
    val thumbnails: List<Thumbnail> = emptyList(),
)

@Serializable
data class Artist(
    val id: String,
    val name: String,
    val thumbnails: List<Thumbnail> = emptyList(),
    val subscriberText: String? = null,
)

@Serializable
data class Playlist(
    val id: String,
    val title: String,
    val author: String? = null,
    val songCount: Int = 0,
    val thumbnails: List<Thumbnail> = emptyList(),
    val source: PlaylistSource = PlaylistSource.Remote,
)

@Serializable
enum class PlaylistSource {
    Local,
    Remote,
}

@Serializable
data class HomeShelf(
    val title: String,
    val items: List<HomeItem> = emptyList(),
)

@Serializable
sealed class HomeItem {
    abstract val id: String

    @Serializable
    data class SongItem(val song: Song) : HomeItem() {
        override val id: String get() = song.id
    }

    @Serializable
    data class AlbumItem(val album: Album) : HomeItem() {
        override val id: String get() = album.id
    }

    @Serializable
    data class PlaylistItem(val playlist: Playlist) : HomeItem() {
        override val id: String get() = playlist.id
    }

    @Serializable
    data class ArtistItem(val artist: Artist) : HomeItem() {
        override val id: String get() = artist.id
    }
}

data class PlayerUiState(
    val currentSong: Song? = null,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val queueSize: Int = 0,
)
