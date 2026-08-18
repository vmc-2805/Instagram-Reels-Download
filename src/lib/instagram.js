'use strict';

const config = require('../config');
const { TtlCache } = require('./cache');
const { request, getText, getJson, baseHeaders, ensureGuestSession, IG_APP_ID } = require('./http');
const ytdlp = require('./ytdlp');
const provider = require('./provider');

const cache = new TtlCache({ ttlMs: config.cacheTtlMs, maxEntries: 500 });

const SHORTCODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// GraphQL document ids used by instagram.com itself. They rotate every few
// months, so several are tried in order before falling back to scraping.
const DOC_IDS = ['8845758582119845', '10015901848480474', '9510064595728286'];

const LOGIN_REQUIRED_HINT =
  'Instagram would not serve this post to an anonymous request. Set IG_SESSIONID in .env, ' +
  'or install yt-dlp and set YTDLP_PATH, then try again.';

class ResolveError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ *
 * URL parsing
 * ------------------------------------------------------------------ */

/**
 * Accepts anything a user can realistically paste: full links, share links,
 * links with tracking params, or a bare shortcode.
 */
function parseInstagramUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new ResolveError('Paste an Instagram link first.');

  // A bare shortcode, e.g. "CyxA1b2CdEf".
  if (/^[A-Za-z0-9_-]{5,30}$/.test(raw) && !raw.includes('.')) {
    return { kind: 'post', shortcode: raw };
  }

  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    throw new ResolveError('That does not look like a valid link.');
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!/(^|\.)(instagram\.com|instagr\.am|ig\.me)$/.test(host)) {
    throw new ResolveError('Only instagram.com links are supported.');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) throw new ResolveError('That link does not point to a post.');

  const [first, second, third] = segments;

  // Share links (/share/..., /share/reel/...) redirect to the real post URL.
  if (first === 'share') return { kind: 'share', url: url.toString() };

  if (['p', 'reel', 'reels', 'tv'].includes(first)) {
    if (!second) throw new ResolveError('That link is missing a post id.');
    return { kind: 'post', shortcode: second };
  }

  // /stories/<username>/<story_id>
  if (first === 'stories') {
    if (!second) throw new ResolveError('That story link is missing a username.');
    return { kind: 'story', username: second, storyId: third || null };
  }

  // /<username>/p|reel|tv/<shortcode>
  if (second && ['p', 'reel', 'reels', 'tv'].includes(second) && third) {
    return { kind: 'post', shortcode: third };
  }

  throw new ResolveError(
    'Unsupported link. Paste a link to a post, reel or story.'
  );
}

/** Instagram shortcodes are a base64 encoding of the numeric media id. */
function shortcodeToMediaId(shortcode) {
  let id = 0n;
  for (const char of shortcode.split('?')[0]) {
    const index = SHORTCODE_ALPHABET.indexOf(char);
    if (index === -1) throw new ResolveError('That post id contains invalid characters.');
    id = id * 64n + BigInt(index);
  }
  return id.toString();
}

async function resolveShareLink(shareUrl) {
  const res = await request(shareUrl, { headers: baseHeaders(), redirect: 'follow' });
  const finalUrl = res.url || shareUrl;
  if (/\/share\//.test(new URL(finalUrl).pathname)) {
    throw new ResolveError('Could not expand that share link. Open it and copy the post link.');
  }
  return parseInstagramUrl(finalUrl);
}

/* ------------------------------------------------------------------ *
 * Normalisers — every strategy funnels into the same output shape
 * ------------------------------------------------------------------ */

const pickLargest = (candidates = []) =>
  candidates.slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0];

