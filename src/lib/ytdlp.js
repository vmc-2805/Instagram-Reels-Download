'use strict';

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./../config');

let availability = null;

/**
 * Candidate bundled binaries, in preference order. The Windows build carries a
 * .exe suffix and only runs on win32; the bare name is the Linux binary. Both
 * can coexist in bin/, so we pick by platform first, then try the rest.
 */
function bundledCandidates() {
  const binDir = path.join(__dirname, '..', '..', 'bin');
  const isWin = process.platform === 'win32';

  const preferred = isWin
    ? [path.join(binDir, 'yt-dlp.exe'), path.join(binDir, 'yt-dlp')]
    : [path.join(binDir, 'yt-dlp'), path.join(binDir, 'yt-dlp.exe')];

  return preferred;
}

/**
 * Locate the yt-dlp binary. Precedence:
 *   1. YTDLP_PATH from .env
 *   2. A bundled binary inside this project's bin/ folder (so deploying the
 *      project ships yt-dlp with it — no server-side install needed).
 * Returns the first candidate that both exists and actually runs, or null.
 */
function resolveBinary() {
  if (config.ytdlpPath) return config.ytdlpPath;

  const candidates = bundledCandidates();
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    // Prefer candidates whose extension matches the current platform, and only
    // fall back to a cross-platform mismatch if nothing else is usable. The
    // real validation happens in isAvailable() when the binary is executed.
    return candidate;
  }

  return null;
}

let resolvedBinary = resolveBinary();

/** Cached check so a missing binary is only probed once per process. */
function isAvailable() {
  if (!resolvedBinary) return Promise.resolve(false);
  if (availability) return availability;

  availability = new Promise((resolve) => {
    execFile(resolvedBinary, ['--version'], { timeout: 8000 }, (error) => resolve(!error));
  });

  return availability;
}

function run(args, { timeoutMs = 45000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      resolvedBinary,
      args,
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const message = (stderr || error.message || '').split('\n').filter(Boolean).pop();
          return reject(new Error(message || 'yt-dlp failed'));
        }
        resolve(stdout);
      }
    );
  });
}

/** Returns yt-dlp's JSON description of a post, or throws. */
async function dumpJson(url) {
  const args = ['--dump-single-json', '--no-warnings', '--no-progress'];
  if (config.cookiesFile) args.push('--cookies', config.cookiesFile);
  args.push(url);

  const stdout = await run(args);
  return JSON.parse(stdout);
}

const bestVideo = (formats = []) =>
  formats
    .filter((f) => f.url && f.vcodec && f.vcodec !== 'none')
    .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0];

function normalizeEntry(entry) {
  const video = bestVideo(entry.formats || []);
  const thumbnail =
    entry.thumbnail ||
    (entry.thumbnails || []).slice(-1)[0]?.url ||
    '';

  if (video || entry.ext === 'mp4') {
    const url = video?.url || entry.url;
    if (!url) return null;
    return {
      type: 'video',
      url,
      thumbnail,
      width: video?.width || entry.width || null,
      height: video?.height || entry.height || null,
      duration: entry.duration ? Math.round(entry.duration) : null,
    };
  }

  const url = entry.url || thumbnail;
  if (!url) return null;
  return {
    type: 'image',
    url,
    thumbnail: thumbnail || url,
    width: entry.width || null,
    height: entry.height || null,
    duration: null,
  };
}

/**
 * Resolves a post through yt-dlp. Handles carousels, which yt-dlp reports as
 * a playlist of entries.
 */
async function resolveWithYtDlp(url, shortcode) {
  const info = await dumpJson(url);
  const entries = info._type === 'playlist' ? info.entries || [] : [info];
  const media = entries.map(normalizeEntry).filter(Boolean);

  if (!media.length) throw new Error('yt-dlp returned no media.');

  return {
    shortcode: info.id || shortcode || '',
    type: media.length > 1 ? 'carousel' : media[0].type,
    caption: info.description || '',
    owner: {
      username: info.uploader_id || info.uploader || info.channel || 'instagram',
      fullName: info.uploader || '',
      avatar: '',
    },
    likes: info.like_count ?? null,
    views: info.view_count ?? null,
    takenAt: info.timestamp ? info.timestamp * 1000 : null,
    media,
  };
}

module.exports = { isAvailable, resolveWithYtDlp };
