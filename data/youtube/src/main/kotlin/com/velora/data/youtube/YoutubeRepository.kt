package com.velora.data.youtube

import com.velora.core.common.Result
import com.velora.core.model.ArtistRef
import com.velora.core.model.HomeItem
import com.velora.core.model.HomeShelf
import com.velora.core.model.Song
import com.velora.core.model.Thumbnail
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Facade for YouTube Music access.
 * Phase 0/1: demo catalog so UI and player can be built without live InnerTube.
 * Phase 1+: real stream resolution lands behind this same interface.
 */
interface YoutubeRepository {
    suspend fun getHomeShelves(): Result<List<HomeShelf>>
    suspend fun search(query: String): Result<List<Song>>
    suspend fun getStreamUrl(videoId: String): Result<String>
}

@Singleton
class DemoYoutubeRepository @Inject constructor() : YoutubeRepository {

    private val demoSongs = listOf(
        Song(
            id = "demo_1",
            title = "Midnight Drive",
            artists = listOf(ArtistRef("a1", "Nova Lane")),
            albumName = "After Hours",
            durationMs = 214_000,
            thumbnails = listOf(Thumbnail("https://picsum.photos/seed/velora1/400")),
        ),
        Song(
            id = "demo_2",
            title = "Glass Horizon",
            artists = listOf(ArtistRef("a2", "Echo Park")),
            albumName = "Lumina",
            durationMs = 198_000,
            thumbnails = listOf(Thumbnail("https://picsum.photos/seed/velora2/400")),
        ),
        Song(
            id = "demo_3",
            title = "Soft Static",
            artists = listOf(ArtistRef("a3", "Kite")),
            albumName = "Low Power",
            durationMs = 241_000,
            thumbnails = listOf(Thumbnail("https://picsum.photos/seed/velora3/400")),
        ),
        Song(
            id = "demo_4",
            title = "Violet Engine",
            artists = listOf(ArtistRef("a4", "Velora Session")),
            albumName = "Prototype",
            durationMs = 187_000,
            thumbnails = listOf(Thumbnail("https://picsum.photos/seed/velora4/400")),
        ),
        Song(
            id = "demo_5",
            title = "Quiet Frequency",
            artists = listOf(ArtistRef("a5", "Harbor")),
            albumName = "Signal",
            durationMs = 223_000,
            thumbnails = listOf(Thumbnail("https://picsum.photos/seed/velora5/400")),
        ),
    )

    override suspend fun getHomeShelves(): Result<List<HomeShelf>> = Result.Success(
        listOf(
            HomeShelf(
                title = "Quick picks",
                items = demoSongs.take(4).map { HomeItem.SongItem(it) },
            ),
            HomeShelf(
                title = "Because you listened",
                items = demoSongs.reversed().map { HomeItem.SongItem(it) },
            ),
            HomeShelf(
                title = "Fresh energy",
                items = demoSongs.shuffled().map { HomeItem.SongItem(it) },
            ),
        ),
    )

    override suspend fun search(query: String): Result<List<Song>> {
        if (query.isBlank()) return Result.Success(emptyList())
        val q = query.trim().lowercase()
        return Result.Success(
            demoSongs.filter {
                it.title.lowercase().contains(q) ||
                    it.artistLine.lowercase().contains(q) ||
                    (it.albumName?.lowercase()?.contains(q) == true)
            }.ifEmpty { demoSongs },
        )
    }

    override suspend fun getStreamUrl(videoId: String): Result<String> {
        // Demo: silent/short open sample; real YT streams replace this in Phase 1.
        return Result.Success("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3")
    }
}
