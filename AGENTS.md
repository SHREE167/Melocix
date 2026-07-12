# Working on Melocix as an AI agent

Melocix is a third-party YouTube Music client for Android (Kotlin, Jetpack Compose, Material 3).

## Rules

1. Prefer speed and UX polish over new feature sprawl.
2. Keep YouTube/extractor code inside `data/youtube` only.
3. English strings: edit `app/src/main/res/values/strings.xml` only.
4. Do not bump `versionCode` / `versionName` unless a human asks.
5. Do not invent Room schema changes without an explicit migration plan.
6. Commit style: `type(scope): short description` (e.g. `feat(player): add media session`).
7. Build check: `./gradlew :app:assembleDebug`

## Architecture

- `app` â€” Compose UI, ViewModels, navigation
- `core/*` â€” shared utilities, models, design system, prefs
- `data/youtube` â€” repository faÃ§ade for YT Music
- `media/player` â€” playback controller / future Media3 service

## Product focus

Outshine Metrolist on **premium UX and perceived speed**, not feature count.