function normalizeApiItem(item) {
  const owner = {
    username: item.user?.username || item.owner?.username || 'instagram',
    fullName: item.user?.full_name || '',
    avatar: item.user?.profile_pic_url || '',
  };

  const flatten = (node) => {
    const image = pickLargest(node.image_versions2?.candidates || []);
    const video = pickLargest(node.video_versions || []);

    if (node.media_type === 2 && video) {
      return {
        type: 'video',
        url: video.url,
        thumbnail: image?.url || '',
        width: video.width || null,
        height: video.height || null,
        duration: node.video_duration ? Math.round(node.video_duration) : null,
      };
    }

    if (!image) return null;
    return {
      type: 'image',
      url: image.url,
      thumbnail: image.url,
      width: image.width || null,
      height: image.height || null,
      duration: null,
    };
  };

  const nodes = item.media_type === 8 ? item.carousel_media || [] : [item];
  const media = nodes.map(flatten).filter(Boolean);

  return {
    shortcode: item.code || '',
    type: item.media_type === 8 ? 'carousel' : item.media_type === 2 ? 'video' : 'image',
    caption: item.caption?.text || '',
    owner,
    likes: item.like_count ?? null,
    views: item.play_count ?? item.view_count ?? null,
    takenAt: item.taken_at ? item.taken_at * 1000 : null,
    media,
  };
}

function normalizeGraphMedia(node) {
  const owner = {
    username: node.owner?.username || 'instagram',
    fullName: node.owner?.full_name || '',
    avatar: node.owner?.profile_pic_url || '',
  };

  const flatten = (n) => {
    if (n.is_video && n.video_url) {
      return {
        type: 'video',
        url: n.video_url,
        thumbnail: n.display_url || '',
        width: n.dimensions?.width || null,
        height: n.dimensions?.height || null,
        duration: n.video_duration ? Math.round(n.video_duration) : null,
      };
    }
    if (!n.display_url) return null;
    return {
      type: 'image',
      url: n.display_url,
      thumbnail: n.display_url,
      width: n.dimensions?.width || null,
      height: n.dimensions?.height || null,
      duration: null,
    };
  };

  const children = node.edge_sidecar_to_children?.edges?.map((e) => e.node);
  const nodes = children && children.length ? children : [node];
  const media = nodes.map(flatten).filter(Boolean);

  return {
    shortcode: node.shortcode || '',
    type: children?.length ? 'carousel' : node.is_video ? 'video' : 'image',
    caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
    owner,
    likes: node.edge_media_preview_like?.count ?? null,
    views: node.video_view_count ?? node.video_play_count ?? null,
    takenAt: node.taken_at_timestamp ? node.taken_at_timestamp * 1000 : null,
    media,
  };
}

/* ------------------------------------------------------------------ *
 * Strategies
 * ------------------------------------------------------------------ */

// 1. Private-ish JSON API used by the web client. Best quality metadata.
async function viaMobileApi(shortcode) {
  const mediaId = shortcodeToMediaId(shortcode);
  const data = await getJson(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
    Referer: `https://www.instagram.com/p/${shortcode}/`,
  });

  const item = data?.items?.[0];
  if (!item) throw new ResolveError('No media in API response.', 502);
  return normalizeApiItem(item);
}

// 2. The GraphQL document the web app itself posts.
async function viaGraphql(shortcode) {
  let lastError;

  for (const docId of DOC_IDS) {
    try {
      const body = new URLSearchParams({
        doc_id: docId,
        server_timestamps: 'true',
        variables: JSON.stringify({
          shortcode,
          fetch_tagged_user_count: null,
          hoisted_comment_id: null,
          hoisted_reply_id: null,
        }),
      });

      const res = await request('https://www.instagram.com/graphql/query', {
        method: 'POST',
        headers: baseHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-IG-App-ID': IG_APP_ID,
          Referer: `https://www.instagram.com/p/${shortcode}/`,
        }),
        body,
      });

      if (!res.ok) throw new Error(`GraphQL responded with ${res.status}`);

      const json = JSON.parse(await res.text());
      const node = json?.data?.xdt_shortcode_media || json?.data?.shortcode_media;
      if (node) return normalizeGraphMedia(node);

      lastError = new Error('GraphQL response contained no media.');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new ResolveError('GraphQL lookup failed.', 502);
}

