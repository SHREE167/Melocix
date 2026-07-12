package com.velora.music.ui.library

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.velora.core.designsystem.component.VeloraEmptyState
import com.velora.music.R

@Composable
fun LibraryScreen(
    modifier: Modifier = Modifier,
) {
    VeloraEmptyState(
        title = stringResource(R.string.library_empty_title),
        message = stringResource(R.string.library_empty_message),
        modifier = modifier,
    )
}
