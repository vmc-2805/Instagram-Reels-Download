'use strict';

const fs = require('fs');
const path = require('path');

// Tiny .env loader so the project stays dependency free apart from express.
function loadEnvFile() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;

  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = {
  port: toInt(process.env.PORT, 3001),
  siteName: process.env.SITE_NAME || 'InstaSaver',
  siteUrl: (process.env.SITE_URL || 'http://localhost:3001').replace(/\/+$/, ''),
  sessionId: process.env.IG_SESSIONID || '',
  csrfToken: process.env.IG_CSRFTOKEN || '',
  rateLimitPerMinute: toInt(process.env.RATE_LIMIT_PER_MINUTE, 20),
  cacheTtlMs: toInt(process.env.CACHE_TTL_SECONDS, 900) * 1000,
  // ffmpeg-static ships a working ffmpeg binary inside node_modules, so audio
  // extraction works without any system install. An explicit FFMPEG_PATH (e.g.
  // a ffmpeg already on PATH or a custom build) always wins.
  ffmpegPath:
    process.env.FFMPEG_PATH ||
    (() => {
      try {
        return require('ffmpeg-static');
      } catch {
        return 'ffmpeg';
      }
    })(),
  audioBitrate: process.env.AUDIO_BITRATE || '192k',
  ytdlpPath: process.env.YTDLP_PATH || '',
  cookiesFile: process.env.IG_COOKIES_FILE || '',
  providerUrl: process.env.PROVIDER_URL || '',
  providerKey: process.env.PROVIDER_KEY || '',
  providerHost: process.env.PROVIDER_HOST || '',
  // Optional path to a Chrome/Chromium/Edge binary used by the instadl strategy.
  instadlBrowser: process.env.INSTADL_BROWSER || '',
  googleAnalytics: process.env.GOOGLE_ANALYTICS_ID || '',
  searchConsole: process.env.GOOGLE_SEARCH_CONSOLE || '',
};
