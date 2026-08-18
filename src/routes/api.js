'use strict';

const express = require('express');
const config = require('../config');
const { request, baseHeaders } = require('../lib/http');
const { createRateLimiter } = require('../lib/ratelimit');
const { resolve, ResolveError } = require('../lib/instagram');
const audio = require('../lib/audio');

const router = express.Router();

const limiter = createRateLimiter({
  limit: config.rateLimitPerMinute,
  windowMs: 60000,
});

// Only Instagram's own CDNs may be proxied — this endpoint must never become
// an open relay for arbitrary URLs.
const ALLOWED_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net|instagram\.com)$/i;

function safeMediaUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ResolveError('Invalid media url.');
  }
  if (url.protocol !== 'https:') throw new ResolveError('Only https media urls are allowed.');
  if (!ALLOWED_HOSTS.test(url.hostname)) throw new ResolveError('That host is not allowed.');
  return url;
}

function sanitizeFilename(name, fallback) {
  const cleaned = String(name || '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

/* POST /api/fetch — resolve an Instagram link into downloadable media. */
router.post('/fetch', limiter, express.json({ limit: '8kb' }), async (req, res) => {
  const input = req.body?.url;

  try {
    const result = await resolve(input);

    res.json({
      ok: true,
      data: {
        ...result,
        media: result.media.map((item, index) => ({
          ...item,
          // The browser cannot save cross-origin CDN files directly, so every
          // asset is handed back as a same-origin download link.
          downloadUrl:
            `/api/download?u=${encodeURIComponent(item.url)}` +
            `&filename=${encodeURIComponent(
              `${result.owner?.username || 'instagram'}_${result.shortcode || 'media'}` +
                `${result.media.length > 1 ? `_${index + 1}` : ''}` +
                `.${item.type === 'video' ? 'mp4' : 'jpg'}`
            )}`,
          thumbnailUrl: item.thumbnail
            ? `/api/thumb?u=${encodeURIComponent(item.thumbnail)}`
            : null,
          streamUrl: `/api/thumb?u=${encodeURIComponent(item.url)}`,
          // Only videos carry an audio track worth extracting.
          audioUrl:
            item.type === 'video'
              ? `/api/audio?u=${encodeURIComponent(item.url)}` +
                `&filename=${encodeURIComponent(
                  `${result.owner?.username || 'instagram'}_${result.shortcode || 'audio'}` +
                    `${result.media.length > 1 ? `_${index + 1}` : ''}.mp3`
                )}`
              : null,
        })),
      },
    });
  } catch (error) {
    const status = error instanceof ResolveError ? error.status : 500;
    if (status >= 500) console.error('[api/fetch]', error);
    res.status(status).json({
      ok: false,
      error: error instanceof ResolveError ? error.message : 'Something went wrong. Try again.',
    });
  }
});

/* GET /api/download — stream a CDN file back as an attachment. */
router.get('/download', async (req, res) => {
  try {
    const url = safeMediaUrl(req.query.u);
    const isVideo = /\.mp4|video/i.test(url.pathname) || req.query.type === 'video';
    const filename = sanitizeFilename(
      req.query.filename,
      `instagram-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`
    );

    const upstream = await request(url.toString(), {
      headers: baseHeaders({ Referer: 'https://www.instagram.com/' }),
      timeoutMs: 60000,
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ ok: false, error: 'The media link expired. Fetch the post again.' });
    }

    res.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    const length = upstream.headers.get('content-length');
    if (length) res.set('Content-Length', length);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Cache-Control', 'no-store');

    const { Readable } = require('stream');
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    const status = error instanceof ResolveError ? error.status : 500;
    if (status >= 500) console.error('[api/download]', error);
    res.status(status).json({
      ok: false,
      error: error instanceof ResolveError ? error.message : 'Download failed.',
    });
  }
});

/* GET /api/audio — extract the audio track and stream it back as MP3. */
router.get('/audio', async (req, res) => {
  try {
    const url = safeMediaUrl(req.query.u);

    if (!(await audio.isAvailable())) {
      return res.status(503).json({
        ok: false,
        error: 'Audio extraction needs ffmpeg on the server. Install it, or set FFMPEG_PATH in .env.',
      });
    }

    const filename = sanitizeFilename(req.query.filename, `instagram-audio-${Date.now()}.mp3`);
    const withExtension = filename.toLowerCase().endsWith('.mp3') ? filename : `${filename}.mp3`;

    audio.streamAudio({
      url: url.toString(),
      filename: withExtension,
      res,
      onError: (message) => {
        if (res.headersSent) return res.end();
        res.status(502).json({ ok: false, error: message });
      },
    });
  } catch (error) {
    const status = error instanceof ResolveError ? error.status : 500;
    if (status >= 500) console.error('[api/audio]', error);
    res.status(status).json({
      ok: false,
      error: error instanceof ResolveError ? error.message : 'Audio extraction failed.',
    });
  }
});

/* GET /api/thumb — same-origin proxy for previews (the CDN blocks hotlinking). */
router.get('/thumb', async (req, res) => {
  try {
    const url = safeMediaUrl(req.query.u);
    const upstream = await request(url.toString(), {
      headers: baseHeaders({
        Referer: 'https://www.instagram.com/',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      }),
      timeoutMs: 60000,
    });

    if (!upstream.ok || !upstream.body) return res.status(502).end();

    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    for (const header of ['content-length', 'content-range', 'accept-ranges']) {
      const value = upstream.headers.get(header);
      if (value) res.set(header, value);
    }
    res.set('Cache-Control', 'public, max-age=3600');

    const { Readable } = require('stream');
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    const status = error instanceof ResolveError ? error.status : 500;
    res.status(status).end();
  }
});

/* GET /api/health — liveness probe. */
router.get('/health', (req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), session: Boolean(config.sessionId) });
});

module.exports = router;
