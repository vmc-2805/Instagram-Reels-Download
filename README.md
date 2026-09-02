# InstaSaver — Instagram downloader

A complete, working Instagram downloader: paste a public post or reel link and
get the original MP4 / JPG back — or, on the audio page, just the sound as an
MP3. Express server, vanilla front end, no build step, minimal npm dependencies
(`express` and `yt-dlp-exec`).

```
npm install
npm start          # http://localhost:3000
```

`ffmpeg` must be installed for the audio page (see Configuration).

## What is included

| Page | Route |
| --- | --- |
| Video downloader (home) | `/` |
| Reels audio → MP3 | `/audio` |
| Photo downloader | `/photo` |
| About / Contact / Privacy / Terms | `/about`, `/contact`, `/privacy`, `/terms` |

`/reels` redirects to `/audio` and `/igtv` to `/`, so older links still resolve.

Plus `robots.txt`, `sitemap.xml`, FAQ schema markup, dark/light theme, a mobile
nav, and a 404 page.

### Features that actually work

- **Single videos, reels, photos and carousels.** Carousel posts are
  unpacked into one download button per slide.
- **Audio extraction.** The `/audio` page returns the reel's sound track as a
  192 kbps MP3 and never offers the video file. Conversion is streamed by
  ffmpeg, so nothing is written to disk. Posts with no video track report
  "That post has no audio track" instead of failing silently.
- **Original quality.** Files come straight from Instagram's CDN — nothing is
  re-encoded.
- **In-browser preview** before you download (video player for clips, image for
  photos).
- **Copy direct link** button next to every file.
- **Paste button**, `?url=` deep links, keyboard-friendly form, toasts.
- **Rate limiting** per IP and a short-lived result cache.

## How the resolver works

`src/lib/instagram.js` tries several strategies in order and returns the first
one that yields media:

1. **`mobile-api`** — `/api/v1/media/{id}/info/`. Richest metadata. Needs a
   session cookie; Instagram redirects anonymous callers to the login page.
2. **`graphql`** — the same GraphQL document the web app posts. **This is the
   one that works anonymously**, but only after the server has picked up guest
   cookies (`csrftoken`, `mid`, `ig_did`) from instagram.com — `ensureGuestSession()`
   in `src/lib/http.js` does that once per process. Without those cookies the
   endpoint answers `403`.
3. **`provider`** — optional third-party resolver API (see below).
4. **`yt-dlp`** — provided by the `yt-dlp-exec` npm package (bundled binary, no
   Python or separate install needed). The most resilient fallback when
   Instagram changes something, and how reels resolve to MP4.
5. **`embed`** — the public embed page.
6. **`open-graph`** — `og:` meta tags. Usually only the preview image, so a
   result from this strategy is returned with a `warning` shown in the UI.

Every response is normalised to the same shape, so the front end does not care
which strategy answered. The strategy name is returned as `data.source`, which
makes debugging a failing link trivial.

### Reality check on Instagram access

As of now, logged-out access is heavily restricted:

- `/api/v1/media/.../info/` → `302` to the login page.
- Post HTML contains **no** video URL at all — only the `og:image` thumbnail.
- GraphQL works anonymously **only** with guest cookies attached (implemented).

So videos resolve out of the box, but if Instagram tightens things further, set
`IG_SESSIONID` — or rely on the bundled `yt-dlp` strategy — both paths are
already wired up.

## Configuration

Copy `.env.example` to `.env`. Everything is optional except the port.

| Variable | Purpose |
| --- | --- |
| `PORT` | Listen port (default `3000`) |
| `SITE_NAME`, `SITE_URL` | Branding, canonical URLs, sitemap |
| `FFMPEG_PATH` | Path to ffmpeg (default `ffmpeg`). **Required by `/audio`** — without it that page returns a 503 explaining what to install |
| `AUDIO_BITRATE` | MP3 bitrate for extracted audio (default `192k`) |
| `IG_SESSIONID`, `IG_CSRFTOKEN` | Session cookies from a throwaway account. Unlocks the mobile-API strategy and makes lookups far more reliable |
| `YTDLP_PATH` | Optional override path to a `yt-dlp` binary. Leave empty — the `yt-dlp-exec` npm package supplies its own bundled yt-dlp (no Python, no separate install needed) |
| `IG_COOKIES_FILE` | Netscape `cookies.txt` for yt-dlp |
| `PROVIDER_URL`, `PROVIDER_KEY`, `PROVIDER_HOST` | Optional third-party resolver. `{url}` in the URL is replaced with the encoded post link; the response is walked for Instagram CDN URLs, so most RapidAPI-style providers work without code changes |
| `RATE_LIMIT_PER_MINUTE` | Per-IP limit on `/api/fetch` (default `20`) |
| `CACHE_TTL_SECONDS` | Result cache lifetime (default `900`) |

