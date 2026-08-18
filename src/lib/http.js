'use strict';

const config = require('../config');

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/126.0.0.0 Safari/537.36';

// Instagram's public web app id. Required by the /api/v1/* JSON endpoints.
const IG_APP_ID = '936619743392459';

// Cookies picked up from Instagram itself (csrftoken, mid, ig_did). Anonymous
// requests look far less like a bot once these are present.
const guestCookies = new Map();
let guestBootstrap = null;

function cookieHeader() {
  const jar = new Map(guestCookies);
  if (config.sessionId) jar.set('sessionid', config.sessionId);
  if (config.csrfToken) jar.set('csrftoken', config.csrfToken);
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

function currentCsrfToken() {
  return config.csrfToken || guestCookies.get('csrftoken') || 'missing';
}

function baseHeaders(extra = {}) {
  const headers = {
    'User-Agent': DESKTOP_UA,
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Site': 'same-origin',
    'X-ASBD-ID': '129477',
    'X-IG-WWW-Claim': '0',
    'X-CSRFToken': currentCsrfToken(),
    ...extra,
  };

  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;
  return headers;
}

/**
 * Hits instagram.com once per process to collect guest cookies. Cached, and
 * failures are non-fatal — the strategies simply run without them.
 */
function ensureGuestSession() {
  if (guestBootstrap) return guestBootstrap;

  guestBootstrap = (async () => {
    try {
      const res = await fetch('https://www.instagram.com/', {
        headers: { 'User-Agent': DESKTOP_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      });

      for (const raw of res.headers.getSetCookie?.() || []) {
        const [pair] = raw.split(';');
        const index = pair.indexOf('=');
        if (index === -1) continue;
        const name = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (['csrftoken', 'mid', 'ig_did', 'datr'].includes(name)) guestCookies.set(name, value);
      }
    } catch {
      /* offline or blocked — carry on without guest cookies */
    }
  })();

  return guestBootstrap;
}

/**
 * fetch() with a hard timeout so a hanging upstream never pins a request open.
 */
async function request(url, options = {}) {
  const { timeoutMs = 15000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url, headers = {}) {
  const res = await request(url, { headers: baseHeaders(headers) });
  if (!res.ok) {
    const err = new Error(`Upstream responded with ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

async function getJson(url, headers = {}) {
  const res = await request(url, {
    headers: baseHeaders({ 'X-IG-App-ID': IG_APP_ID, Accept: '*/*', ...headers }),
  });

  if (!res.ok) {
    const err = new Error(`Upstream responded with ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const body = await res.text();
  try {
    return JSON.parse(body);
  } catch {
    // Instagram serves an HTML login wall instead of JSON when it blocks us.
    const err = new Error('Instagram returned a non-JSON response (login wall or block).');
    err.status = 403;
    throw err;
  }
}

module.exports = {
  request,
  getText,
  getJson,
  baseHeaders,
  ensureGuestSession,
  DESKTOP_UA,
  IG_APP_ID,
};
