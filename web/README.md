# Melocix Web — Phase 2

Browser UI + local API for **YouTube Music search & streaming**, plus a local library.

UI ideas drawn from modern [JS music players](https://freefrontend.com/javascript-music-players/) (glass panels, expanding player, dynamic color, vinyl art).

> Not affiliated with Google or YouTube. Unofficial client for personal/dev use.

## Run (Edge)

```bash
cd web
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Web UI (Vite) | http://localhost:5173 |
| API | http://localhost:8787 |

**Requires [yt-dlp](https://github.com/yt-dlp/yt-dlp) on PATH** for online streams.

### Phase 1

- Live YT Music search / home
- Proxied audio stream
- Queue, next / prev, seek

### Phase 2

- **Liked** songs (localStorage)
- **Play history**
- **Local playlists** (create, add, remove, delete)
- **Offline downloads** (IndexedDB audio blobs via stream proxy)
- Expanding **glass full player** (vinyl spin, palette from cover, shuffle/repeat, up-next queue)
- Like / add-to-playlist / save-offline on every row

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/home` | Home shelves |
| `GET /api/search?q=` | Song search |
| `GET /api/stream/:id` | Proxied audio stream |
| `GET /api/stream-url/:id` | Direct + proxy URLs |

## Android wrapper

```bash
npm run build
npx cap add android   # first time
npm run android:sync
npm run android:open
```

Note: Android package still needs the API reachable (localhost works in emulator with `10.0.2.2`, or host the API). Phase 1 is optimized for Edge debugging first.

## Troubleshooting

- **Home/search fails** — YouTube may rate-limit or change Innertube; restart `npm run dev`.
- **Audio fails** — Some regions/tracks need different formats; try another song.
- **API offline** — Ensure port 8787 is free; run `npm run server` alone to see errors.