### Getting a session cookie

DevTools → Application → Cookies → `instagram.com` → copy `sessionid`. Use a
throwaway account: any automated traffic risks the account being flagged.

## API

```
POST /api/fetch      { "url": "https://www.instagram.com/reel/..." }
GET  /api/download   ?u=<cdn url>&filename=<name>   → attachment stream
GET  /api/audio      ?u=<cdn url>&filename=<name>   → MP3, extracted with ffmpeg
GET  /api/thumb      ?u=<cdn url>                   → preview proxy (range-aware)
GET  /api/health
```

Video items in a `/api/fetch` response also carry an `audioUrl`; image items get
`null`, which is how the audio page knows a post has nothing to extract.
`/api/audio` withholds its response headers until ffmpeg emits its first byte,
so a source with no audio still produces a clean JSON error rather than a
truncated file.

`/api/fetch` response:

```json
{
  "ok": true,
  "data": {
    "shortcode": "DaVpVJpH-d6",
    "type": "video",
    "source": "graphql",
    "caption": "...",
    "owner": { "username": "...", "fullName": "...", "avatar": "..." },
    "media": [
      {
        "type": "video",
        "url": "https://scontent...cdninstagram.com/...mp4",
        "width": 1080, "height": 1920, "duration": 14,
        "downloadUrl": "/api/download?u=...&filename=...",
        "thumbnailUrl": "/api/thumb?u=...",
        "streamUrl": "/api/thumb?u=..."
      }
    ]
  }
}
```

`/api/download` and `/api/thumb` only accept `https` URLs on
`cdninstagram.com`, `fbcdn.net` and `instagram.com` — they are deliberately not
open proxies. The browser cannot save cross-origin CDN files directly, which is
why downloads are routed through the server.

## Tests

```
npm test
```

Fixture tests cover URL parsing (all link shapes), shortcode → media id
conversion, and the carousel / mixed-media normalisers for both the GraphQL and
mobile-API response shapes.

## Project layout

```
server.js                 routes, security headers, sitemap, 404
src/config.js             .env loader + settings
src/lib/http.js           fetch wrapper, guest-cookie bootstrap, headers
src/lib/instagram.js      URL parsing, strategies, normalisers
src/lib/audio.js          ffmpeg MP3 extraction (streamed, nothing on disk)
src/lib/ytdlp.js          yt-dlp via yt-dlp-exec (bundled, no Python/install)
src/lib/provider.js       optional third-party resolver
src/lib/cache.js          TTL cache
src/lib/ratelimit.js      per-IP limiter
src/routes/api.js         /api/fetch, /api/download, /api/thumb, /api/health
src/views/layout.js       shared shell, header, footer
src/views/pages.js        every page's content
public/                   styles.css, app.js, favicon.svg
test/normalize.test.js    fixture tests
```

## Deploying

Any Node host works (Railway, Render, Fly, a VPS behind nginx). Two things to
keep in mind:

- Set `SITE_URL` so canonical tags and the sitemap are correct.
- Datacenter IPs get blocked by Instagram faster than residential ones. If
  lookups start failing in production, add a session cookie (`IG_SESSIONID`) or
  supply `IG_COOKIES_FILE` for yt-dlp.

## Legal

Only public content is resolved; private accounts are not accessible by design. Media is streamed, never stored. This project is not
affiliated with Instagram or Meta. Downloading someone else's work does not give
you any rights to republish it — this applies doubly to extracted audio, which
is usually licensed music owned by an artist or label.
"# Instagram-Reels-Download" 
