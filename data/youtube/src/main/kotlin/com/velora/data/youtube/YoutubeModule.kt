package com.velora.data.youtube

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class YoutubeModule {
    @Binds
    @Singleton
    abstract fun bindYoutubeRepository(impl: DemoYoutubeRepository): YoutubeRepository
}
