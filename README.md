# Melocix

**YouTube Music, refined** — a FOSS music client focused on speed, personalization, and polished playback.

> Not affiliated with Google, YouTube, or YouTube Music.

## Features (web)

- Welcome onboarding + **music languages** (pick 1–5) → personalized Home
- Live YouTube Music search & streaming (local API + yt-dlp)
- Library: likes, history, playlists, offline downloads
- Synced lyrics (LRCLIB)
- 3 player skins (Glass / Neon / Soft)
- Boot + heart animations

## Quick start

```bash
cd web
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| UI | http://localhost:5173 |
| API | http://localhost:8787 |

**Requires [yt-dlp](https://github.com/yt-dlp/yt-dlp) on PATH** for online audio streams.

## Project layout

```
web/          Primary app (Vite + TypeScript + Express API)
app/          Optional Android Compose shell (early scaffold)
```

## Scripts (`web/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite together |
| `npm run build` | Production web build |
| `npm run android:sync` | Capacitor sync (after `npx cap add android`) |

## License

GPL-3.0 — see [LICENSE](LICENSE).
