package com.velora.core.designsystem.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val VeloraDarkColors = darkColorScheme(
    primary = VeloraVioletLight,
    onPrimary = Color.White,
    primaryContainer = VeloraVioletDark,
    onPrimaryContainer = VeloraOnInk,
    secondary = VeloraCyan,
    onSecondary = VeloraInk,
    secondaryContainer = Color(0xFF164E63),
    onSecondaryContainer = VeloraCyan,
    tertiary = VeloraViolet,
    background = VeloraInk,
    onBackground = VeloraOnInk,
    surface = VeloraInkElevated,
    onSurface = VeloraOnInk,
    surfaceVariant = VeloraInkSoft,
    onSurfaceVariant = VeloraOnInkMuted,
    surfaceContainerHighest = VeloraSurfaceBright,
    outline = Color(0xFF3A3A4C),
    error = VeloraError,
    onError = Color.White,
)

private val VeloraLightColors = lightColorScheme(
    primary = VeloraVioletDark,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEDE9FE),
    onPrimaryContainer = VeloraVioletDark,
    secondary = Color(0xFF0891B2),
    onSecondary = Color.White,
    background = VeloraLightBackground,
    onBackground = VeloraLightOn,
    surface = VeloraLightSurface,
    onSurface = VeloraLightOn,
    surfaceVariant = Color(0xFFEEEAF8),
    onSurfaceVariant = VeloraLightOnMuted,
    outline = Color(0xFFC4C0D4),
    error = VeloraError,
    onError = Color.White,
)

enum class VeloraThemeMode {
    System,
    Light,
    Dark,
    Black,
}

@Composable
fun VeloraTheme(
    themeMode: VeloraThemeMode = VeloraThemeMode.Dark,
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val systemDark = isSystemInDarkTheme()
    val darkTheme = when (themeMode) {
        VeloraThemeMode.System -> systemDark
        VeloraThemeMode.Light -> false
        VeloraThemeMode.Dark, VeloraThemeMode.Black -> true
    }

    val context = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        themeMode == VeloraThemeMode.Black -> VeloraDarkColors.copy(
            background = Color.Black,
            surface = Color(0xFF0A0A0A),
            surfaceVariant = Color(0xFF141414),
        )
        darkTheme -> VeloraDarkColors
        else -> VeloraLightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = VeloraTypography,
        content = content,
    )
}
