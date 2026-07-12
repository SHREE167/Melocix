package com.velora.music.ui.shell

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.velora.music.ui.home.HomeScreen
import com.velora.music.ui.home.HomeViewModel
import com.velora.music.ui.library.LibraryScreen
import com.velora.music.ui.navigation.TopLevelDestination
import com.velora.music.ui.search.SearchScreen
import com.velora.music.ui.search.SearchViewModel
import com.velora.music.ui.you.YouScreen
import com.velora.music.ui.you.YouViewModel

@Composable
fun VeloraAppShell(
    playerViewModel: PlayerViewModel = hiltViewModel(),
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val playerState by playerViewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            Column {
                MiniPlayerBar(
                    state = playerState,
                    onTogglePlayPause = playerViewModel::togglePlayPause,
                )
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ) {
                    TopLevelDestination.entries.forEach { dest ->
                        val selected = currentRoute == dest.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(dest.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) dest.selectedIcon else dest.unselectedIcon,
                                    contentDescription = stringResource(dest.labelRes),
                                )
                            },
                            label = { Text(stringResource(dest.labelRes)) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = TopLevelDestination.Home.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            composable(TopLevelDestination.Home.route) {
                val vm: HomeViewModel = hiltViewModel()
                val ui by vm.uiState.collectAsStateWithLifecycle()
                HomeScreen(
                    state = ui,
                    onSongClick = playerViewModel::play,
                    onRetry = vm::refresh,
                )
            }
            composable(TopLevelDestination.Search.route) {
                val vm: SearchViewModel = hiltViewModel()
                val ui by vm.uiState.collectAsStateWithLifecycle()
                SearchScreen(
                    state = ui,
                    onQueryChange = vm::onQueryChange,
                    onSongClick = playerViewModel::play,
                )
            }
            composable(TopLevelDestination.Library.route) {
                LibraryScreen()
            }
            composable(TopLevelDestination.You.route) {
                val vm: YouViewModel = hiltViewModel()
                val settings by vm.settings.collectAsStateWithLifecycle()
                YouScreen(
                    settings = settings,
                    onThemeSelected = vm::setTheme,
                    onDynamicColorChange = vm::setDynamicColor,
                )
            }
        }
    }
}
