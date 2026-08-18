'use strict';

const { execFile } = require('child_process');
const config = require('./../config');

let availability = null;

/** Cached check so a missing binary is only probed once per process. */
function isAvailable() {
  if (!config.ytdlpPath) return Promise.resolve(false);
  if (availability) return availability;

  availability = new Promise((resolve) => {
    execFile(config.ytdlpPath, ['--version'], { timeout: 8000 }, (error) => resolve(!error));
  });

  return availability;
}

function run(args, { timeoutMs = 45000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      config.ytdlpPath,
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