// 3. The public embed page. Works without cookies for most public posts.
async function viaEmbed(shortcode) {
  const html = await getText(
    `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
    { Referer: 'https://www.instagram.com/' }
  );

  // The embed ships the full media graph inside an escaped JSON string.
  const contextMatch = html.match(/"contextJSON"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (contextMatch) {
    try {
      const decoded = JSON.parse(`"${contextMatch[1]}"`);
      const context = JSON.parse(decoded);
      const node =
        context?.graphql?.shortcode_media ||
        context?.shortcode_media ||
        context?.media;
      if (node) return normalizeGraphMedia(node);
    } catch {
      /* fall through to the regex scrape below */
    }
  }

  // Last resort inside the embed: pull the raw urls out of the markup.
  const videoUrl = html.match(/"video_url"\s*:\s*"([^"]+)"/)?.[1];
  const displayUrl =
    html.match(/"display_url"\s*:\s*"([^"]+)"/)?.[1] ||
    html.match(/class="EmbeddedMediaImage"[^>]+src="([^"]+)"/)?.[1];
  const username = html.match(/"username"\s*:\s*"([^"]+)"/)?.[1] || 'instagram';

  const unescape = (value) =>
    value ? JSON.parse(`"${value.replace(/&amp;/g, '&')}"`) : '';

  if (videoUrl || displayUrl) {
    const thumbnail = unescape(displayUrl);
    return {
      shortcode,
      type: videoUrl ? 'video' : 'image',
      caption: '',
      owner: { username, fullName: '', avatar: '' },
      likes: null,
      views: null,
      takenAt: null,
      media: [
        videoUrl
          ? { type: 'video', url: unescape(videoUrl), thumbnail, width: null, height: null, duration: null }
          : { type: 'image', url: thumbnail, thumbnail, width: null, height: null, duration: null },
      ],
    };
  }

  throw new ResolveError('Embed page contained no media.', 502);
}

// 4. Open Graph tags on the post page. Only single media, but very resilient.
async function viaOpenGraph(shortcode) {
  const html = await getText(`https://www.instagram.com/p/${shortcode}/`, {
    Referer: 'https://www.instagram.com/',
  });

  const meta = (property) =>
    html.match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]+)"`, 'i'))?.[1];

  const decode = (value) =>
    (value || '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  const video = decode(meta('og:video') || meta('og:video:secure_url'));
  const image = decode(meta('og:image'));
  if (!video && !image) throw new ResolveError('Post page contained no media.', 502);

  return {
    shortcode,
    type: video ? 'video' : 'image',
    caption: decode(meta('og:title') || ''),
    owner: { username: 'instagram', fullName: '', avatar: '' },
    likes: null,
    views: null,
    takenAt: null,
    // Logged-out post pages usually expose only the preview image. Say so
    // rather than pretending a video post is a photo post.
    warning: video
      ? null
      : 'Only the preview image was available without a signed-in session. If this post is a video, configure IG_SESSIONID or the yt-dlp fallback to get the MP4.',
    media: [
      video
        ? { type: 'video', url: video, thumbnail: image, width: null, height: null, duration: null }
        : { type: 'image', url: image, thumbnail: image, width: null, height: null, duration: null },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

async function resolvePost(shortcode) {
  const cacheKey = `post:${shortcode}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  await ensureGuestSession();

  const postUrl = `https://www.instagram.com/p/${shortcode}/`;

  // Ordered cheapest/most accurate first. The optional strategies are skipped
  // entirely unless they are configured.
  const strategies = [
    ['mobile-api', () => viaMobileApi(shortcode)],
    ['graphql', () => viaGraphql(shortcode)],
  ];

  if (provider.isConfigured()) {
    strategies.push(['provider', () => provider.resolveWithProvider(postUrl, shortcode)]);
  }

  if (await ytdlp.isAvailable()) {
    strategies.push(['yt-dlp', () => ytdlp.resolveWithYtDlp(postUrl, shortcode)]);
  }

  strategies.push(['embed', () => viaEmbed(shortcode)], ['open-graph', () => viaOpenGraph(shortcode)]);

  const failures = [];

  for (const [name, strategy] of strategies) {
    try {
      const result = await strategy();
      if (result?.media?.length) {
        result.source = name;
        result.postUrl = postUrl;
        return cache.set(cacheKey, result);
      }
      failures.push(`${name}: empty result`);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  }

  console.warn(`[resolve] ${shortcode} failed ->`, failures.join(' | '));

  // If any strategy got a clean answer that simply held no media, the post is
  // gone or private — that is a 404, not a block, and the message must differ.
  const answeredEmpty = failures.some((f) => /contained no media|empty result/i.test(f));
  const blocked = !answeredEmpty && failures.some((f) => /401|403|429|login|non-JSON/i.test(f));
  throw new ResolveError(
    blocked
      ? LOGIN_REQUIRED_HINT
      : 'Could not read that post. It may be private, deleted, or age restricted.',
    blocked ? 429 : 404
  );
}

async function resolveStory({ username, storyId }) {
  if (!config.sessionId) {
    throw new ResolveError(
      'Stories require a logged-in session. Add IG_SESSIONID to your .env file to enable story downloads.',
      501
    );
  }

  const cacheKey = `story:${username}:${storyId || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const profile = await getJson(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    { Referer: `https://www.instagram.com/${username}/` }
  );

  const userId = profile?.data?.user?.id;
  if (!userId) throw new ResolveError(`No Instagram account found for @${username}.`, 404);

  const reels = await getJson(
    `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`,
    { Referer: `https://www.instagram.com/stories/${username}/` }
  );

  const reel = reels?.reels?.[userId] || reels?.reels_media?.[0];
  let items = reel?.items || [];
  if (storyId) items = items.filter((item) => String(item.pk) === String(storyId));

  if (!items.length) {
    throw new ResolveError(`@${username} has no active stories right now.`, 404);
  }

  const media = items
    .map((item) => {
      const image = pickLargest(item.image_versions2?.candidates || []);
      const video = pickLargest(item.video_versions || []);
      if (item.media_type === 2 && video) {
        return {
          type: 'video',
          url: video.url,
          thumbnail: image?.url || '',
          width: video.width || null,
          height: video.height || null,
          duration: item.video_duration ? Math.round(item.video_duration) : null,
        };
      }
      if (!image) return null;
      return {
        type: 'image',
        url: image.url,
        thumbnail: image.url,
        width: image.width || null,
        height: image.height || null,
        duration: null,
      };
    })
    .filter(Boolean);

  const result = {
    shortcode: storyId || username,
    type: 'story',
    caption: '',
    owner: {
      username: reel?.user?.username || username,
      fullName: reel?.user?.full_name || '',
      avatar: reel?.user?.profile_pic_url || '',
    },
    likes: null,
    views: null,
    takenAt: items[0]?.taken_at ? items[0].taken_at * 1000 : null,
    media,
    source: 'story-api',
    postUrl: `https://www.instagram.com/stories/${username}/`,
  };

  return cache.set(cacheKey, result);
}

/** Entry point used by the API route. */
async function resolve(input) {
  let parsed = parseInstagramUrl(input);
  if (parsed.kind === 'share') parsed = await resolveShareLink(parsed.url);

  if (parsed.kind === 'story') return resolveStory(parsed);
  return resolvePost(parsed.shortcode);
}

module.exports = {
  resolve,
  resolvePost,
  resolveStory,
  parseInstagramUrl,
  shortcodeToMediaId,
  // exported for tests
  normalizeGraphMedia,
  normalizeApiItem,
  ResolveError,
  cache,
};
