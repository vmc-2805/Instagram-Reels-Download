'use strict';

const config = require('../config');
const { request } = require('./http');

const isConfigured = () => Boolean(config.providerUrl);

const MEDIA_HOST = /(cdninstagram\.com|fbcdn\.net)/i;

/**
 * Third-party resolver APIs all invent their own response shape, so instead of
 * hard-coding one schema this walks the JSON and collects every Instagram CDN
 * url it finds, tagging each as video or image.
 */
function harvest(node, found = [], depth = 0) {
  if (!node || depth > 8) return found;

  if (typeof node === 'string') {
    if (/^https?:\/\//.test(node) && MEDIA_HOST.test(node)) {
      const isVideo = /\.mp4|video|reels?/i.test(node);
      if (!found.some((item) => item.url === node)) {
        found.push({
          type: isVideo ? 'video' : 'image',
          url: node,
          thumbnail: isVideo ? '' : node,
          width: null,
          height: null,
          duration: null,
        });
      }
    }
    return found;
  }

  if (Array.isArray(node)) {
    for (const child of node) harvest(child, found, depth + 1);
    return found;
  }

  if (typeof node === 'object') {
    for (const value of Object.values(node)) harvest(value, found, depth + 1);
  }

  return found;
}

async function resolveWithProvider(postUrl, shortcode) {
  const endpoint = config.providerUrl.includes('{url}')
    ? config.providerUrl.replace('{url}', encodeURIComponent(postUrl))
    : `${config.providerUrl}${config.providerUrl.includes('?') ? '&' : '?'}url=${encodeURIComponent(postUrl)}`;

  const headers = { Accept: 'application/json' };
  if (config.providerKey) {
    headers['X-RapidAPI-Key'] = config.providerKey;
    headers.Authorization = `Bearer ${config.providerKey}`;
  }
  if (config.providerHost) headers['X-RapidAPI-Host'] = config.providerHost;

  const res = await request(endpoint, { headers, timeoutMs: 25000 });
  if (!res.ok) throw new Error(`Provider responded with ${res.status}`);

  const json = JSON.parse(await res.text());
  const media = harvest(json);
  if (!media.length) throw new Error('Provider response contained no media urls.');

  // If the provider returned both a video and its poster, keep the video and
  // attach the image as the thumbnail rather than listing it separately.
  const videos = media.filter((item) => item.type === 'video');
  const images = media.filter((item) => item.type === 'image');
  const items = videos.length
    ? videos.map((video, index) => ({ ...video, thumbnail: images[index]?.url || images[0]?.url || '' }))
    : images;

  return {
    shortcode: shortcode || '',
    type: items.length > 1 ? 'carousel' : items[0].type,
    caption: typeof json.caption === 'string' ? json.caption : json.title || '',
    owner: {
      username: json.username || json.owner?.username || json.author || 'instagram',
      fullName: json.full_name || '',
      avatar: '',
    },
    likes: json.like_count ?? null,
    views: json.play_count ?? json.view_count ?? null,
    takenAt: null,
    media: items,
  };
}

module.exports = { isConfigured, resolveWithProvider };
