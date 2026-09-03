'use strict';

/*
 * Optional strategy backed by the @kartikk-k/instadl package.
 *
 * instadl drives a real downloader site in a headless (Chromium) browser and
 * intercepts the direct CDN url from its own API response. This is the most
 * reliable way to get the actual MP4 for reels — the other strategies can fall
 * back to a preview *image* when Instagram only serves the poster to anonymous
 * requests.
 *
 * It is ESM-only, so we load it with a dynamic import() from CommonJS. It needs
 * a browser binary on the machine (Chrome/Chromium/Edge). If none is present it
 * is skipped, just like the other optional strategies.
 */

const config = require('../config');
const fs = require('fs');
const os = require('os');
const path = require('path');

// The ESM module is imported lazily so a missing/optional browser never breaks
// the rest of the app.
let modulePromise = null;
let availability = null;

function loadModule() {
  if (!modulePromise) {
    modulePromise = import('@kartikk-k/instadl').catch((error) => {
      if (error.code === 'MODULE_NOT_FOUND' || /Cannot find package/.test(error.message)) {
        modulePromise = null;
        return null;
      }
      throw error;
    });
  }
  return modulePromise;
}

/**
 * Lightweight probe for a Chromium-based browser, mirroring the well-known
 * install locations instadl itself checks. Explicit INSTADL_BROWSER always wins.
 */
function findBrowserPath() {
  if (config.instadlBrowser) return config.instadlBrowser;

  const candidates = [];
  if (os.platform() === 'win32') {
    const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
    const pfx86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    candidates.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pfx86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pfx86, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    );
  } else if (os.platform() === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/microsoft-edge'
    );
  }

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Cached availability check. The package is only usable when the module loads
 * and a Chromium-based browser can be found.
 */
async function isAvailable() {
  if (availability !== null) return availability;

  const mod = await loadModule();
  if (!mod) {
    availability = false;
    return false;
  }

  const browserPath = findBrowserPath();

  // Point the package at the browser so instadl's own discovery never has to
  // guess differently than we do.
  if (browserPath) process.env.INSTADL_BROWSER = browserPath;

  availability = Boolean(browserPath);
  return availability;
}

/**
 * Normalise an instadl Media object ({url,type,ext,...}) into the project's
 * media shape ({type,url,thumbnail,width,height,duration}).
 */
function toMediaItem(item) {
  const isVideo = item.type === 'mp4' || item.ext === 'mp4' || /\.mp4|video/i.test(item.url || '');
  return {
    type: isVideo ? 'video' : 'image',
    url: item.url,
    thumbnail: item.thumb || '',
    width: null,
    height: null,
    duration: null,
  };
}

/**
 * Resolve an Instagram post/reel through @kartikk-k/instadl.
 * Returns the same merged shape as the other strategies, or throws.
 */
async function resolveWithInstadl(url, shortcode) {
  const mod = await loadModule();
  if (!mod || !mod.resolve) throw new Error('instadl module not available.');

  const data = await mod.resolve(url);
  if (!data?.medias?.length) throw new Error('instadl returned no media.');

  const media = data.medias.map(toMediaItem).filter((m) => m.url);

  return {
    shortcode: data.shortcode || shortcode || '',
    type: media.length > 1 ? 'carousel' : media[0].type,
    caption: data.title || '',
    owner: {
      username: data.username || 'instagram',
      fullName: '',
      avatar: '',
    },
    likes: data.like_count ?? null,
    views: null,
    takenAt: data.taken_at ? data.taken_at * 1000 : null,
    media,
  };
}

module.exports = { isAvailable, resolveWithInstadl };
