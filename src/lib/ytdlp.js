'use strict';

const config = require('./../config');

/**
 * yt-dlp is provided by the `yt-dlp-exec` npm package, which bundles its own
 * yt-dlp binary inside node_modules — no separate install, no YTDLP_PATH
 * needed, and it works the same on Windows and Linux (important for the
 * Vercel/serverless deployment).
 */
const ytDlpExecDefault = require('yt-dlp-exec');

// YTDLP_PATH (documented in .env.example) overrides the bundled binary. On a
// Linux host without python3 the bundled `yt-dlp` zipapp cannot run, so point
// this at a standalone `yt-dlp_linux` build instead.
const ytDlpExec = config.ytdlpPath ? ytDlpExecDefault.create(config.ytdlpPath) : ytDlpExecDefault;

let availability = null;

/** Cached check — yt-dlp-exec is always available once installed. */
function isAvailable() {
  if (availability) return availability;
  availability = Promise.resolve(true);
  return availability;
}

/** Returns yt-dlp's JSON description of a post, or throws. */
async function dumpJson(url) {
  const options = {
    dumpSingleJson: true,
    noWarnings: true,
    noProgress: true,
  };
  if (config.cookiesFile) options.cookies = config.cookiesFile;

  const info = await ytDlpExec(url, options);
  return info;
}

const bestVideo = (formats = []) =>
  formats
    .filter((f) => f.url && f.vcodec && f.vcodec !== 'none')
    .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0))[0];

// Instagram serves reels as separate DASH streams: the video-only MP4 has no
// audio track, and the soundtrack lives in its own audio-only M4A stream. Picking
// that stream up front is what lets the /audio route transcode to MP3 instead of
// failing with "no audio track".
const bestAudio = (formats = []) =>
  formats
    .filter(
      (f) =>
        f.url &&
        f.acodec &&
        f.acodec !== 'none' &&
        (!f.vcodec || f.vcodec === 'none')
    )
    .sort((a, b) => (b.asr || b.tbr || 0) - (a.asr || a.tbr || 0))[0];

function normalizeEntry(entry) {
  const video = bestVideo(entry.formats || []);
  const audio = bestAudio(entry.formats || []);
  const thumbnail =
    entry.thumbnail ||
    (entry.thumbnails || []).slice(-1)[0]?.url ||
    '';

  if (video || entry.ext === 'mp4' || entry.ext === 'm4a') {
    const url = video?.url || entry.url;
    if (!url) return null;
    return {
      type: 'video',
      url,
      // The dedicated audio-only stream, so /audio can extract MP3 reliably.
      audioUrl: audio?.url || null,
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
