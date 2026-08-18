'use strict';

/**
 * Fixture tests for the parts that cannot be exercised against live Instagram
 * on demand (carousels, mixed posts, url parsing edge cases).
 * Run with: npm test
 */

const assert = require('assert');
const {
  normalizeGraphMedia,
  normalizeApiItem,
  parseInstagramUrl,
  shortcodeToMediaId,
} = require('../src/lib/instagram');

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
};

/* ------------------------------ url parsing ----------------------------- */

test('parses a /p/ link', () => {
  assert.deepStrictEqual(parseInstagramUrl('https://www.instagram.com/p/AbCdEfGhIjK/'), {
    kind: 'post',
    shortcode: 'AbCdEfGhIjK',
  });
});

test('parses a reel link with query params', () => {
  const parsed = parseInstagramUrl('https://instagram.com/reel/AbCdEfGhIjK/?igsh=1234');
  assert.strictEqual(parsed.shortcode, 'AbCdEfGhIjK');
});

test('parses a username-prefixed link', () => {
  const parsed = parseInstagramUrl('https://www.instagram.com/nasa/reel/AbCdEfGhIjK/');
  assert.strictEqual(parsed.shortcode, 'AbCdEfGhIjK');
});

test('parses a story link', () => {
  assert.deepStrictEqual(parseInstagramUrl('https://www.instagram.com/stories/nasa/123456/'), {
    kind: 'story',
    username: 'nasa',
    storyId: '123456',
  });
});

test('flags share links for redirect resolution', () => {
  assert.strictEqual(parseInstagramUrl('https://www.instagram.com/share/abc123').kind, 'share');
});

test('rejects non-instagram hosts', () => {
  assert.throws(() => parseInstagramUrl('https://youtube.com/watch?v=abc'), /instagram/i);
});

test('converts a shortcode to a media id', () => {
  // B is index 1 -> 1 * 64^0
  assert.strictEqual(shortcodeToMediaId('B'), '1');
  assert.strictEqual(shortcodeToMediaId('BA'), '64');
});

/* --------------------------- graphql carousel --------------------------- */

const sidecar = {
  shortcode: 'AbCdEfGhIjK',
  __typename: 'XDTGraphSidecar',
  owner: { username: 'nasa', full_name: 'NASA', profile_pic_url: 'https://cdn/avatar.jpg' },
  edge_media_to_caption: { edges: [{ node: { text: 'Three views of the same launch' } }] },
  edge_media_preview_like: { count: 4200 },
  taken_at_timestamp: 1750000000,
  edge_sidecar_to_children: {
    edges: [
      {
        node: {
          is_video: false,
          display_url: 'https://cdn/slide1.jpg',
          dimensions: { width: 1080, height: 1350 },
        },
      },
      {
        node: {
          is_video: true,
          video_url: 'https://cdn/slide2.mp4',
          display_url: 'https://cdn/slide2.jpg',
          video_duration: 12.4,
          dimensions: { width: 1080, height: 1920 },
        },
      },
    ],
  },
};

test('carousel: unpacks every slide', () => {
  const result = normalizeGraphMedia(sidecar);
  assert.strictEqual(result.type, 'carousel');
  assert.strictEqual(result.media.length, 2);
});

test('carousel: keeps slide types and urls', () => {
  const [first, second] = normalizeGraphMedia(sidecar).media;
  assert.strictEqual(first.type, 'image');
  assert.strictEqual(first.url, 'https://cdn/slide1.jpg');
  assert.strictEqual(second.type, 'video');
  assert.strictEqual(second.url, 'https://cdn/slide2.mp4');
  assert.strictEqual(second.thumbnail, 'https://cdn/slide2.jpg');
  assert.strictEqual(second.duration, 12);
});

test('carousel: carries owner and caption', () => {
  const result = normalizeGraphMedia(sidecar);
  assert.strictEqual(result.owner.username, 'nasa');
  assert.strictEqual(result.caption, 'Three views of the same launch');
  assert.strictEqual(result.likes, 4200);
});

test('single video post is not treated as a carousel', () => {
  const result = normalizeGraphMedia({
    shortcode: 'X',
    is_video: true,
    video_url: 'https://cdn/v.mp4',
    display_url: 'https://cdn/v.jpg',
    dimensions: { width: 720, height: 1280 },
  });
  assert.strictEqual(result.type, 'video');
  assert.strictEqual(result.media.length, 1);
});

/* ----------------------------- mobile api ------------------------------- */

test('api: picks the highest resolution candidate', () => {
  const result = normalizeApiItem({
    code: 'AbC',
    media_type: 1,
    user: { username: 'nasa' },
    image_versions2: {
      candidates: [
        { url: 'https://cdn/small.jpg', width: 320, height: 320 },
        { url: 'https://cdn/large.jpg', width: 1080, height: 1080 },
      ],
    },
  });
  assert.strictEqual(result.media[0].url, 'https://cdn/large.jpg');
  assert.strictEqual(result.media[0].width, 1080);
});

test('api: carousel_media becomes separate items', () => {
  const result = normalizeApiItem({
    code: 'AbC',
    media_type: 8,
    user: { username: 'nasa' },
    carousel_media: [
      { media_type: 1, image_versions2: { candidates: [{ url: 'https://cdn/1.jpg', width: 1080 }] } },
      {
        media_type: 2,
        video_versions: [{ url: 'https://cdn/2.mp4', width: 720, height: 1280 }],
        image_versions2: { candidates: [{ url: 'https://cdn/2.jpg', width: 720 }] },
      },
    ],
  });
  assert.strictEqual(result.type, 'carousel');
  assert.deepStrictEqual(result.media.map((m) => m.type), ['image', 'video']);
});

console.log(`\n${passed} checks passed\n`);
